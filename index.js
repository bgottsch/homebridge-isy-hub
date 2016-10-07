var InsteonHub = require('./node_modules/insteon-hub/lib/InsteonHub.js');

var Service, Characteristic, Accessory, uuid;

var InsteonSceneAccessory;
var InsteonWindowAccessory;

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	Accessory = homebridge.hap.Accessory;
	uuid = homebridge.hap.uuid;

	InsteonSceneAccessory = require('./accessories/scene.js')(Accessory, Service, Characteristic, uuid);
	InsteonWindowAccessory = require('./accessories/window.js')(Accessory, Service, Characteristic, uuid);

	homebridge.registerPlatform("homebridge-insteonScene", "InsteonScene", InsteonScenePlatform);
};

function InsteonScenePlatform(log, config) {
	
	this.api = InsteonHub;
	this.log = log;
	this.debug = log.debug;
	
	this.username = config["username"];
	this.password = config["password"];
	this.clientID = config["client_id"];
	this.host = config["host"];
	
	if (config["window_scenes"] != undefined) {
		this.windowScenes = config["window_scenes"];
	} else {
		this.windowScenes = [];
	}
	
	if (config["black_list"] != undefined) {
		this.blackList = config["black_list"];
	} else {
		this.blackList = [];
	}
	
	this.scenes = [];
}

InsteonScenePlatform.prototype = {
	accessories: function (callback) {
		this.log("Fetching Insteon scenes...");

		var self = this;
		this.scenes = [];
		
		var hub = new InsteonHub(self.username, self.password, self.clientID, self.host);
		hub.getScenes(function(response) {
			
			if (response == null) {
				self.log("There was an error retrieving the scenes. Aborting...");
				return;
			}
			
			var sceneList = response["SceneList"];
				
			for (var i in sceneList) {
				var obj = {"SceneID": sceneList[i]["SceneID"], "SceneName": sceneList[i]["SceneName"]};
				
				var shouldRemove = false;
				
				for (var j in self.blackList) {
					if (sceneList[i]["SceneID"] == self.blackList[j] || sceneList[i]["SceneName"] == self.blackList[j]) {
						shouldRemove = true;
					}
				}
				
				var isWindow = false;
				
				for (var j in self.windowScenes) {
					if (sceneList[i]["SceneID"] == self.windowScenes[j] || sceneList[i]["SceneName"] == self.windowScenes[j]) {
						isWindow = true;
					}
				}
				
				if (!shouldRemove) {
				
					if (isWindow) {
					
						var accessory = undefined;
						accessory = new InsteonWindowAccessory(self, obj);
				
						if (accessory != undefined) {
							self.log("Window added (name: %s, ID: %s)", obj["SceneName"], obj["SceneID"]);
							self.scenes.push(accessory);
						}
					} else {
					
						var accessory = undefined;
						accessory = new InsteonSceneAccessory(self, obj);
				
						if (accessory != undefined) {
							self.log("Scene added (name: %s, ID: %s)", obj["SceneName"], obj["SceneID"]);
							self.scenes.push(accessory);
						}
					}
				}
			}
			
			callback(self.scenes);
		});
	}
};