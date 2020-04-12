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

class MicroOpenCloseAccessory {

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
		this.currentPosition = 100;
		this.targetPosition = 100;
		this.positionState = 2; //stopped

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
		accessoryInfoService.setCharacteristic(Characteristic.Model, "Micro Open/Close");
		accessoryInfoService.setCharacteristic(Characteristic.SerialNumber, "ID: " + this.accessory.context.id);


		var windowCoverService = device_accessory.getService(Service.WindowCovering) || device_accessory.addService(Service.WindowCovering, this.accessory.displayName);

		windowCoverService.getCharacteristic(Characteristic.PositionState)
		.on("get", function (callback) {
			that.updateState();
			callback(null, that.positionState);
		});

		windowCoverService.getCharacteristic(Characteristic.CurrentPosition)
		.on("get", function (callback) {
			that.updateState();
            callback(null, that.currentPosition);
		});

		windowCoverService.getCharacteristic(Characteristic.TargetPosition)
		.on("get", function (callback) {
			that.updateState();
            callback(null, that.targetPosition);
		})
		.on("set", function (value, callback) {
			that.targetPosition = value;
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
				var currentValue = parseInt(result.properties.property[0].$.value);

				currentValue = (currentValue / 255) * 100

				that.currentPosition = currentValue;

				if (that.currentPosition == that.targetPosition){
					that.positionState = 2;
				}else if (that.currentPosition > that.targetPosition){
					that.positionState = 0;
				}else if (that.currentPosition < that.targetPosition){
					that.positionState = 1;
				}

				console.log("currentPosition: ", that.currentPosition);
				console.log("targetPosition: ", that.targetPosition);
				console.log("positionState: ", that.positionState);
			});
		})
		.catch(function (err) {
			console.log(err);
		});
	}

	setState() {
		var that = this;

		function send_request() {
			var cmd;
			var brightness;

			if (that.currentPosition != that.targetPosition) {
				brightness = (that.targetPosition / 100) * 255

				if (that.currentPosition > that.targetPosition){
					that.positionState = 0;
					cmd = 'DOF';
				}else if (that.currentPosition < that.targetPosition){
					that.positionState = 1;
					cmd = 'DON';
				}

			}else{
				that.positionState = 2;
				return;
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
			setTimeout(send_request, 2000);
		}
	}
}

module.exports = {
	MicroOpenCloseAccessory: MicroOpenCloseAccessory,
	setHomebridge: setHomebridge
};
