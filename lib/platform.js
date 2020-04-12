'use strict';

var request = require('request-promise'),
	xml2js  = require('xml2js');

// Devices
const MicroDimmerAccessoryModule = require('./devices/micro_dimmer.js');
const MicroDimmerAccessory = MicroDimmerAccessoryModule.MicroDimmerAccessory;


// Scenes
const KeypadSceneAccessoryModule = require('./scenes/keypad_scene.js');
const KeypadSceneAccessory = KeypadSceneAccessoryModule.KeypadSceneAccessory;

const LightSceneAccessoryModule = require('./scenes/light_scene.js');
const LightSceneAccessory = LightSceneAccessoryModule.LightSceneAccessory;

const ToggleSceneAccessoryModule = require('./scenes/toggle_scene.js');
const ToggleSceneAccessory = ToggleSceneAccessoryModule.ToggleSceneAccessory;

const WindowSceneAccessoryModule = require('./scenes/window_scene.js');
const WindowSceneAccessory = WindowSceneAccessoryModule.WindowSceneAccessory;


// Config
const packageConfig = require('../package.json');


var Accessory, Service, Characteristic, UUIDGen;


function setHomebridge(homebridge) {

	MicroDimmerAccessoryModule.setHomebridge(homebridge);

	KeypadSceneAccessoryModule.setHomebridge(homebridge);
	LightSceneAccessoryModule.setHomebridge(homebridge);
	ToggleSceneAccessoryModule.setHomebridge(homebridge);
	WindowSceneAccessoryModule.setHomebridge(homebridge);

	Accessory = homebridge.platformAccessory;
	Service = homebridge.hap.Service;
	UUIDGen = homebridge.hap.uuid;
	Characteristic = homebridge.hap.Characteristic;
}


class ISY994Platform {

	constructor(log, config, api) {

		var that = this;

		if (!config) {
			log.warn("Ignoring ISY-994i because it is not configured");
    		this.disabled = true;
    		return;
    	}

    	this.config = {
    		platform: config["platform"],
    		name: config["name"],
			username: config["username"] || "admin",
			password: config["password"] || "admin",
			host: config["host"] || "192.168.0.50",
			devices: config["devices"],
			scenes: config["scenes"],
			refresh_interval : config['refresh_interval'] || 30000
		}

		this.log = log;
    	this.log.info("version %s", packageConfig.version);
		this.accessories = [];
		this.status = [];

		if (api) {

			this.api = api;

			this.api.on('didFinishLaunching', function() {

				// Remove cached accessories not foung on config
				that.accessories.forEach(function(cachedAccessory){
					var shouldRemove = true;
					that.config.devices.forEach(function(device) {
						if (cachedAccessory.context.id == device.id && cachedAccessory.context.class == "device"){
							shouldRemove = false;
						}
					});
					that.config.scenes.forEach(function(scene) {
						if (cachedAccessory.context.id == scene.id && cachedAccessory.context.class == "scene"){
							shouldRemove = false;
						}
					});
					if (shouldRemove) {
						that.log("Removing cached accessory not found on config (%s, %s)", cachedAccessory.displayName, cachedAccessory.context.id);
						that.removeAccessory(cachedAccessory.context.id);
					}
				});

				// update cached devices from config
				that.config.devices.forEach(function(device){
					var update = false;
					that.accessories.forEach(function(cachedAccessory){
						if (cachedAccessory.context.id == device.id && cachedAccessory.context.class == "device"){
							if (cachedAccessory.context.type != device.type || cachedAccessory.displayName != device.name){
								update = true;
							}
						}
					});
					if (update) {
						that.log("Updating accessory... (%s, %s)", device.name, device.id);
						that.removeAccessory(device.id);
						that.addAccessory(device, "device");
					}
				});

				// update cached scenes from config
				that.config.scenes.forEach(function(scene){
					var update = false;
					that.accessories.forEach(function(cachedAccessory){
						if (cachedAccessory.context.id == scene.id && cachedAccessory.context.class == "scene"){
							if (cachedAccessory.context.type != scene.type || cachedAccessory.displayName != scene.name || cachedAccessory.context.onLevel != scene.on_level){
								update = true;
							}
						}
					});
					if (update) {
						that.log("Updating accessory... (%s, %s)", scene.name, scene.id);
						that.removeAccessory(scene.id);
						that.addAccessory(scene, "scene");
					}
				});

				// Add devices from config
				that.config.devices.forEach(function(device){

					var duplicate = false;
					that.accessories.forEach(function(cachedAccessory){
						if (cachedAccessory.context.id == device.id && cachedAccessory.context.class == "device"){
							duplicate = true;
							return;
						}
					});

					if (!duplicate) {
						that.addAccessory(device, "device");
					}else{
						that.log.debug("Ignoring cached device (name: %s, id: %s)", device.name, device.id);
					}
				});

				// Add scenes from config
				that.config.scenes.forEach(function(scene){

					var duplicate = false;
					that.accessories.forEach(function(cachedAccessory){

						if (cachedAccessory.context.id == scene.id && cachedAccessory.context.class == "scene"){
							duplicate = true;
							return;
						}
					});

					if (!duplicate) {
						that.addAccessory(scene, "scene");
					}else{
						that.log.debug("Ignoring cached device (name: %s, id: %s)", scene.name, scene.id);
					}
				});

				// Start status refresh loop
				setInterval(function(){ that.status_fetch() }, that.config.refresh_interval);

			}.bind(this));
		}
	}

	configurationRequestHandler(context, request, callback) {
		return;
	}

