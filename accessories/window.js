var inherits = require("util").inherits;

var Accessory, Service, Characteristic, uuid;

module.exports = function (oAccessory, oService, oCharacteristic, ouuid) {
	if (oAccessory) {
		Accessory = oAccessory;
		Service = oService;
		Characteristic = oCharacteristic;
		uuid = ouuid;

		inherits(InsteonWindowAccessory, Accessory);
		InsteonWindowAccessory.prototype.deviceGroup = "windows";
		InsteonWindowAccessory.prototype.getServices = getServices;
		InsteonWindowAccessory.prototype.identify = identify;
		InsteonWindowAccessory.prototype.logStateChange = logStateChange;
	
	}
	return InsteonWindowAccessory;
};
module.exports.InsteonWindowAccessory = InsteonWindowAccessory;

function InsteonWindowAccessory(platform, device) {
	
	this.sceneId = device["SceneID"];
	this.name = device["SceneName"];
	this.platform = platform;
	this.log = platform.log;
	this.debug = platform.debug;
	
	// init variables
	this.currentPosition = 100;
	this.targetPosition = 100;
	this.positionState = Characteristic.PositionState.STOPPED;
	// end init vars
	
	var idKey = "hbdev:insteon:window:" + this.deviceid;
	var id = uuid.generate(idKey);
	
	Accessory.call(this, this.name, id);
	var self = this;
	
	this.addService(Service.WindowCovering);
	
	// AccessoryInformation characteristic
	// Manufacturer characteristic
	this.getService(Service.AccessoryInformation)
		.setCharacteristic(Characteristic.Manufacturer, "homebridge-insteonScene");
	
	// Model characteristic	
	this.getService(Service.AccessoryInformation)
		.setCharacteristic(Characteristic.Model, "version 0.3.1");
	
	// SerialNumber characteristic
	this.getService(Service.AccessoryInformation)
		.setCharacteristic(Characteristic.SerialNumber, "Scene ID: " + self.sceneId);
	
	// Window Covering Service
	// Current Position characteristic
	this.getService(Service.WindowCovering)
		.getCharacteristic(Characteristic.CurrentPosition)
		.on("get", function (callback) {
			var hub = new self.platform.api(self.platform.username, self.platform.password, self.platform.clientID, self.platform.host);
			hub.getSceneStatus(self.sceneId, function(response) {
				
				if (response == true) {
					self.currentPosition = 100;
				}else{
					self.currentPosition = 0;
				}
				
				callback(null, self.currentPosition);
			});
		});
	
	// Target Position characteristic	
	this.getService(Service.WindowCovering)
		.getCharacteristic(Characteristic.TargetPosition)
		.on("get", function (callback) {
			callback(null, self.targetPosition);
		})
		.on("set", function (value, callback) {
			callback();
			
			var insteonCommand;
			
			if (value < self.currentPosition) {
				insteonCommand = "off";
				self.currentPosition = 0;
				self.targetPosition = 0;
			}
			else if (value > self.currentPosition) {
				insteonCommand = "on";
				self.currentPosition = 100;
				self.targetPosition = 100;
			}else{
				return;
			}
			
			var hub = new self.platform.api(self.platform.username, self.platform.password, self.platform.clientID, self.platform.host);
			hub.sendSceneAction(self.sceneId, insteonCommand, function(response) {
				logStateChange(self);
			});
		});
	
	// Position State characteristic
	this.getService(Service.WindowCovering)
		.getCharacteristic(Characteristic.PositionState)
		.on("get", function (callback) {
		
			var hub = new self.platform.api(self.platform.username, self.platform.password, self.platform.clientID, self.platform.host);
			hub.getSceneStatus(self.sceneId, function(response) {
				
				if (response == true) {
					self.positionState = true;
				}else{
					self.positionState = false;
				}
				
				callback(null, self.positionState);
			});
		});
}

function getServices() {
	return this.services;
}

function identify() {
	this.log("Identify! (name: %s)", this.name);
}

function logStateChange(self) {
	self.log("Changed status (name: %s, target position: %s)", self.name, self.targetPosition);
}