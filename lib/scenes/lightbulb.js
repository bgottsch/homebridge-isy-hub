'use strict';

const request = require('request-promise');
const xml2js  = require('xml2js');

var Service, Characteristic;


module.exports = SceneLightbulb;


function SceneLightbulb(hub, accessory) {

	var that = this;

	this.log = hub.log;
	this.api = hub.api;
	this.config = hub.config;

	Service = this.api.hap.Service;
	Characteristic = this.api.hap.Characteristic;

	this.accessory = accessory;

	if (this.accessory.displayName == null || this.accessory.UUID == null || this.accessory.context.class == null || this.accessory.context.node_config == null) {
		this.log.warn("Error adding accessory, null found! (name: %s, class: %s. node_config: %s)", this.accessory.displayName, 
						this.accessory.context.class, this.accessory.context.node_config);
		return;
	}

	this.curr_state = true;
	this.prev_state = this.curr_state;
	this.targ_state = this.curr_state;

	this.blockUpdates = false;
	this.setStateCalled = false;

	
	// Identify
	this.accessory.on('identify', function(paired, callback) {
		that.log.debug("Identify! (%s, %s)", that.accessory.displayName, that.accessory.context.node_config["id"]);
		callback();
	});


	// Service Info
	var accessoryInfoService = this.accessory.getService(Service.AccessoryInformation) || this.accessory.addService(Service.AccessoryInformation, this.accessory.displayName);

	accessoryInfoService.setCharacteristic(Characteristic.Manufacturer, "ISY-994i");
	accessoryInfoService.setCharacteristic(Characteristic.Model, "Lightbulb Scene");
	accessoryInfoService.setCharacteristic(Characteristic.SerialNumber, "ID: " + this.accessory.context.node_config["id"]);


	// Service Lightbulb
	var lightbulbService = this.accessory.getService(Service.Lightbulb) || this.accessory.addService(Service.Lightbulb, this.accessory.displayName);

	lightbulbService.getCharacteristic(Characteristic.On)
	.on("get", function(callback) {
		if (that.accessory.reachable) {
			callback(null, that.curr_state);
		}else{
			callback("no_response");
		}
	})
	.on("set", function (value, callback) {
		if (that.accessory.reachable) {
			callback(null, value);
			that.targ_state = value;
			that.setState();
		}else{
			callback("no_response");
		}
	});

}


SceneLightbulb.prototype.updateState = function() {

	var that = this;

	var sum = 0;
	var n_devices = 0;

	var sum_keypad = 0;
	var n_keypads = 0;

	this.accessory.context.status_nodes.forEach(function(node) {
		if (node["value"] != null && node["id"].slice(-1) == "1") {
			sum += node["value"];
		}else if (node["value"] != null) {
			sum_keypad += node["value"];
		}

		if (node["id"].slice(-1) == "1") {
			n_devices += 1;
		}else{
			n_keypads += 1;
		}
	});
	
	var currentValue = sum / n_devices;
	currentValue = Math.round((currentValue / 255) * 100);

	var currentValueKeypad = sum_keypad / n_keypads;
	currentValueKeypad = Math.round((currentValueKeypad / 255) * 100);

	if (n_devices == 0 && n_keypads == 0) {
		return;
	}

	if (n_devices == 0) {
		currentValue = currentValueKeypad;
	}

	if (currentValue == this.accessory.context.node_config["on_level"] && currentValueKeypad == 100){
		this.curr_state = true;
	}else{
		this.curr_state = false;
	}

	var set_state = (this.prev_state != this.curr_state && this.targ_state != this.curr_state) || 
					(this.targ_state != this.accessory.getService(Service.Lightbulb).getCharacteristic(Characteristic.On).value);

	this.prev_state = this.curr_state;

	if (set_state) {
		this.blockUpdates = true;
		this.accessory.getService(Service.Lightbulb).getCharacteristic(Characteristic.On).updateValue(this.curr_state);
		this.blockUpdates = false;
	}

}


SceneLightbulb.prototype.setState = function() {
	var that = this;

	function send_request() {

		that.targ_state = that.accessory.getService(Service.Lightbulb).getCharacteristic(Characteristic.On).value;

		var cmd = "";

		if (that.targ_state == true) {
			cmd = 'DON';
		}else{
			cmd = 'DOF';
		}

		var url = 'http://' + that.config.host + '/rest/nodes/' + that.accessory.context.node_config["id"] + '/cmd/' + cmd;
		request.get(url).auth(that.config.username, that.config.password, false)
		.catch(function (err) {
			that.log.debug("Set state error (%s, %s):\n%s", that.accessory.displayName, that.accessory.context.node_config["id"], err);
		});

		that.setStateCalled = false;
	}

	if (!this.setStateCalled && !this.blockUpdates) {
		this.setStateCalled = true;
		send_request();
	}
}
