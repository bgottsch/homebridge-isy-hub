
import { PlatformConfig } from 'homebridge';

import { ISYHubPlatform } from './platform';
import { ISYConfig, Node, Scene } from './types';
import { DEFAULT_REFRESH_INTERVAL, DEFAULT_RECONNECT_INTERVAL, DEFAULT_HEARTBEAT_TIMEOUT, DEFAULT_REST_TIMEOUT } from './settings';


export function verifyConfig(config: ISYConfig|PlatformConfig) {

	// hostname
	if (!config.hostname) {
		throw new Error('Missing "hostname" in config.json!');
	} else {
		if (!isString(config.hostname) || !isHostname(config.hostname)) {
			throw new Error(`Invalid "hostname" in config.json! (${config.hostname})`);
		}
	}

	// login
	if (!config.login) {
		throw new Error('Missing "login" in config.json!');
	} else {
		if (!isString(config.login)) {
			throw new Error(`Invalid "login" in config.json! (${config.login})`);
		}
	}

	// password
	if (!config.password) {
		throw new Error('Missing "password" in config.json!');
	} else {
		if (!isString(config.password)) {
			throw new Error(`Invalid "password" in config.json! (${config.password})`);
		}
	}
	
	// hidden_nodes
	if (!config.hidden_nodes) {
		config.hidden_nodes = [];
	}
	config.hidden_nodes.forEach(e => {
		if (!isString(e)) {
			throw new Error(`Invalid "hidden_nodes.address" in config.json! (${e})`);
		}
	});

	// stateless_scenes
	if (!config.stateless_scenes) {
		config.stateless_scenes = [];
	}
	config.stateless_scenes.forEach(e => {
		if (!isString(e)) {
			throw new Error(`Invalid "stateless_scenes.address" in config.json! (${e})`);
		}
	});

	// on_level_scenes
	if (!config.on_level_scenes) {
		config.on_level_scenes = [];
	}
	config.on_level_scenes.forEach(e => {
		if (!e.address || !e.on_level) {
			throw new Error(`Invalid "on_level_scenes" in config.json! (${e})`);
		}
		if (!isString(e.address)) {
			throw new Error(`Invalid "on_level_scenes.address" in config.json! (${e.address})`);
		}
		if (!isNumber(e.on_level)) {
			throw new Error(`Invalid "on_level_scenes.address" in config.json! (${e.address})`);
		}
	});

	// refresh_interval
	if (!config.refresh_interval) {
		config.refresh_interval = DEFAULT_REFRESH_INTERVAL;
	}
	if (!isNumber(config.refresh_interval)) {
		throw new Error(`Invalid "refresh_interval" in config.json! (${config.refresh_interval})`);
	}

	// reconnect_interval
	if (!config.reconnect_interval) {
		config.reconnect_interval = DEFAULT_RECONNECT_INTERVAL;
	}
	if (!isNumber(config.reconnect_interval)) {
		throw new Error(`Invalid "reconnect_interval" in config.json! (${config.reconnect_interval})`);
	}

	// heartbeat_timeout
	if (!config.heartbeat_timeout) {
		config.heartbeat_timeout = DEFAULT_HEARTBEAT_TIMEOUT;
	}
	if (!isNumber(config.heartbeat_timeout)) {
		throw new Error(`Invalid "heartbeat_timeout" in config.json! (${config.heartbeat_timeout})`);
	}

	// rest_timeout
	if (!config.rest_timeout) {
		config.rest_timeout = DEFAULT_REST_TIMEOUT;
	}
	if (!isNumber(config.rest_timeout)) {
		throw new Error(`Invalid "rest_timeout" in config.json! (${config.rest_timeout})`);
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isNode(obj: any): obj is Node {
	return obj.status !== undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isScene(obj: any): obj is Scene {
	return obj.members !== undefined;
}

export function getSceneState(context: Scene, mode: 'device_only'|'kbtn_only'): boolean|undefined {

	// return if no member is reachable
	const reachableAccessories = context.members!.filter(e => e.reachable === true);
	if (reachableAccessories === undefined) {
		return undefined;
	}

	let status = 0;
	let count = 0;

	reachableAccessories.forEach((member) => {
		if (member.reachable) {
			if((member.address.slice(-1) === '1' && mode === 'device_only') 
			|| (member.address.slice(-1) !== '1' && mode === 'kbtn_only')) {
				status += member.status;
				count++;
			}
		}
	});

	if (count > 0) {
		status /= count;
		if (status === (mode === 'device_only' ? context.on_level : 255)) {
			return true;
		} else if (status === 0) {
			return false;
		}
	}
	return mode === 'device_only' ? false : undefined;
}

export function checkNodeReachability(platform: ISYHubPlatform, context: Node) {
	if (context.reachable === false) {
		throw new platform.api.hap.HapStatusError(platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
	}
}

export function checkSceneReachability(platform: ISYHubPlatform, context: Scene) {
	if (context.members!.filter(e => e.reachable === true) === undefined) {
		throw new platform.api.hap.HapStatusError(platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isString(value: any): boolean {
	return Object.prototype.toString.call(value) === '[object String]';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isNumber(value: any): boolean {
	return ( (value !== null) && (value !== '') && !isNaN(Number(value.toString())) );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isHostname(value: any): boolean {
	// eslint-disable-next-line max-len
	const regexp = new RegExp('^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]).){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]).)*([A-Za-z]|[A-Za-z][A-Za-z0-9-]*[A-Za-z0-9])$|^(?:(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){6})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])).){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:::(?:(?:(?:[0-9a-fA-F]{1,4})):){5})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])).){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})))?::(?:(?:(?:[0-9a-fA-F]{1,4})):){4})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])).){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,1}(?:(?:[0-9a-fA-F]{1,4})))?::(?:(?:(?:[0-9a-fA-F]{1,4})):){3})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])).){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,2}(?:(?:[0-9a-fA-F]{1,4})))?::(?:(?:(?:[0-9a-fA-F]{1,4})):){2})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])).){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,3}(?:(?:[0-9a-fA-F]{1,4})))?::(?:(?:[0-9a-fA-F]{1,4})):)(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])).){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,4}(?:(?:[0-9a-fA-F]{1,4})))?::)(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])).){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,5}(?:(?:[0-9a-fA-F]{1,4})))?::)(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,6}(?:(?:[0-9a-fA-F]{1,4})))?::))))$');
	return regexp.test(value);
}