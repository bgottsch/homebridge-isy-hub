
import { Service, CharacteristicValue } from 'homebridge';

import { ISYHubPlatform, ISYHubPlatformAccessory } from '../platform';
import { PKG_VERSION } from '../settings';
import { Node } from '../types';
import { checkNodeReachability } from '../helpers';


export class MicroDimmerAccessory {
	
	private service_info: Service;
	private service_bulb: Service;

	private setStateCalled = false;
	private initialState;
	private state = {
		On: false,
		Brightness: 100,
	};

	private onLevel = 255;
	

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
		this.service_info.setCharacteristic(this.platform.Characteristic.Model, 'Micro Dimmer');
		this.service_info.setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.address);
		this.service_info.setCharacteristic(this.platform.Characteristic.FirmwareRevision, PKG_VERSION);


		// Lightbulb Service
		this.service_bulb = this.accessory.addService(this.platform.Service.Lightbulb, this.accessory.context.name);
		this.service_bulb.getCharacteristic(this.platform.Characteristic.On)
			.onSet(this.setOn.bind(this))
			.onGet(this.getOn.bind(this));
		this.service_bulb.getCharacteristic(this.platform.Characteristic.Brightness)
			.onSet(this.setBrightness.bind(this))
			.onGet(this.getBrightness.bind(this));

		this.service_bulb.setPrimaryService(true);

		this.accessory.removeAllListeners();
		this.accessory.on('updateState', this.updateState.bind(this));

		this.onLevel = this.accessory.context.on_level || this.onLevel;
	}

	async setOn(value: CharacteristicValue) {
		this.state.On = value as boolean;
		this.setState();
	}

	async getOn(): Promise<CharacteristicValue> {
		checkNodeReachability(this.platform, this.accessory.context as Node);
		this.updateState();
		return this.state.On;
	}

	async setBrightness(value: CharacteristicValue) {
		this.state.Brightness = value as number;
		this.setState();
	}

	async getBrightness(): Promise<CharacteristicValue> {
		checkNodeReachability(this.platform, this.accessory.context as Node);
		this.updateState();
		return this.state.Brightness;
	}

	async updateState() {
		if (this.accessory.context.status > 0 && this.accessory.context.status <= this.onLevel){
			this.state.On = true;
			this.state.Brightness = Math.round(100 / this.onLevel * this.accessory.context.status);
		}else if (this.accessory.context.status === 0) {
			this.state.On = false;
			this.state.Brightness = Math.round(100 / this.onLevel * this.accessory.context.status);
		}
		this.service_bulb.updateCharacteristic(this.platform.Characteristic.On, this.state.On);
		this.service_bulb.updateCharacteristic(this.platform.Characteristic.Brightness, this.state.Brightness);
	}

	async setState() {
		const sendRequest = async () => {
			let value = 0;
			if (this.state.On) {
				value = Math.round(this.onLevel / 100 * this.state.Brightness);
			}
			await this.platform.isyApi.setValue(this.accessory.context.address, value);
			this.service_bulb.updateCharacteristic(this.platform.Characteristic.On, this.state.On);
			this.service_bulb.updateCharacteristic(this.platform.Characteristic.Brightness, this.state.Brightness);
			this.setStateCalled = false;
		};

		const th_steps = 0.05;
		const th_delay = 1000;
		
		let timeout: NodeJS.Timeout;

		if (!this.setStateCalled) {
			this.setStateCalled = true;
			this.initialState = this.state;
			timeout = setTimeout(sendRequest, th_delay);
		}else{
			if (Math.abs((this.state.Brightness / this.initialState.Brightness) - 1) >= th_steps) {
				clearTimeout(timeout!);
				sendRequest();
			}
		}
	}
}