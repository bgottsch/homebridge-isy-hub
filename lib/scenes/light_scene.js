'use strict';

const request = require('request-promise'),
	  xml2js  = require('xml2js');

var Accessory, Service, Characteristic, UUIDGen;

function setHomebridge(homebridge) {
	Accessory = homebridge.platformAccessory;
	Service = homebridge.hap.Service;
	UUIDGen = homebridge.hap.uuid;
	Characteristic = homebridge.hap.Characteristic;
}

class LightSceneAccessory {

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

		this.setStateCalled = false;

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
		scene_accessory.context.status_nodes = this.accessory.context.status_nodes;
		scene_accessory.context.on_level = this.accessory.context.on_level;

		scene_accessory.on('identify', function(paired, callback) {
			console.log("Identify! (%s, %s)", scene_accessory.displayName, scene_accessory.context.id);
			callback();
		});


		var accessoryInfoService = scene_accessory.getService(Service.AccessoryInformation) || scene_accessory.addService(Service.AccessoryInformation, this.accessory.displayName);

		accessoryInfoService.setCharacteristic(Characteristic.Manufacturer, "ISY-994i");
		accessoryInfoService.setCharacteristic(Characteristic.Model, "Light Scene");
		accessoryInfoService.setCharacteristic(Characteristic.SerialNumber, "ID: " + this.accessory.context.id);


		var lightbulbService = scene_accessory.getService(Service.Lightbulb) || scene_accessory.addService(Service.Lightbulb, this.accessory.displayName);

		lightbulbService.getCharacteristic(Characteristic.On)
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

	updateState() {

		var sum = 0;
		this.accessory.context.status_nodes.forEach(function(node) {
			if (node["value"] != null) {
				sum += node["value"];
			}
		});
		
		var currentValue = sum / this.accessory.context.status_nodes.length;
		currentValue = (currentValue / 255) * 100

		if (currentValue == this.accessory.context.on_level){
			this.state = true;
		}else{
			this.state = false;
		}
	}

	setState() {
		var that = this;

		function send_request() {
			var cmd = "";
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

			that.setStateCalled = false;
		}

		if (!this.setStateCalled) {
			this.setStateCalled = true;
			send_request();
		}
	}
}

module.exports = {
	LightSceneAccessory: LightSceneAccessory,
	setHomebridge: setHomebridge
};