	configureAccessory(accessory) {

		var cachedAccessory = null;

		if (accessory.context.class == "device") {

			switch (accessory.context.type) {
				case "micro_dimmer":
					cachedAccessory = new MicroDimmerAccessory(this, accessory).accessory;
					break;
				default:
					cachedAccessory = null;
			}

		}else if (accessory.context.class == "scene"){
				
			switch (accessory.context.type) {
				case "keypad_scene":
					cachedAccessory = new KeypadSceneAccessory(this, accessory).accessory;
					break;
				case "light_scene":
					cachedAccessory = new LightSceneAccessory(this, accessory).accessory;
					break;
				case "toggle_scene":
					cachedAccessory = new ToggleSceneAccessory(this, accessory).accessory;
					break;
				case "window_scene":
					cachedAccessory = new WindowSceneAccessory(this, accessory).accessory;
					break;
				default:
					cachedAccessory = null;
			}
		}

		if (cachedAccessory != null) {
			cachedAccessory.reachable = true;
			this.accessories.push(cachedAccessory);
			this.log("Adding cached device (%s, %s)", accessory.displayName, accessory.context.id);
		}

	}

	addAccessory(accessory, class_type) {

		var that = this;
		var duplicate = false;

		this.accessories.forEach(function(cachedAccessory){
  			if (cachedAccessory.displayName == accessory.name){
  				that.log("Configure accessory error: device with name %s already exists!", accessory.displayName);
  				duplicate = true;
  				return;
  			}
  			if (cachedAccessory.context.id == accessory.id){
  				that.log("Configure accessory error: device with id %s already exists!", accessory.context.id);
  				duplicate = true;
  				return;
  			}
		});

		if (!duplicate) {
			this.log("Adding accessory (%s, %s)", accessory.name, accessory.id);

			var uuid = UUIDGen.generate(accessory.name);
			var defaultAccessory = new Accessory(accessory.name, uuid);

			defaultAccessory.context.id = accessory.id;
			defaultAccessory.context.class = class_type;
			defaultAccessory.context.type = accessory.type;

			var newAccessory = null;
			if (defaultAccessory.context.class == "device") {

				switch (defaultAccessory.context.type) {
					case "micro_dimmer":
						newAccessory = new MicroDimmerAccessory(this, defaultAccessory).accessory;
						break;
					default:
						newAccessory = null;
				}
				
			}else if (defaultAccessory.context.class == "scene") {

				switch (defaultAccessory.context.type) {
					case "keypad_scene":
						newAccessory = new keypadSceneAccessory(this, defaultAccessory).accessory;
						break;
					case "light_scene":
						newAccessory = new LightSceneAccessory(this, defaultAccessory).accessory;
						break;
					case "toggle_scene":
						if (accessory.on_level == null){
							newAccessory = null;
							break;
						}
						defaultAccessory.context.onLevel = accessory.on_level;
						newAccessory = new ToggleSceneAccessory(this, defaultAccessory).accessory;
						break;
					case "window_scene":
						newAccessory = new WindowSceneAccessory(this, defaultAccessory).accessory;
						break;
					default:
						newAccessory = null;
				}
			}

			if (newAccessory != null) {
				newAccessory.reachable = true;
				this.accessories.push(newAccessory);
				this.api.registerPlatformAccessories('homebridge-isy994i', 'ISY-994i', [newAccessory]);
			}else{
				this.log.error("Error adding accessory! (%s, %s)", accessory.name, accessory.id);
			}
		}
	}

	updateAccessoriesReachability(id, enabled = true) {
  		var that = this;

		var accessory;
  		this.accessories.forEach(function(_accessory){
  			if (_accessory.context.id == id){
  				accessory = _accessory;
  				return;
  			}
		});

		if (accessory == null) {
			this.log("Could not update reachability of device with ID %s", id);
		}else{
			accessory.updateReachability(enabled);
			if (!enabled) {
				this.log("Accessory unreachable (%s, %s)", accessory.displayName, id);
			}
		}
  	}

  	removeAccessory(id) {
  		var that = this;

		var accessory;
  		this.accessories.forEach(function(_accessory){
  			if (_accessory.context.id == id){
  				accessory = _accessory;
  				return;
  			}
		});

		if (accessory == null) {
			this.log.error("Could not delete device with ID %s", id);
		}else{
			this.log("Removing accessory (%s, %s)", accessory.displayName, id);

			var index = this.accessories.indexOf(accessory);
			if (index > -1) {
				this.accessories.splice(index, 1);
			}

			this.api.unregisterPlatformAccessories('homebridge-isy994i', 'ISY-994i', [accessory]);
		}
  	}

	status_fetch(){
		var that = this;
		var url = 'http://' + this.config.host + '/rest/status';

		request.get(url)
			.auth(this.config.username, this.config.password, false)
			.then(function (parsedBody) {
				var parser = new xml2js.Parser();

				parser.parseString(parsedBody, function (err, result) {

					var node_status = [];

					result.nodes.node.forEach(function(node) {

						if (node.$.id.slice(-1) == "1") {

							var id = node.$.id;
							var value = parseInt(node.property[0].$.value);

							node_status.push({'id': id, 'value': value});
						}
					});

					that.accessories.forEach(function(accessory) {
						// update status of scene accessories
						if (accessory.context.class == "scene"){
							accessory.context.status = node_status;
						}
						that.updateAccessoriesReachability(accessory.context.id, true);
					});
				});
		    })
		    .catch(function (err) {
				that.accessories.forEach(function(accessory) {
					that.updateAccessoriesReachability(accessory.context.id, false);
				});
		        console.log(err);
		    });
	}
}


module.exports = {
	ISY994Platform: ISY994Platform,
	setHomebridge: setHomebridge
};
