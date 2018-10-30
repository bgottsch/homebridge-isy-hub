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

class WindowSceneAccessory {

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
		this.currentPosition = 0;
		this.targetPosition = 0;
		this.positionState = 2; //stopped

		var scene_accessory;

		if (this.accessory.getService(Service.WindowCovering)) {
			scene_accessory = this.accessory;
		}else{
			scene_accessory = new Accessory(this.accessory.displayName, this.accessory.UUID);
		}

		scene_accessory.reachable = true;

		scene_accessory.context.id = this.accessory.context.id;
		scene_accessory.context.type = this.accessory.context.type;

		scene_accessory.context.status = [];

		scene_accessory.on('identify', function(paired, callback) {
			console.log("Identify! (%s, %s)", scene_accessory.displayName, scene_accessory.context.id);
			callback();
		});


		var accessoryInfoService = scene_accessory.getService(Service.AccessoryInformation) || scene_accessory.addService(Service.AccessoryInformation, this.accessory.displayName);

		accessoryInfoService.setCharacteristic(Characteristic.Manufacturer, "ISY-994i");
		accessoryInfoService.setCharacteristic(Characteristic.Model, "Window Scene");
		accessoryInfoService.setCharacteristic(Characteristic.SerialNumber, "ID: " + this.accessory.context.id);


		var windowCoverService = scene_accessory.getService(Service.WindowCovering) || scene_accessory.addService(Service.WindowCovering, this.accessory.displayName);

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
			that.setState(value);
		});

		windowCoverService.getCharacteristic(Characteristic.PositionState)
		.on("get", function (callback) {
			that.updateState();
            callback(null, that.positionState);
		});

		this.accessory = scene_accessory;
		this.getNodes();
	}

	getNodes() {
		var that = this;

		this.nodes = [];

		var url = 'http://' + this.config.host + '/rest/nodes/scenes'
		request.get(url).auth(this.config.username, this.config.password, false)
		.then(function (parsedBody) {
			var parser = new xml2js.Parser();
			parser.parseString(parsedBody, function (err, result) {
				result.nodes.group.forEach(function(group) {
					if (group.address == that.accessory.context.id) {
						group.members[0].link.forEach(function(node) {
							if (node._.slice(-1) == '1') {
								that.nodes.push(node._);
							}
						});
					}
				});
		    });
	    })
	    .catch(function (err) {
	        console.log('error:', err);
	    });
	}

	updateState() {
		var that = this;
		var values_dim = [];

		this.accessory.context.status.forEach(function(_node) {
			that.nodes.forEach(function(node) {
				if (node == _node.id) {
					if (!isNaN(_node.value)) {
						values_dim.push(_node.value);
					}
				}
			});
		});

		var sum = 0;
		for(var i = 0; i < values_dim.length; i++){
			sum += values_dim[i];
		}

		var avg = sum/values_dim.length;

		if (avg > 0) {
			this.currentPosition = 100;
			this.targetPosition = 100;
		}else{
			this.currentPosition = 0;
			this.targetPosition = 0;
		}
		this.positionState = 2;
	}

	setState(value) {

		var that = this;

		function send_request() {
			var cmd = "";
			if (that.targetPosition > 0) {
				cmd = 'DON';
			}else{
				cmd = 'DOF';
			}

			var url = 'http://' + that.config.host + '/rest/nodes/' + that.accessory.context.id + '/cmd/' + cmd;
			request.get(url).auth(that.config.username, that.config.password, false)
			.then(function (parsedBody) {
				var updateValue = 0;
				if (that.targetPosition > 0){
					updateValue = 255;
				}else{
					updateValue = 0;
				}
				that.accessory.context.status.forEach(function(_node) {
					that.nodes.forEach(function(node) {
						if (node == _node.id) {
							_node.value = updateValue;
						}
					});
				});
				that.updateState();
			})
			.catch(function (err) {
				console.log(err);
			});

			setStateCalled = false;
		}

		if (!setStateCalled) {
			setStateCalled = true;
			send_request();
		}
	}
}

module.exports = {
	WindowSceneAccessory: WindowSceneAccessory,
	setHomebridge: setHomebridge
};
