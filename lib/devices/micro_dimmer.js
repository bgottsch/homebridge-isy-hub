'use strict';

const request = require('request-promise');
const xml2js  = require('xml2js');

var Service, Characteristic;


module.exports = DeviceMicroDimmer;


function DeviceMicroDimmer(hub, accessory) {

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
	
	this.curr_bright = 100;
	this.prev_bright = this.curr_bright;
	this.targ_bright = this.curr_bright;

	this.blockUpdates = false;
	this.setStateCalled = false;

	
	// Identify
	this.accessory.on('identify', function(paired, callback) {
		that.log.debug("Identify! (%s, %s)", that.accessory.displayName, that.accessory.context.node_config["id"]);
		callback();
	});


	// Service Info
	var accessoryInfoService = this.accessory.getService(Service.AccessoryInformation) || this.accessory.addService(Service.AccessoryInformation, this.accessory.displayName);

	accessoryInfoService.setCharacteristic(Characteristic.Manufacturer, "Insteon");
	accessoryInfoService.setCharacteristic(Characteristic.Model, "Micro Dimmer");
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

	lightbulbService.getCharacteristic(Characteristic.Brightness)
	.on("get", function(callback) {
		if (that.accessory.reachable) {
			callback(null, that.curr_bright);
		}else{
			callback("no_response");
		}
	})
	.on("set", function (value, callback) {
		if (that.accessory.reachable) {
			callback(null, value);
			that.targ_bright = value;
			that.setState();
		}else{
			callback("no_response");
		}
	});

}


DeviceMicroDimmer.prototype.updateState = function() {

	var that = this;

	var currentValue = this.accessory.context.status_nodes[0]["value"];
	if (currentValue == null){
		return;
	}else{
		currentValue = Math.round((currentValue / 255) * 100);
	}

	if (currentValue > 0){
		this.curr_state = true;
	}else{
		this.curr_state = false;
	}
	this.curr_bright = currentValue;

	var set_state = (this.prev_state != this.curr_state && this.targ_state != this.curr_state) || 
					(this.targ_state != this.accessory.getService(Service.Lightbulb).getCharacteristic(Characteristic.On).value);

	var set_bright = (this.prev_bright != this.curr_bright && this.targ_bright != this.curr_bright) || 
					 (this.targ_bright != this.accessory.getService(Service.Lightbulb).getCharacteristic(Characteristic.Brightness).value);

	this.prev_state = this.curr_state;
	this.prev_bright = this.curr_bright;

	if (set_state) {
		this.blockUpdates = true;
		this.accessory.getService(Service.Lightbulb).getCharacteristic(Characteristic.On).updateValue(this.curr_state);
		this.blockUpdates = false;
	}

	if (set_bright) {
		this.blockUpdates = true;
		this.accessory.getService(Service.Lightbulb).getCharacteristic(Characteristic.Brightness).updateValue(this.curr_bright);
		this.blockUpdates = false;
	}

}


DeviceMicroDimmer.prototype.setState = function() {
	var that = this;

	function send_request() {

		that.targ_state = that.accessory.getService(Service.Lightbulb).getCharacteristic(Characteristic.On).value;

		var cmd;
		var brightness;

		if (that.targ_state == true) {
			cmd = 'DON';
		}else{
			cmd = 'DOF';
		}
		brightness = Math.round((that.targ_bright / 100) * 255);
			
		var url = 'http://' + that.config.host + '/rest/nodes/' + that.accessory.context.node_config["id"] + '/cmd/' + cmd + '/' + brightness;
		request.get(url).auth(that.config.username, that.config.password, false)
		.catch(function (err) {
			that.log.debug("Set state error (%s, %s):\n%s", that.accessory.displayName, that.accessory.context.node_config["id"], err);
		});

		that.setStateCalled = false;
	}

	if (!this.setStateCalled && !this.blockUpdates) {
		this.setStateCalled = true;
		setTimeout(send_request, 2000);
	}
}
