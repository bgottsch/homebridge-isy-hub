'use strict';

const request = require('request-promise');
const xml2js  = require('xml2js');

var Service, Characteristic;


module.exports = SceneWindowCover;


function SceneWindowCover(hub, accessory) {

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

	
	this.curr_tPosition = 100;
	this.prev_tPosition = this.curr_tPosition;
	this.targ_tPosition = this.curr_tPosition;
	
	this.curr_cPosition = 100;
	this.prev_cPosition = this.curr_cPosition;
	this.targ_cPosition = this.curr_cPosition;
	
	this.curr_pState = 2;
	this.prev_pState = this.curr_pState;
	this.targ_pState = this.curr_pState;

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
	accessoryInfoService.setCharacteristic(Characteristic.Model, "Window Cover Scene");
	accessoryInfoService.setCharacteristic(Characteristic.SerialNumber, "ID: " + this.accessory.context.node_config["id"]);


	// Service WindowCover
	var windowCoverService = this.accessory.getService(Service.WindowCovering) || this.accessory.addService(Service.WindowCovering, this.accessory.displayName);

	windowCoverService.getCharacteristic(Characteristic.TargetPosition)
	.on("get", function(callback) {
		if (that.accessory.reachable) {
			callback(null, that.curr_tPosition);
		}else{
			callback("no_response");
		}
	})
	.on("set", function (value, callback) {
		if (that.accessory.reachable) {
			callback(null, value);
			that.targ_tPosition = value;
			that.setState();
		}else{
			callback("no_response");
		}
	});

	windowCoverService.getCharacteristic(Characteristic.CurrentPosition)
	.on("get", function(callback) {
		if (that.accessory.reachable) {
			callback(null, that.curr_cPosition);
		}else{
			callback("no_response");
		}
	});

	windowCoverService.getCharacteristic(Characteristic.PositionState)
	.on("get", function(callback) {
		if (that.accessory.reachable) {
			callback(null, that.curr_pState);
		}else{
			callback("no_response");
		}
	});

}


SceneWindowCover.prototype.updateState = function() {

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

	if (currentValueKeypad != 100){
		currentValue = 0;
	}

	this.curr_tPosition = currentValue;
	this.curr_cPosition = currentValue;
	this.curr_pState = 2;

	var set_tPosition = (this.prev_tPosition != this.curr_tPosition && this.targ_tPosition != this.curr_tPosition) || 
						(this.targ_tPosition != this.accessory.getService(Service.WindowCovering).getCharacteristic(Characteristic.TargetPosition).value);
						
	var set_cPosition = (this.prev_cPosition != this.curr_cPosition && this.targ_cPosition != this.curr_cPosition) || 
						(this.targ_cPosition != this.accessory.getService(Service.WindowCovering).getCharacteristic(Characteristic.CurrentPosition).value);
						
	var set_pState = (this.prev_pState != this.curr_pState && this.targ_pState != this.curr_pState) || 
					 (this.targ_pState != this.accessory.getService(Service.WindowCovering).getCharacteristic(Characteristic.PositionState).value);

	this.prev_tPosition = this.curr_tPosition;
	this.prev_cPosition = this.curr_cPosition;
	this.prev_pState = this.curr_pState;

	if (set_tPosition) {
		this.blockUpdates = true;
		this.accessory.getService(Service.WindowCovering).getCharacteristic(Characteristic.TargetPosition).setValue(this.curr_tPosition);
		this.blockUpdates = false;
	}

	if (set_cPosition) {
		this.blockUpdates = true;
		this.accessory.getService(Service.WindowCovering).getCharacteristic(Characteristic.CurrentPosition).setValue(this.curr_cPosition);
		this.blockUpdates = false;
	}

	if (set_pState) {
		this.blockUpdates = true;
		this.accessory.getService(Service.WindowCovering).getCharacteristic(Characteristic.PositionState).setValue(this.curr_pState);
		this.blockUpdates = false;
	}

}


SceneWindowCover.prototype.setState = function() {
	var that = this;

	function send_request() {

		that.targ_tPosition = that.accessory.getService(Service.WindowCovering).getCharacteristic(Characteristic.TargetPosition).value;
		that.targ_cPosition = that.targ_tPosition;
		that.targ_pState = 2;

		var cmd;
		var brightness;

		if (that.targ_tPosition > 0) {
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
