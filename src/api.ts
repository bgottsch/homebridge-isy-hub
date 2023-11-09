
import EventEmitter from 'events';
import axios, { AxiosInstance } from 'axios';
import WebSocket, { CloseEvent, ErrorEvent, MessageEvent, OpenEvent } from 'ws';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

import { ISYHubPlatform } from './platform';
import { AccessoryType, Node, Scene, SceneMember } from './types';
import { isNumber, isNode, isScene } from './helpers';


export class ISYHubApi extends EventEmitter {
	
	public objects: (Node|Scene)[] = [];

	private ax!: AxiosInstance;
	private ws!: WebSocket;

	private wsHeartbeatTimeout!: NodeJS.Timeout;
	private wsRefreshInterval!: NodeJS.Timeout;
	private wsReconnectInterval!: NodeJS.Timeout;
	private wsBlockUpdates = true;

	private refreshInterval: number;
	private reconnectInterval: number;
	private heartbeatTimeout: number;
	
	constructor(
		private readonly platform: ISYHubPlatform,
	){
		super();
		this.ax = axios.create({
			baseURL: `http://${platform.config.hostname}`,
			timeout: platform.config.rest_timeout * 1000, // seconds to milliseconds
			auth: {
				username: platform.config.login,
				password: platform.config.password,
			},
		});
		this.refreshInterval = platform.config.refresh_interval * 60 * 1000; // minutes to milliseconds
		this.reconnectInterval = platform.config.reconnect_interval * 1000; // seconds to milliseconds
		this.heartbeatTimeout = platform.config.heartbeat_timeout * 1000; // seconds to milliseconds
	}

	public async start() {
		this.platform.log.info('Starting API...');
		this.startWebSocket();
	}

	public async setValue(address: string, value: number) {
		try {
			let url = '';
			if (value === 0) {
				url += `/rest/nodes/${address}/cmd/DOF`;
			}else if (value > 0 && value <= 255){
				url += `/rest/nodes/${address}/cmd/DON`;
				url += value ? `/${value}` : '';
			}else{
				throw 'setValue error! Property \'value\' should be between 0 and 255!';
			}
			await this.ax.get(url);
		} catch (error) {
			this.handleError(error);
		}
	}

	private async fetchObjects() {
		this.wsBlockUpdates = true;
		this.platform.log.debug('Fetching devices...');
		try {
			this.platform.log.info('fetching');
			const res_nodes = await this.ax.get('/rest/nodes');
			this.platform.log.info('fetched nodes');
			const res_status = await this.ax.get('/rest/status');
			this.platform.log.info('fetched status');
			
			const newObjects: (Node|Scene)[] = [];

			if (XMLValidator.validate(res_nodes.data) === true && XMLValidator.validate(res_status.data) === true) {

				const xml_nodes = this.parseXml(res_nodes.data);
				const xml_status = this.parseXml(res_status.data);

				// nodes
				xml_nodes['nodes']['node'].forEach(node => {
					if (!this.isHiddenNode(String(node['address']))) {
						switch (node['#attr']['nodeDefId']) {
							case 'DimmerLampSwitch_ADV':
								newObjects.push(this.getNode(node, xml_status, AccessoryType.MicroDimmer));
								break;
							case 'DimmerMotorSwitch_ADV':
								newObjects.push(this.getNode(node, xml_status, AccessoryType.MicroMotor));
								break;
						}
					}
				});

				// scenes
				xml_nodes['nodes']['group'].forEach(group => {
					if (!this.isHiddenNode(String(group['address'])) && isNumber(group['address']) 
					&& group['#attr']['nodeDefId'] === 'InsteonDimmer') {
						if (this.isStatelessScene(String(group['address']))) {
							newObjects.push(this.getScene(group, xml_nodes, xml_status, AccessoryType.StatelessScene));
						}else{
							newObjects.push(this.getScene(group, xml_nodes, xml_status, AccessoryType.ToggleScene));
						}
					}
				});
			}
			this.updateObjects(newObjects);
		} catch (error) {
			this.platform.log.error(error);
			this.handleError(error);
		}
		this.wsBlockUpdates = false;
	}

