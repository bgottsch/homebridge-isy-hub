var inherits = require("util").inherits;

var Accessory, Service, Characteristic, uuid;

module.exports = function (oAccessory, oService, oCharacteristic, ouuid) {
	if (oAccessory) {
		Accessory = oAccessory;
		Service = oService;
		Characteristic = oCharacteristic;
		uuid = ouuid;

		inherits(InsteonSceneAccessory, Accessory);
		InsteonSceneAccessory.prototype.deviceGroup = "scenes";
		InsteonSceneAccessory.prototype.getServices = getServices;
		InsteonSceneAccessory.prototype.identify = identify;
		InsteonSceneAccessory.prototype.logStateChange = logStateChange;
	
	}
	return InsteonSceneAccessory;
};
module.exports.InsteonSceneAccessory = InsteonSceneAccessory;

function InsteonSceneAccessory(platform, device) {
	
	this.sceneId = device["SceneID"];
	this.name = device["SceneName"];
	this.platform = platform;
	this.log = platform.log;
	this.debug = platform.debug;
	
	// init variables
	this.powerState = false;
	// end init vars
	
	var idKey = "hbdev:insteon:scene:" + this.deviceid;
	var id = uuid.generate(idKey);
	
	Accessory.call(this, this.name, id);
	var self = this;
	
	this.addService(Service.Lightbulb);
	
	// AccessoryInformation characteristic
	// Manufacturer characteristic
	this.getService(Service.AccessoryInformation)
		.setCharacteristic(Characteristic.Manufacturer, "homebridge-insteonScene");
	
	// Model characteristic	
	this.getService(Service.AccessoryInformation)
		.setCharacteristic(Characteristic.Model, "version 0.4.0");
	
	// SerialNumber characteristic
	this.getService(Service.AccessoryInformation)
		.setCharacteristic(Characteristic.SerialNumber, "Scene ID: " + self.sceneId);
	
	// Lightbulb Service
	// On characteristic
	var refreshing = false;
	this.getService(Service.Lightbulb)
		.getCharacteristic(Characteristic.On)
		.on("get", function (callback) {
			
			if (refreshing == false) {
				refreshing = true;
				
				var main = self;
				
				var hub = new self.platform.api(self.platform.username, self.platform.password, self.platform.clientID, self.platform.host);
				hub.getSceneStatus(self.sceneId, function(response) {
					
					if (response == true) {
						main.powerState = true;
					}else{
						main.powerState = false;
					}
					
					refreshing = false;
					
					callback(null, main.powerState);
				});
			}
		})
		.on("set", function (value, callback) {
			callback();
			
			var insteonCommand;
  	
			if (value) {
				insteonCommand = "on";
				self.powerState = true;
			}else{
				insteonCommand = "off";
				self.powerState = false;
			}
			
			var hub = new self.platform.api(self.platform.username, self.platform.password, self.platform.clientID, self.platform.host);
			hub.sendSceneAction(self.sceneId, insteonCommand, function(response) {
				logStateChange(self);
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
	self.log("Changed status (name: %s, state: %s)", self.name, self.powerState);
}
