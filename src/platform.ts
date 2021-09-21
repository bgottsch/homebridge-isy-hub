
import { API, DynamicPlatformPlugin, PlatformConfig, Logger, PlatformAccessory, Service, Characteristic } from 'homebridge';

import { ISYHubApi } from './api';
import { ISYConfig, AccessoryType, Node, Scene } from './types';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { verifyConfig, isNode, isScene } from './helpers';

import { MicroDimmerAccessory } from './accessories/micro_dimmer';
import { MicroMotorAccessory } from './accessories/micro_motor';
import { StatelessSceneAccessory } from './accessories/stateless_scene';
import { ToggleSceneAccessory } from './accessories/toggle_scene';


export interface ISYHubPlatformAccessory extends PlatformAccessory {
    on(event: 'identify'|'updateState', listener: () => void): this;
    emit(event: 'identify'|'updateState'): boolean;
}


export class ISYHubPlatform implements DynamicPlatformPlugin {
	public readonly Service: typeof Service = this.api.hap.Service;
	public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

	public readonly accessories: (ISYHubPlatformAccessory)[] = [];
	public readonly unknownAccessories: ISYHubPlatformAccessory[] = [];

	public isyApi!: ISYHubApi;

	private disabled = false;

	constructor(
		public readonly log: Logger,
		public readonly config: ISYConfig | PlatformConfig,
		public readonly api: API,
	) {

		// enable/disable plugin
		if (this.config === null) {
			this.disabled = true;
			this.log.error('No config found! Plugin disabled.');
			return;
		}
		this.log.debug('Initializing platform...');

		// HOOBS notice
		if (__dirname.includes('hoobs')) {
			this.log.warn('This plugin has not been tested under HOOBS, it is highly recommended that ' +
			'you switch to Homebridge: https://git.io/Jtxb0');
		}

		// verify the config
		try {
			verifyConfig(this.config);
			this.log.debug('Config OK');
		} catch (e) {
			this.disabled = true;
			if (e instanceof Error) {
				this.log.error(e.message, 'Plugin disabled.');
			}
			return;
		}

		// ISY Hub API
		this.isyApi = new ISYHubApi(this);

		this.isyApi.on('add', (obj: (Node|Scene)[]) => this.addAccessories(obj));
		this.isyApi.on('remove', (obj: (Node|Scene)[]) => this.removeAccessories(obj));
		this.isyApi.on('update', (obj: (Node|Scene)[]) => this.updateAccessories(obj));
		this.isyApi.on('updateState', (obj: (Node|Scene)[]) => this.updateStateAccessories(obj));

		// homebridge restored from cache
		this.api.on('didFinishLaunching', async () => {
			this.log.debug('Called didFinishLaunching');
			if (this.unknownAccessories.length > 0) {
				this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, this.unknownAccessories);
				this.log.debug(
					'Removing unknown accessories from cache:', 
					this.unknownAccessories.map(e => [e.displayName, e.context]),
				);
			}
			await this.isyApi.start();
		});
	}

	configureAccessory(accessory: ISYHubPlatformAccessory) {
		if (this.disabled) {
			return;
		}

		let typeKnown = false;
		if (isNode(accessory.context)) {
			this.isyApi.objects.push(accessory.context as Node);
			typeKnown = true;
		}
		if (isScene(accessory.context)) {
			this.isyApi.objects.push(accessory.context as Scene);
			typeKnown = true;
		}

		if (typeKnown) {
			this.accessories.push(accessory);
			this.log.debug('Found accessory from cache:', accessory.displayName);
		} else {
			this.unknownAccessories.push(accessory);
			this.log.error('Unknown type for cached accessory:', accessory.displayName);
		}
	}

	addAccessories(objects: (Node|Scene)[]){
		objects.forEach(device => {
			const uuid = this.api.hap.uuid.generate(device.address);
			const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
			if (!existingAccessory) {
				const accessory = new this.api.platformAccessory(device.name, uuid) as ISYHubPlatformAccessory;
				accessory.context = device;
				this.setupAccessory(accessory);
				this.accessories.push(accessory);
				this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
				this.log.info('Added new accessory:', device.name);
			}
		});
	}

	removeAccessories(objects: (Node|Scene)[]){
		objects.forEach(device => {
			const uuid = this.api.hap.uuid.generate(device.address);
			const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
			if (existingAccessory) {
				this.accessories.splice(this.accessories.indexOf(existingAccessory), 1);
				this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
				this.log.info('Removed accessory:', existingAccessory.displayName);
			}
		});
	}

	updateAccessories(objects: (Node|Scene)[]) {
		objects.forEach(device => {
			const uuid = this.api.hap.uuid.generate(device.address);
			const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
			if (existingAccessory) {
				// name or type change --> recreate device
				if (existingAccessory.displayName !== device.name || 
					existingAccessory.context.type !== device.type) {
					// remove
					this.accessories.splice(this.accessories.indexOf(existingAccessory), 1);
					this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
					// add
					const accessory = new this.api.platformAccessory(device.name, uuid) as ISYHubPlatformAccessory;
					accessory.context = device;
					this.setupAccessory(accessory);
					this.accessories.push(accessory);
					setTimeout(() => {
						this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
					}, 3000);
					this.log.info('Change detected!', existingAccessory.displayName, '-->', accessory.displayName);
				}else{
					// update
					existingAccessory.context = device;
					this.setupAccessory(existingAccessory);
					existingAccessory.emit('updateState');
					this.log.debug('Updating accessory context:', existingAccessory.displayName);
				}
			}
		});
		this.api.updatePlatformAccessories(this.accessories); 
	}

	updateStateAccessories(objects: (Node|Scene)[]) {
		objects.forEach(device => {
			const uuid = this.api.hap.uuid.generate(device.address);
			const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
			if (existingAccessory) {
				existingAccessory.emit('updateState');
			}
		});
	}

	setupAccessory(accessory: ISYHubPlatformAccessory) {
		switch (accessory.context.type) {
			case AccessoryType.MicroDimmer:
				new MicroDimmerAccessory(this, accessory);
				break;
			case AccessoryType.MicroMotor:
				new MicroMotorAccessory(this, accessory);
				break;
			case AccessoryType.StatelessScene:
				new StatelessSceneAccessory(this, accessory);
				break;
			case AccessoryType.ToggleScene:
				new ToggleSceneAccessory(this, accessory);
				break;
		}
	}
}