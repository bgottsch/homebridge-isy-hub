'use strict';

const request   = require('request-promise'),
	  xml2js    = require('xml2js'),
	  WebSocket = require('ws');

// Devices
const MicroDimmerAccessoryModule = require('./devices/micro_dimmer.js');
const MicroDimmerAccessory = MicroDimmerAccessoryModule.MicroDimmerAccessory;

const MicroOpenCloseAccessoryModule = require('./devices/micro_open_close.js');
const MicroOpenCloseAccessory = MicroOpenCloseAccessoryModule.MicroOpenCloseAccessory;


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
	MicroOpenCloseAccessoryModule.setHomebridge(homebridge);

	KeypadSceneAccessoryModule.setHomebridge(homebridge);
	LightSceneAccessoryModule.setHomebridge(homebridge);
	ToggleSceneAccessoryModule.setHomebridge(homebridge);
	WindowSceneAccessoryModule.setHomebridge(homebridge);

	Accessory = homebridge.platformAccessory;
	Service = homebridge.hap.Service;
	UUIDGen = homebridge.hap.uuid;
	Characteristic = homebridge.hap.Characteristic;
}


class ISYPlatform {

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
					cachedAccessory = cachedAccessory.accessory;

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
						cachedAccessory = cachedAccessory.accessory;

