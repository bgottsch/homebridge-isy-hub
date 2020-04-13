'use strict';

const request   = require('request-promise'),
	  xml2js    = require('xml2js'),
      WebSocket = require('ws');

var Accessory, Service, Characteristic, UUIDGen;

function setHomebridge(homebridge) {
	Accessory = homebridge.platformAccessory;
	Service = homebridge.hap.Service;
	UUIDGen = homebridge.hap.uuid;
	Characteristic = homebridge.hap.Characteristic;
}

var setStateCalled = false;

class KeypadSceneAccessory {

	constructor(platform, accessory) {

		this.accessory = accessory;

		var that = this;

		this.log = platform.log;
		this.api = platform.api;
		this.config = platform.config;

		if (this.accessory.displayName == null || this.accessory.UUID == null || this.accessory.context.id == null) {
			this.log("returning, null found!");
			return;
		}

		this.state = true;
		this.block_updates = false;

		var scene_accessory;

		if (this.accessory.getService(Service.Lightbulb)) {
			scene_accessory = this.accessory;
		}else{
			scene_accessory = new Accessory(this.accessory.displayName, this.accessory.UUID);
		}

		scene_accessory.reachable = true;

		scene_accessory.context.id = this.accessory.context.id;
		scene_accessory.context.class = this.accessory.context.class;
		scene_accessory.context.type = this.accessory.context.type;
		scene_accessory.context.trigger_node = this.accessory.context.trigger_node;

		scene_accessory.on('identify', function(paired, callback) {
			console.log("Identify! (%s, %s)", scene_accessory.displayName, scene_accessory.context.id);
			callback();
		});


		var accessoryInfoService = scene_accessory.getService(Service.AccessoryInformation) || scene_accessory.addService(Service.AccessoryInformation, this.accessory.displayName);

		accessoryInfoService.setCharacteristic(Characteristic.Manufacturer, "ISY-994i");
		accessoryInfoService.setCharacteristic(Characteristic.Model, "Keypad Scene");
		accessoryInfoService.setCharacteristic(Characteristic.SerialNumber, "ID: " + this.accessory.context.id);


		var statelessSwitchService = scene_accessory.getService(Service.StatelessProgrammableSwitch) || scene_accessory.addService(Service.StatelessProgrammableSwitch, this.accessory.displayName);

		this.switchEvents = statelessSwitchService.getCharacteristic(Characteristic.ProgrammableSwitchEvent);


		var switchService = scene_accessory.getService(Service.Switch) || scene_accessory.addService(Service.Switch, this.accessory.displayName);

		switchService.getCharacteristic(Characteristic.On)
		.on("get", function (callback) {
            callback(null, that.state);
		})
		.on("set", function (value, callback) {
			that.state = value;
			callback(null, value);
			that.setState();
		});


		this.accessory = scene_accessory;
	}

	setState() {
		var that = this;

		function send_request() {
			var cmd;

			if (that.state == true) {
				cmd = 'DON';
			}else{
				cmd = 'DOF';
			}

			var url = 'http://' + that.config.host + '/rest/nodes/' + that.accessory.context.id + '/cmd/' + cmd;
			request.get(url).auth(that.config.username, that.config.password, false)
			.catch(function (err) {
				console.log(err);
			});

			setStateCalled = false;
			that.block_updates = false;
		}

		if (!setStateCalled && !that.block_updates) {
			setStateCalled = true;
			that.block_updates = true;
			setTimeout(send_request, 2000);
		}
	}
}

module.exports = {
	KeypadSceneAccessory: KeypadSceneAccessory,
	setHomebridge: setHomebridge
};
