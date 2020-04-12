'use strict';

var request = require('request-promise'),
	xml2js  = require('xml2js');

var Accessory, Service, Characteristic, UUIDGen;

function setHomebridge(homebridge) {
	Accessory = homebridge.platformAccessory;
	Service = homebridge.hap.Service;
	UUIDGen = homebridge.hap.uuid;
	Characteristic = homebridge.hap.Characteristic;
}

var setStateCalled = false;

class MicroDimmerAccessory {

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

		this.nodes = [];
		this.state = true;
		this.brightness = 0;

		var device_accessory;

		if (this.accessory.getService(Service.Lightbulb)) {
			device_accessory = this.accessory;
		}else{
			device_accessory = new Accessory(this.accessory.displayName, this.accessory.UUID);
		}

		device_accessory.reachable = true;

		device_accessory.context.id = this.accessory.context.id;
		device_accessory.context.class = this.accessory.context.class;
		device_accessory.context.type = this.accessory.context.type;

		device_accessory.on('identify', function(paired, callback) {
			console.log("Identify! (%s, %s)", device_accessory.displayName, device_accessory.context.id);
			callback();
		});


		var accessoryInfoService = device_accessory.getService(Service.AccessoryInformation) || device_accessory.addService(Service.AccessoryInformation, this.accessory.displayName);

		accessoryInfoService.setCharacteristic(Characteristic.Manufacturer, "Inteon");
		accessoryInfoService.setCharacteristic(Characteristic.Model, "Micro Dimmer");
		accessoryInfoService.setCharacteristic(Characteristic.SerialNumber, "ID: " + this.accessory.context.id);


		var lightbulbService = device_accessory.getService(Service.Lightbulb) || device_accessory.addService(Service.Lightbulb, this.accessory.displayName);

		lightbulbService.getCharacteristic(Characteristic.On)
		.on("get", function (callback) {
			that.updateState();
            callback(null, that.state);
		})
		.on("set", function (value, callback) {
			that.state = value;
			callback(null, value);
			that.setState();
		});


		lightbulbService.getCharacteristic(Characteristic.Brightness)
		.on("get", function (callback) {
			that.updateState();
            callback(null, that.brightness);
		})
		.on("set", function (value, callback) {
			that.brightness = value;
			callback(null, value);
			that.setState();
		});


		this.accessory = device_accessory;
	}

	updateState() {
		var that = this;
		var url = 'http://' + this.config.host + '/rest/status/' + this.accessory.context.id;

		request.get(url).auth(this.config.username, this.config.password, false)
		.then(function (parsedBody) {
			var parser = new xml2js.Parser();

			parser.parseString(parsedBody, function (err, result) {
				that.state = true;
				parseInt(result.properties[0].$.value) 
			});
		})
		.catch(function (err) {
			console.log(err);
		});
	}

	setState() {
		var that = this;

		function send_request() {
			var cmd = "";
			if (that.state == true) {
				cmd = 'DON';
				brightness = (that.brightness / 255) * 100
			}else{
				cmd = 'DOF';
				brightness = 0;
			}

			var url = 'http://' + that.config.host + '/rest/nodes/' + that.accessory.context.id + '/cmd/' + cmd + '/' + brightness;
			request.get(url).auth(that.config.username, that.config.password, false)
			.then(function (parsedBody) {
				that.updateState();
			})
			.catch(function (err) {
				console.log(err);
			});

			setStateCalled = false;
		}

		if (!setStateCalled) {
			setStateCalled = true;
			if (this.brightness == 100 || this.brightness == 0){
				send_request()
			}else{
				setTimeout(send_request(), 3000);
			}
		}
	}
}

module.exports = {
	MicroDimmerAccessory: MicroDimmerAccessory,
	setHomebridge: setHomebridge
};