	private updateObjects(newObjects: (Node|Scene)[]) {

		const toAdd: (Node|Scene)[] = [];
		const toRemove: (Node|Scene)[] = [];
		const toUpdate: (Node|Scene)[] = [];

		const obj_new = newObjects.map(e => e.address);
		const obj_old = this.objects.map(e => e.address);

		// add (objects from new not found in old)
		const diff_a = obj_new.filter(x => !obj_old.includes(x));
		toAdd.push(...newObjects.filter(x => diff_a.includes(x.address)));
		
		// remove (objects from old not found in new)
		const diff_b = obj_old.filter(x => !obj_new.includes(x));
		toRemove.push(...this.objects.filter(x => diff_b.includes(x.address)));
		
		// update (objects from new found in old)
		const int_ab = obj_new.filter(x => obj_old.includes(x));
		toUpdate.push(...newObjects.filter(x => int_ab.includes(x.address)));

		// remove, update, add
		(toRemove.length !== 0) && this.emit('remove', toRemove);
		(toUpdate.length !== 0) && this.emit('update', toUpdate);
		(toAdd.length !== 0) && this.emit('add', toAdd);

		this.objects = newObjects;
	}

	private startWebSocket() {
		const auth = `Basic ${Buffer.from(`${this.platform.config.login!}:${this.platform.config.password!}`).toString('base64')}`;
		this.ws = new WebSocket(`ws://${this.platform.config.hostname!}/rest/subscribe/`, 'ISYSUB', {
			protocolVersion: 13,
			origin: 'com.universal-devices.websockets.isy',
			headers : {
				'Authorization': auth,
			},
			// rejectUnauthorized: false,
			// checkServerIdentity: () => false,
		});

		this.ws.onopen = this.wsOpen.bind(this);
		this.ws.onclose = this.wsClose.bind(this);
		this.ws.onerror = this.wsError.bind(this);
		this.ws.onmessage = this.wsMessage.bind(this);
	}

	private terminateWebSocket(reconnect = false) {
		if (this.wsHeartbeatTimeout) {
			clearTimeout(this.wsHeartbeatTimeout);
		}
		if (this.wsRefreshInterval) {
			clearInterval(this.wsRefreshInterval);
		}
		if (this.wsReconnectInterval) {
			clearInterval(this.wsReconnectInterval);
		}
		if (this.ws) {
			this.ws.removeAllListeners();
			this.ws.close();
		}
		if (reconnect) {
			this.wsReconnectInterval = setTimeout(() => {
				this.platform.log.debug('Attempting reconnect...');
				this.startWebSocket();
			}, this.reconnectInterval);
		}
	}

	private wsSetHeartbeatTimeout() {
		this.wsHeartbeatTimeout = setTimeout(() => {
			this.platform.log.debug('Heartbeat timeout');
			this.terminateWebSocket(true);
		}, this.heartbeatTimeout);
	}