						if (cachedAccessory.context.id == device.id && cachedAccessory.context.class == "device"){
							if (cachedAccessory.context.type != device.type || cachedAccessory.displayName != device.name){
								update = true;
							}
						}
					});
					if (update) {
						that.log("Changes detected in accessory, updating... (%s, %s)", device.name, device.id);
						that.removeAccessory(device.id);
						that.addAccessory(device, "device");
					}
				});

				// update cached scenes from config
				that.config.scenes.forEach(function(scene){
					var update = false;
					that.accessories.forEach(function(cachedAccessory){
						cachedAccessory = cachedAccessory.accessory;

						if (cachedAccessory.context.id == scene.id && cachedAccessory.context.class == "scene"){
							if (cachedAccessory.context.type != scene.type || cachedAccessory.displayName != scene.name){
								update = true;
							}

							if (scene.type == "light_scene" || scene.type == "toggle_scene") {
								if (cachedAccessory.context.on_level != scene.on_level){
									update = true;
								}
							}

							if (scene.type == "lighkeypad_scenet_scene") {
								if (cachedAccessory.context.trigger_node != scene.trigger_node){
									update = true;
								}
							}
						}
					});
					if (update) {
						that.log("Changes detected in accessory, updating... (%s, %s)", scene.name, scene.id);
						that.removeAccessory(scene.id);
						that.addAccessory(scene, "scene");
					}
				});

				// Add devices from config
				that.config.devices.forEach(function(device){

					var duplicate = false;
					that.accessories.forEach(function(cachedAccessory){
						cachedAccessory = cachedAccessory.accessory;

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
						cachedAccessory = cachedAccessory.accessory;

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

				that.get_device_nodes();
				that.get_scene_nodes();

				that.setup_socket();

				// Start status refresh loop
				// setInterval(function(){ that.status_fetch() }, that.config.refresh_interval);

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
					cachedAccessory = new MicroDimmerAccessory(this, accessory);
					break;
				case "micro_open_close":
					cachedAccessory = new MicroOpenCloseAccessory(this, accessory);
					break;
				default:
					cachedAccessory = null;
			}

		}else if (accessory.context.class == "scene"){
				
			switch (accessory.context.type) {
				case "keypad_scene":
					cachedAccessory = new KeypadSceneAccessory(this, accessory);
					break;
				case "light_scene":
					cachedAccessory = new LightSceneAccessory(this, accessory);
					break;
				case "toggle_scene":
					cachedAccessory = new ToggleSceneAccessory(this, accessory);
					break;
				case "window_scene":
					cachedAccessory = new WindowSceneAccessory(this, accessory);
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
			cachedAccessory = cachedAccessory.accessory;

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
						newAccessory = new MicroDimmerAccessory(this, defaultAccessory);
						break;
					case "micro_open_close":
						newAccessory = new MicroOpenCloseAccessory(this, defaultAccessory);
						break;
					default:
						newAccessory = null;
				}
				
			}else if (defaultAccessory.context.class == "scene") {

				switch (defaultAccessory.context.type) {
					case "keypad_scene":
						if (accessory.trigger_node == null){
							newAccessory = null;
							break;
						}
						defaultAccessory.context.trigger_node = accessory.trigger_node;
						newAccessory = new KeypadSceneAccessory(this, defaultAccessory);
						break;
					case "light_scene":
						if (accessory.on_level == null){
							newAccessory = null;
							break;
						}
						defaultAccessory.context.on_level = accessory.on_level;
						newAccessory = new LightSceneAccessory(this, defaultAccessory);
						break;
					case "toggle_scene":
						if (accessory.on_level == null){
							newAccessory = null;
							break;
						}
						defaultAccessory.context.on_level = accessory.on_level;
						newAccessory = new ToggleSceneAccessory(this, defaultAccessory);
						break;
					case "window_scene":
						newAccessory = new WindowSceneAccessory(this, defaultAccessory);
						break;
					default:
						newAccessory = null;
				}
			}

			if (newAccessory != null) {
				this.accessories.push(newAccessory);

				newAccessory = newAccessory.accessory;
				newAccessory.reachable = true;
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
  			if (_accessory.accessory.context.id == id){
  				accessory = _accessory;
  				return;
  			}
		});

		if (accessory.accessory == null) {
			this.log.error("Could not update reachability of device with ID %s", id);
		}else{
			accessory.accessory.updateReachability(enabled);
			if (!enabled) {
				this.log("Accessory unreachable (%s, %s)", accessory.accessory.displayName, id);
			}
		}
  	}

  	removeAccessory(id) {
  		var that = this;

		var accessory;
  		this.accessories.forEach(function(_accessory){
  			if (_accessory.accessory.context.id == id){
  				accessory = _accessory;
  				return;
  			}
		});

		if (accessory.accessory == null) {
			this.log.error("Could not delete device with ID %s", id);
		}else{
			this.log("Removing accessory (%s, %s)", accessory.accessory.displayName, id);

			var index = this.accessories.indexOf(accessory);
			if (index > -1) {
				this.accessories.splice(index, 1);
			}

			this.api.unregisterPlatformAccessories('homebridge-isy994i', 'ISY-994i', [accessory.accessory]);
		}
	}

	get_device_nodes() {
		var that = this;

		this.accessories.forEach(function(accessory) {
			accessory = accessory.accessory;

			if (accessory.context.class == "device") {
				accessory.context.status_nodes = [];
				accessory.context.status_nodes.push( {"id":accessory.context.id, "value": null} );
			}

		});
	}
	
	get_scene_nodes() {
		var that = this;

		var url = 'http://' + this.config.host + '/rest/nodes/scenes'
		request.get(url).auth(this.config.username, this.config.password, false)
		.then(function (parsedBody) {
			var parser = new xml2js.Parser();
			
			parser.parseString(parsedBody, function (err, result) {
				result.nodes.group.forEach(function(group) {
					
					that.accessories.forEach(function(accessory) {
						accessory = accessory.accessory;
						
						if (group.address == accessory.context.id && accessory.context.class == "scene" && accessory.context.type != "keypad_scene") {
							accessory.context.status_nodes = [];
							group.members[0].link.forEach(function(node) {

								var deviceIdParts = node._.split(" ");
								var deviceId = "";
								deviceIdParts.forEach(function(part){
									if (deviceIdParts.indexOf(part) != 3){
										if (part.length == 1){
											deviceId += '0' + part;
										}else{
											deviceId += part;
										}
									}else{
										deviceId += part;
									}
									deviceId += ' ';
								});
								deviceId = deviceId.trim();

								accessory.context.status_nodes.push( {"id": deviceId, "value": null} );
							});
						}
					});

				});
		    });
	    })
	    .catch(function (err) {
	        console.log('error:', err);
	    });
	}

	setup_socket(){
		var that = this;

		var url = 'wss://' + this.config.host + '/rest/subscribe/';
		const ws = new WebSocket(url, 'ISYSUB', {
			protocolVersion: 13,
			origin: 'com.universal-devices.websockets.isy',
			headers : {
				'Authorization': 'Basic ' + Buffer.from(that.config.username + ':' + that.config.password).toString('base64')
			},
			rejectUnauthorized: false
		});

		const parser = new xml2js.Parser();

		ws.on('error', function (error) {
			console.log(error);
		});

		ws.on('message', function (data) {
			parser.parseString(data, function (err, result) {

				if (result.Event != undefined){

					var action = parseInt(result.Event.action[0]);

					if (action == 3){
						var deviceIdParts = result.Event.eventInfo[0].split("]")[0].replace("[", "").trim().split(" ");
						var deviceId = "";
						deviceIdParts.forEach(function(part){
							if (deviceIdParts.indexOf(part) != 3){
								if (part.length == 1){
									deviceId += '0' + part;
								}else{
									deviceId += part;
								}
							}else{
								deviceId += part;
							}
							deviceId += ' ';
						});
						deviceId = deviceId.trim();

						var value = result.Event.eventInfo[0].split("ST")[1].trim();
						value = parseInt(value);

						that.accessories.forEach(function(_accessory) {
							var accessory = _accessory.accessory;

							if (accessory.context.class == "scene" && accessory.context.type == "keypad_scene"){
								if (accessory.context.trigger_node == deviceId){
									var statelessService = _accessory.getService(Service.StatelessProgrammableSwitch).getCharacteristic(Characteristic.ProgrammableSwitchEvent);
									if (value == 255){
										statelessService.setValue(0);
									}else{
										statelessService.setValue(0);
									}
								}
							}else{
								accessory.context.status_nodes.forEach(function(node) {
									if (node['id'] == deviceId){
										node['value'] = value
									}
								});
								_accessory.updateState();
							}

						});

					}
				}

			});
		});

	}

	status_fetch(){
		var that = this;

		var url = 'http://' + this.config.host + '/rest/status';
		request.get(url)
			.auth(this.config.username, this.config.password, false)
			.then(function (parsedBody) {
				var parser = new xml2js.Parser();

				parser.parseString(parsedBody, function (err, result) {

					that.accessories.forEach(function(accessory) {
						accessory = accessory.accessory;

						accessory.context.status_nodes.forEach(function(node) {
							if (node['id'] == deviceId){
								node['value'] = value
							}
						});

					});

					result.nodes.node.forEach(function(node) {

						if (node.$.id.slice(-1) == "1") {

							var id = node.$.id;
							var value = parseInt(node.property[0].$.value);

							node_status.push({'id': id, 'value': value});
						}
					});

					that.accessories.forEach(function(accessory) {
						// update status of scene accessories
						if (accessory.context.class == "scene" && accessory.context.type != "keypad_scene"){
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
	ISYPlatform: ISYPlatform,
	setHomebridge: setHomebridge
};
