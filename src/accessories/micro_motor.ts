
import { Service, CharacteristicValue } from 'homebridge';

import { ISYHubPlatform, ISYHubPlatformAccessory } from '../platform';
import { PKG_VERSION } from '../settings';
import { Node } from '../types';
import { checkNodeReachability } from '../helpers';


export class MicroMotorAccessory {
	
	private service_info: Service;
	private service_window: Service;

	private setStateCalled = false;
	private initialState;
	private state = {
		CurrentPosition: 100,
		PositionState: this.platform.Characteristic.PositionState.STOPPED,
		TargetPosition: 100,
	};

	private positionTimeout!: NodeJS.Timeout;
	private updatingPosition = false;
	private startTimestamp!: number;
	
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
		this.service_info.setCharacteristic(this.platform.Characteristic.Model, 'Micro Motor');
		this.service_info.setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.address);
		this.service_info.setCharacteristic(this.platform.Characteristic.FirmwareRevision, PKG_VERSION);


		// Window Covering Service
		this.service_window = this.accessory.addService(this.platform.Service.WindowCovering, this.accessory.context.name);
		this.service_window.getCharacteristic(this.platform.Characteristic.CurrentPosition)
			.onGet(this.getCurrentPosition.bind(this));
		this.service_window.getCharacteristic(this.platform.Characteristic.PositionState)
			.onGet(this.getPositionState.bind(this));
		this.service_window.getCharacteristic(this.platform.Characteristic.TargetPosition)
			.onSet(this.setTargetPosition.bind(this))
			.onGet(this.getTargetPosition.bind(this));

		this.service_window.setPrimaryService(true);

		this.accessory.removeAllListeners();
		this.accessory.on('updateState', this.updateState.bind(this));

		this.onLevel = this.accessory.context.on_level || this.onLevel;
	}

	async getCurrentPosition(): Promise<CharacteristicValue> {
		checkNodeReachability(this.platform, this.accessory.context as Node);
		this.updateState();
		return this.state.CurrentPosition;
	}

	async getPositionState(): Promise<CharacteristicValue> {
		checkNodeReachability(this.platform, this.accessory.context as Node);
		this.updateState();
		return this.state.PositionState;
	}

	async setTargetPosition(value: CharacteristicValue) {
		this.state.TargetPosition = value as number;
		this.setState();
	}

	async getTargetPosition(): Promise<CharacteristicValue> {
		checkNodeReachability(this.platform, this.accessory.context as Node);
		this.updateState();
		return this.state.TargetPosition;
	}

	async updateState() {
		this.state.TargetPosition = Math.round(100 / this.onLevel * this.accessory.context.status);
		this.updatePosition();
	}

	async setState() {
		const sendRequest = async () => {
			const value = Math.round(this.onLevel / 100 * this.state.TargetPosition);
			await this.platform.isyApi.setValue(this.accessory.context.address, value);
			this.updatePosition();
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
			if (Math.abs((this.state.TargetPosition / this.initialState.TargetPosition) - 1) >= th_steps) {
				clearTimeout(timeout!);
				sendRequest();
			}
		}
	}

	async updatePosition() {

		const startTimeout = (duration: number) => {
			this.positionTimeout = setTimeout(() => {
				this.updatingPosition = false;

				this.state.PositionState = this.platform.Characteristic.PositionState.STOPPED;
				this.state.CurrentPosition = this.state.TargetPosition;
				this.updateCharacteristics();
			}, duration);
		};

		if (this.updatingPosition) {
			clearTimeout(this.positionTimeout);
			const time_passed = Date.now() - this.startTimestamp;
			startTimeout((this.accessory.context.duration * 100) - time_passed + 1000);
		} else {
			this.updatingPosition = true;
			this.startTimestamp = Date.now();
			startTimeout(this.accessory.context.duration * 100);
		}

		if (this.state.TargetPosition > this.state.CurrentPosition) {
			this.state.PositionState = this.platform.Characteristic.PositionState.INCREASING;
		} else if (this.state.TargetPosition < this.state.CurrentPosition) {
			this.state.PositionState = this.platform.Characteristic.PositionState.DECREASING;
		} else {
			this.state.PositionState = this.platform.Characteristic.PositionState.STOPPED;
			clearTimeout(this.positionTimeout);
			this.updatingPosition = false;
		}
		this.updateCharacteristics();
	}

	async updateCharacteristics() {
		this.service_window.updateCharacteristic(this.platform.Characteristic.PositionState, this.state.PositionState);
		this.service_window.updateCharacteristic(this.platform.Characteristic.CurrentPosition, this.state.CurrentPosition);
		this.service_window.updateCharacteristic(this.platform.Characteristic.TargetPosition, this.state.TargetPosition);
	}
}