	private wsSetRefreshInterval() {
		this.fetchObjects();
		this.wsRefreshInterval = setInterval(() => {
			this.fetchObjects();
		}, this.refreshInterval);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	private wsOpen(event: OpenEvent) {
		this.platform.log.debug(`Socket open! Full refresh scheduled every ${this.refreshInterval / 1000 / 60} minutes`);
		this.wsSetHeartbeatTimeout();
		this.wsSetRefreshInterval();
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	private wsClose(event: CloseEvent) {
		this.platform.log.debug('Close event');
		this.terminateWebSocket(true);
	}

	private wsError(event: ErrorEvent) {
		if (String(event.error).includes('401')) {
			this.platform.log.warn('Invalid credentials! Review login/password in config.json');
			this.terminateWebSocket(false);
		}else{
			switch (event.error.code) {
				case 'EHOSTUNREACH':
					this.platform.log.warn(`Host unreachable. Attempting reconnect in ${this.reconnectInterval / 1000} seconds`);
					this.terminateWebSocket(true);
					break;
				case 'ECONNREFUSED':
					this.platform.log.warn('Connection refused by host. Review config.json');
					this.terminateWebSocket(false);
					break;
				default:
					if (event.message.includes('500')) {
						this.platform.log.warn(`Error 500. Attempting reconnect in ${this.reconnectInterval / 1000} seconds`);
						this.terminateWebSocket(true);
						break;
					}
					if (event.message.includes('socket hang up')) {
						this.platform.log.warn(`Socket hang up. Attempting reconnect in ${this.reconnectInterval / 1000} seconds`);
						this.terminateWebSocket(true);
						break;
					}
					this.platform.log.warn('Unknown error, termintating socket');
					this.platform.log.warn(event.error.code, event.error.message, event.error.stack);
					this.terminateWebSocket(false);
					break;
			}
		}
	}

	private wsMessage(event: MessageEvent) {

		const xmlString: string = event.data.toString();
		if (XMLValidator.validate(xmlString) !== true) { 
			this.platform.log.warn('Invalid XML received on Web Socket!');
			this.platform.log.warn(xmlString);
			return;
		}

		const xml = this.parseXml(xmlString);
		if (xml['Event'] !== undefined) {

			const action: number = xml['Event']['action'];
			const control: string = xml['Event']['control'];

			// heartbeat
			if (action === 120 && control === '_0') {
				clearTimeout(this.wsHeartbeatTimeout);
				this.wsSetHeartbeatTimeout();
				this.platform.log.debug('Heartbeat received');
			
			// device status update
			} else if (control === 'ST') {

				const address: string = xml['Event']['node'];
				const status: number = xml['Event']['action']['#text'];

				this.objects.forEach((obj) => {
					let updateObj = false;
					if (isNode(obj)) {
						if (obj.address === address) {
							obj.status = status;
							updateObj = true;
						}
					}
					if (isScene(obj)) {
						obj.members?.forEach((member) => {
							if (member.address === address) {
								member.status = status;
								updateObj = true;
							}
						});
					}
					if (updateObj && !this.wsBlockUpdates) {
						this.emit('updateState', [obj]);
					}
				});
			}
		}
	}

	private handleError(error) {
		if (error.response) {
			this.platform.log.debug(`Request error: ${error.message}`);
		} else if (error.request) {
			this.platform.log.debug(`ISY unreachable: ${error.message}`);
		} else {
			this.platform.log.debug(`Unknown error occurred: ${error.message}`);
		}
	}

	private parseXml(data: string) {
		try {
			const parser = new XMLParser({
				attributesGroupName: '#attr',
				textNodeName: '#text',
				attributeNamePrefix: '',
				isArray: () => false,
				ignoreAttributes: false,
				parseAttributeValue: true,
			});
			return parser.parse(data, true);
		} catch (error: unknown) {
			if (error instanceof Error) {
				this.platform.log.error(error.message);
			}
		}
	}

	private getNode(node, xml_status, type: AccessoryType): Node {
		return {
			type: type,
			address: String(node['address']),
			name: String(node['name']),
			status: Number(node['property']['#attr']['value']),
			reachable: this.getNodeReachability(node, xml_status),
			duration: this.getNodePropertyValue(node, xml_status, 'DUR'),
			on_level: this.getNodePropertyValue(node, xml_status, 'OL'),
		};
	}

	private getScene(group, xml_nodes, xml_status, type: AccessoryType): Scene {
		const members: (SceneMember)[] = [];
		group['members']['link'].forEach(link => {
			xml_nodes['nodes']['node'].filter(k =>
				String(k['address']) === String(link['#text']),
			).map(device => {
				members.push({
					address: String(device['address']),
					name: String(device['name']),
					status: Number(device['property']['#attr']['value']),
					reachable: this.getNodeReachability(device, xml_status),
				});
			});
		});
		return {
			type: type,
			address: String(group['address']),
			name: String(group['name']),
			members: members,
			on_level: this.getOnLevelScene(String(group['address'])),
		};
	}

	private getNodePropertyValue(node, xml_status, property: string): number|undefined {
		try {
			const prop_value = xml_status['nodes']['node'].find(k =>
				String(k['#attr']['id']).slice(0, -2) + ' 1' === String(node['address']).slice(0, -2) + ' 1',
			)['property'].find(p =>
				String(p['#attr']['id']) === property,
			)['#attr']['value'];
			if (prop_value !== undefined) {
				return prop_value;
			}
			return undefined;
		} catch {
			return undefined;
		}
	}

	private getNodeReachability(node, xml_status): boolean {
		const err_prop_value = this.getNodePropertyValue(node, xml_status, 'ERR');
		switch (err_prop_value) {
			case 1:
				return false;
			case 0:
				return true;
			default:
				return true;
		}
	}

	private isHiddenNode(address: string): boolean {
		if (this.platform.config.hidden_nodes.some(e => e === address)) {
			return true;
		}
		return false;
	}

	private isStatelessScene(address: string): boolean {
		if (this.platform.config.stateless_scenes.some(e => e === address)) {
			return true;
		}
		return false;
	}

	private getOnLevelScene(address: string): number {
		const config = this.platform.config.on_level_scenes.find(e => e.address === address);
		if (config) {
			return config.on_level;
		}
		return 255;
	}
}