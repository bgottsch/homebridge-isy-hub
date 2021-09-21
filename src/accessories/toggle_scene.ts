
import { Service, CharacteristicValue } from 'homebridge';

import { ISYHubPlatform, ISYHubPlatformAccessory } from '../platform';
import { PKG_VERSION } from '../settings';
import { Scene } from '../types';
import { getSceneState, checkSceneReachability } from '../helpers';


export class ToggleSceneAccessory {
	
	private service_info: Service;
	private service_swch: Service;

	private state = {
		On: false,
	};

	constructor(
		private readonly platform: ISYHubPlatform,
		private readonly accessory: ISYHubPlatformAccessory,
	) {

		// Reset Services
		const len = this.accessory.services.length;
		for (let index = 0; index < len; index++) {
			this.accessory.removeService(this.accessory.services[0]);
		}

		// Accessory Information Service
		this.service_info = this.accessory.addService(this.platform.Service.AccessoryInformation);
		this.service_info.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.name);
		this.service_info.setCharacteristic(this.platform.Characteristic.Manufacturer, 'Insteon');
		this.service_info.setCharacteristic(this.platform.Characteristic.Model, 'Toggle Scene');
		this.service_info.setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.address);
		this.service_info.setCharacteristic(this.platform.Characteristic.FirmwareRevision, PKG_VERSION);


		// Switch Service
		this.service_swch = this.accessory.addService(this.platform.Service.Switch, this.accessory.context.name);
		this.service_swch.getCharacteristic(this.platform.Characteristic.On)
			.onSet(this.setOn.bind(this))
			.onGet(this.getOn.bind(this));

		this.service_swch.setPrimaryService(true);

		this.accessory.removeAllListeners();
		this.accessory.on('updateState', this.updateState.bind(this));
	}

	async setOn(value: CharacteristicValue) {
		this.state.On = value as boolean;
		this.setState();
	}

	async getOn(): Promise<CharacteristicValue> {
		checkSceneReachability(this.platform, this.accessory.context as Scene);
		this.updateState();
		return this.state.On;
	}

	async updateState() {
		const state = getSceneState(this.accessory.context as Scene, 'device_only');
		if (state === undefined) {
			return;
		}
		this.state.On = state;
		this.service_swch.updateCharacteristic(this.platform.Characteristic.On, this.state.On);
	}

	async setState() {
		await this.platform.isyApi.setValue(this.accessory.context.address, this.state.On ? 255 : 0);
		this.service_swch.updateCharacteristic(this.platform.Characteristic.On, this.state.On);
	}
}