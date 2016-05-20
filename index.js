var InsteonHub = require('./node_modules/insteon-hub/lib/InsteonHub.js');

var Accessory, Service, Characteristic, UUIDGen;

module.exports = function(homebridge) {
  
  Accessory = homebridge.platformAccessory;

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  
  homebridge.registerPlatform("homebridge-insteonScene", "InsteonScene", InsteonScene, true);
}

function InsteonScene(log, config, api) {
	console.log("[InsteonScene] Platform - Initialising");
	this.log = log;
	this.config = config;
	this.accessories = [];

	this.username = config["username"];
	this.password = config["password"];
	this.clientID = config["client_id"];
	this.host = config["host"];
	
	this.sceneList = [];
	
	var self = this;
	
  	if (api) {

      	this.api = api;

      	this.api.on('didFinishLaunching', function() {
        	console.log("[InsteonScene] Platform - DidFinishLaunching");
	
			var hub = new InsteonHub(self.username, self.password, self.clientID, self.host);
			hub.getScenes(function(response) {
		
				var result = response["SceneList"];
		
				for (var i in result) {
			
					var obj = {"SceneID": result[i]["SceneID"],
							 "SceneName": result[i]["SceneName"]
							 };
			
					self.sceneList.push(obj);
				}
				
				// remove scenes not found on hub
				if (self.accessories.lenght != 0) {
					
					for (var i in self.accessories) {
			
						var accessory = self.accessories[i];
						var shouldDelete = true;
			
						for (var j in self.sceneList) {
				
							var scene = self.sceneList[j];
				
							if (scene["SceneID"] == accessory.context.sceneId || scene["SceneName"] == accessory.context.sceneName) {
								
								shouldDelete = false;
							}
						}
						
						if (shouldDelete) {
							
							self.accessories.splice(i, 1);
							self.removeAccessory(accessory);
						}
					}
				}
				
				// no scenes yet. adding all found
				if (self.accessories.lenght == 0) {
					
					for (var i in self.sceneList) {
					
						self.addAccessory(self.sceneList[i]["SceneName"], self.sceneList[i]["SceneID"]);
					}
				}
				// removing repeated scenes and adding non existing
				else {
					
					for (var i in self.accessories) {
			
						var accessory = self.accessories[i];
			
						for (var j in self.sceneList) {
				
							var scene = self.sceneList[j];
				
							if (scene["SceneID"] == accessory.context.sceneId || scene["SceneName"] == accessory.context.sceneName) {
								
								self.sceneList.splice(j, 1);
							}
						}
					}
					
					for (var i in self.sceneList) {
					
						self.addAccessory(self.sceneList[i]["SceneName"], self.sceneList[i]["SceneID"]);
					}
				}
				
			});
        
      	});
  	}
}

InsteonScene.prototype.configureAccessory = function(accessory) {
  	console.log("[InsteonScene] " + accessory.displayName + " - Accessory loaded");

  	accessory.reachable = true;
  	
  	var state = 0;
  
  	accessory.on('identify', function(paired, callback) {
   		console.log("[InsteonScene] " + accessory.displayName + " - Identify!");
    	callback();
  	});
	
	var self = this;
	
  	if (accessory.getService(Service.Lightbulb)) {
    	accessory.getService(Service.Lightbulb)
    	.getCharacteristic(Characteristic.On)
      		.on('get', function(callback) {
      			self.getPowerOn(self.state, accessory.context.sceneName, callback);
  			})
      		.on('set', function(value, callback) {
      			self.state = value ? 1 : 0;
    			self.setPowerOn(value, accessory.context.sceneId, accessory.context.sceneName, callback);
  			});
  	}

  	this.accessories.push(accessory);
}

InsteonScene.prototype.addAccessory = function(accessoryName, sceneId) {
  	var uuid;

  	if (!accessoryName) {
    	accessoryName = "Insteon Scene"
  	}
  
  	console.log("[InsteonScene] Platform - Accessory added: " + accessoryName);

  	uuid = UUIDGen.generate(accessoryName);

  	var newAccessory = new Accessory(accessoryName, uuid);
  	
  	newAccessory.context.sceneId = sceneId;
  	newAccessory.context.sceneName = accessoryName;
  	
  	newAccessory.on('identify', function(paired, callback) {
    	console.log("[InsteonScene] " + accessoryName + " - Identify!");
    	callback();
 	});
	
	var self = this;
	
	var state = 0;
	
  	newAccessory.addService(Service.Lightbulb, accessoryName)
  	.getCharacteristic(Characteristic.On)
    	.on('get', function(callback) {
      		self.getPowerOn(self.state, newAccessory.context.sceneName, callback);
  		})
    	.on('set', function(value, callback) {
    		self.state = value ? 1 : 0;
    		self.setPowerOn(value, newAccessory.context.sceneId, newAccessory.context.sceneName, callback);
  		});

  	this.accessories.push(newAccessory);
  	this.api.registerPlatformAccessories("homebridge-insteonScene", "InsteonScene", [newAccessory]);
}

InsteonScene.prototype.removeAccessory = function(accessory) {
  	console.log("[InsteonScene] Platform - Accessory removed: " + accessory.context.sceneName);
  	this.api.unregisterPlatformAccessories("homebridge-insteonScene", "InsteonScene", [accessory]);
}

InsteonScene.prototype.getPowerOn = function(powerOn, deviceName, callback) {
  	
  	var state;
  	
  	if (powerOn) {
  		state = "on";
  	}else{
  		state = "off";
  	}
  	
  	console.log("[InsteonScene] " + deviceName + " - Getting power state: " + state);
  	callback(null, state);
}

InsteonScene.prototype.setPowerOn = function(powerOn, sceneId, deviceName, callback) {
	
	var hub = new InsteonHub(this.username, this.password, this.clientID, this.host);
  	
  	var insteonCommand;
  	
  	if (powerOn) {
  		insteonCommand = "on";
  	}else{
  		insteonCommand = "off";
  	}
  	
	hub.sendSceneAction(sceneId, insteonCommand, function() {
  		
  		console.log("[InsteonScene] " + deviceName + " - Setting power state: " + insteonCommand);
  		
		callback(null);
	});
}