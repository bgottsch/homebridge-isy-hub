
import { PlatformConfig } from 'homebridge';

// config.json types
export interface ISYConfig extends PlatformConfig {
	hostname: string;
	login: string;
	password: string;
	stateless_scenes: (string)[];
	hidden_nodes: (string)[];
	on_level_scenes: (OnLevelScene)[];
	refresh_interval: number;
	reconnect_interval: number;
	heartbeat_timeout: number;
	rest_timeout: number;
}

export interface OnLevelScene {
	address: string;
	on_level: number;
}

// Accessory Types
export enum AccessoryType {
	MicroDimmer,
	MicroMotor,
	StatelessScene,
	ToggleScene,
}

// API Objects
export interface Object {
	address: string;
	name: string;
}

export interface Node extends Object {
	type: AccessoryType;
	status: number;
	reachable: boolean;
	duration?: number;
	on_level?: number;
}

export interface Scene extends Object {
	type: AccessoryType;
	members?: (SceneMember)[] | null;
	on_level: number;
}

export interface SceneMember extends Object {
	status: number;
	reachable: boolean;
}
