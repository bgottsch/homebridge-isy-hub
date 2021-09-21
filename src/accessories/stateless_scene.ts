
import { CharacteristicValue, Nullable, Service } from 'homebridge';

import { ISYHubPlatform, ISYHubPlatformAccessory } from '../platform';
import { PKG_VERSION } from '../settings';
import { Scene } from '../types';
import { getSceneState, checkSceneReachability } from '../helpers';


export class StatelessSceneAccessory {

	private service_info: Service;
	private service_stsw: Service;

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
		this.service_info.setCharacteristic(this.platform.Characteristic.Model, 'Stateless Scene');
		this.service_info.setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.address);
		this.service_info.setCharacteristic(this.platform.Characteristic.FirmwareRevision, PKG_VERSION);

		// Stateless Switch Service
		this.service_stsw = this.accessory.addService(this.platform.Service.StatelessProgrammableSwitch, this.accessory.context.name);
		this.service_stsw.getCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent)
			.onGet(this.getOn.bind(this))
			.setProps({minValue: 0, maxValue: 1});

		this.service_stsw.setPrimaryService(true);

		this.accessory.removeAllListeners();
		this.accessory.on('updateState', this.updateState.bind(this));
	}

	async getOn(): Promise<Nullable<CharacteristicValue>> {
		checkSceneReachability(this.platform, this.accessory.context as Scene);
		return null;
	}

	async updateState() {
		const state = getSceneState(this.accessory.context as Scene, 'kbtn_only');
		if (state === undefined) {
			return;
		}
		this.service_stsw.updateCharacteristic(this.platform.Characteristic.ProgrammableSwitchEvent, state ? 0 : 1);
	}
}