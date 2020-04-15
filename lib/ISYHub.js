'use strict';

const request   = require('request-promise');
const xml2js    = require('xml2js');
const WebSocket = require('ws');
const jsonDiff  = require('json-diff')

var Accessory, Service, Characteristic, UUIDGen;


// Devices
const DeviceMicroDimmer = require('./devices/micro_dimmer.js');
const DeviceMicroOpenClose = require('./devices/micro_open_close.js');


// Scenes
const SceneLightbulb = require('./scenes/lightbulb.js');
const SceneSwitch = require('./scenes/switch.js');
const SceneWindowCover = require('./scenes/window_cover.js');

const KeypadSceneAccessoryModule = require('./scenes/keypad_scene.js');
const KeypadSceneAccessory = KeypadSceneAccessoryModule.KeypadSceneAccessory;


// Config
const packageConfig = require('../package.json');


module.exports = function(homebridge) {

	Accessory = homebridge.platformAccessory;
	Service = homebridge.hap.Service;
	UUIDGen = homebridge.hap.uuid;
	Characteristic = homebridge.hap.Characteristic;

	return ISYHub;
};


function ISYHub(log, config, api) {

	var that = this;

	this.log = log;
	this.config = config;
	this.accessories = [];

	this.log.info("v%s", packageConfig.version);

	try {
		this.config = {
			platform: config["platform"] || "isy-hub",
			name:     config["name"]     || "isy-hub",

			username: config["username"] || "admin",
			password: config["password"] || "admin",
			host:     config["host"]     || "192.168.0.50",

			devices: config["devices"] || [],
			scenes:  config["scenes"]  || [],

			refresh_interval:   config['refresh_interval']   || 30000,
			reconnect_interval: config['reconnect_interval'] || 5000,
			heartbeat_interval: config['heartbeat_interval'] || 30000
		}
	}catch{
		this.log.warn("Disabling plugin, config not found!");
		this.disabled = true;
		return;
	}

	// heartbeat margin
	this.config.heartbeat_interval += 1000;

	if (api) {
		this.api = api;
		this.api.on('didFinishLaunching', function() {
			that.setupAccessories();
			that.setup_socket();

			that.log.info("Startup complete!");
		});
	}
}


ISYHub.prototype.configureAccessory = function(accessory) {

	var that = this;

	var _accessory;

	if (accessory.context.class == "device") {

		switch (accessory.context.node_config["type"]) {

			case "micro_dimmer":
				_accessory = new DeviceMicroDimmer(this, accessory);
				break;

			case "micro_open_close":
				_accessory = new DeviceMicroOpenClose(this, accessory);
				break;

			default:
				_accessory = null;
		}

	}else if (accessory.context.class == "scene") {

		switch (accessory.context.node_config["type"]) {

			case "keypad_scene":
				_accessory = new KeypadSceneAccessory(this, accessory);
				break;

			case "lightbulb":
				_accessory = new SceneLightbulb(this, accessory);
				break;

			case "switch":
				_accessory = new SceneSwitch(this, accessory);
				break;

			case "window_cover":
				_accessory = new SceneWindowCover(this, accessory);
				break;

			default:
				_accessory = null;
		}
	}

	if (_accessory != null) {
		_accessory.accessory.reachable = false;
		this.accessories.push(_accessory);
		this.log.debug("Added %s from cache (%s, %s)", _accessory.accessory.context.class, _accessory.accessory.displayName, _accessory.accessory.context.node_config["id"]);
	}else{
		this.log.warn("null accessory returned from cache, skipping... (%s, %s)", accessory.displayName, accessory.context.node_config["id"]);
	}
}


ISYHub.prototype.configurationRequestHandler = function(context, request, callback) {
	this.log.debug("Configuration request handler not implemented!");
	return;
}


ISYHub.prototype.setupAccessories = function() {

	var that = this;

	var to_remove = [];

	// Remove and update based on config
	var devices_scenes = this.config.devices.concat(this.config.scenes);
	this.accessories.forEach(function(_accessory){

		var should_remove = true;
		var should_update = false;
		
		devices_scenes.forEach(function(device_scene) {
			if (_accessory.accessory.context.node_config["id"] == device_scene["id"]){

				should_remove = false;

				var diff = jsonDiff.diffString(_accessory.accessory.context.node_config, device_scene);
				if (diff != "") {
					should_update = true;
				}
			}
		});

		if (should_remove) {
			to_remove.push(_accessory);
			that.log.info("Removing %s not found on config (%s, %s)", _accessory.accessory.context.class, _accessory.accessory.displayName, _accessory.accessory.context.node_config["id"]);
		}
	
		if (should_update) {
			to_remove.push(_accessory);
			that.log.info("Removing %s, new config found (%s, %s)", _accessory.accessory.context.class, _accessory.accessory.displayName, _accessory.accessory.context.node_config["id"]);
		}
		
	});

	to_remove.forEach(function(_accessory) {
		that.removeAccessory(_accessory.accessory);
	});


	// Add devices from config
	this.config.devices.forEach(function(device){

		var duplicate = false;
		that.accessories.forEach(function(cachedAccessory){
			cachedAccessory = cachedAccessory.accessory;
			if (cachedAccessory.context.node_config["id"] == device["id"]){
				duplicate = true;
			}
		});

		if (!duplicate) {
			that.addAccessory(device, "device");
			that.log.info("Added device (%s, %s)", device["name"], device["id"]);
		}else{
			that.log.debug("Ignoring cached device (name: %s, id: %s)", device["name"], device["id"]);
		}
	});

	// Add scenes from config
	this.config.scenes.forEach(function(scene){

		var duplicate = false;
		that.accessories.forEach(function(cachedAccessory){
			cachedAccessory = cachedAccessory.accessory;
			if (cachedAccessory.context.node_config["id"] == scene["id"]){
				duplicate = true;
			}
		});

		if (!duplicate) {
			that.addAccessory(scene, "scene");
			that.log.info("Added scene (%s, %s)", scene["name"], scene["id"]);
		}else{
			that.log.debug("Ignoring cached device (name: %s, id: %s)", scene["name"], scene["id"]);
		}
	});

}


ISYHub.prototype.addAccessory = function(node_config, class_type) {
	
	var that = this;

	var uuid = UUIDGen.generate(node_config["name"]);
	var defaultAccessory = new Accessory(node_config["name"], uuid);

	defaultAccessory.context.class = class_type;
	defaultAccessory.context.node_config = node_config;

	var newAccessory = null;
	if (defaultAccessory.context.class == "device") {

		switch (defaultAccessory.context.node_config["type"]) {
			case "micro_dimmer":
				newAccessory = new DeviceMicroDimmer(this, defaultAccessory);
				break;
			case "micro_open_close":
				newAccessory = new DeviceMicroOpenClose(this, defaultAccessory);
				break;
			default:
				newAccessory = null;
		}
		
	}else if (defaultAccessory.context.class == "scene") {

		switch (defaultAccessory.context.node_config["type"]) {
			case "keypad_scene":
				defaultAccessory.context.trigger_node = [];
				newAccessory = new KeypadSceneAccessory(this, defaultAccessory);
				break;
			case "lightbulb":
				defaultAccessory.context.status_nodes = [];
				newAccessory = new SceneLightbulb(this, defaultAccessory);
				break;
			case "switch":
				defaultAccessory.context.status_nodes = [];
				newAccessory = new SceneSwitch(this, defaultAccessory);
				break;
			case "window_cover":
				defaultAccessory.context.status_nodes = [];
				newAccessory = new SceneWindowCover(this, defaultAccessory);
				break;
			default:
				newAccessory = null;
		}
	}

	if (newAccessory != null) {
		newAccessory.accessory.reachable = false;
		this.accessories.push(newAccessory);
		this.api.registerPlatformAccessories('homebridge-isy-hub', 'isy-hub', [newAccessory.accessory]);
		this.log.debug("Registered new accessory (name: %s, id: %s, class: %s, type: %s)", node_config["name"], node_config["id"], class_type, node_config["type"]);
	}else{
		this.log.error("Error adding %s (%s, %s)", class_type, node_config["name"], node_config["id"]);
	}
	
}


ISYHub.prototype.removeAccessory = function(accessory) {

	var that = this;

	var index = 0;
	this.accessories.forEach(function(_accessory){
		if (_accessory.accessory.context.node_config["id"] == accessory.context.node_config["id"]){
			that.accessories.splice(index, 1);
		}
		index++
	});

	this.api.unregisterPlatformAccessories('homebridge-isy-hub', 'isy-hub', [accessory]);
	this.log.debug("Unregisterd accessory (name: %s, id: %s, class: %s, type: %s)", accessory.displayName, accessory.context.node_config["id"],
					accessory.context.class, accessory.context.node_config["type"]);
}


ISYHub.prototype.updateAccessoriesReachability = function(accessory, enabled = true) {
	
	accessory.reachable = enabled;
	this.log.debug("Set reachability: %s (name: %s, id: %s, class: %s, type: %s)", enabled, accessory.displayName, accessory.context.node_config["id"], 
					accessory.context.class, accessory.context.node_config["type"]);

	if (!enabled) {
		this.log.warn("Accessory unreachable (name: %s, id: %s, class: %s, type: %s)", accessory.displayName, accessory.context.node_config["id"], 
					accessory.context.class, accessory.context.node_config["type"]);
	}

}


ISYHub.prototype.setup_socket = function() {
	
	var that = this;

	var connect = function(){
		
		var url = 'wss://' + that.config.host + '/rest/subscribe/';
		
		var ws = new WebSocket(url, 'ISYSUB', {
			protocolVersion: 13,
			origin: 'com.universal-devices.websockets.isy',
			headers : {
				'Authorization': 'Basic ' + Buffer.from(that.config.username + ':' + that.config.password).toString('base64')
			},
			rejectUnauthorized: false
		});

		var heartbeat_timeout;
		var refresh_interval;

		ws.on('open', function() {
			heartbeat_timeout = setTimeout(() => {
				ws.terminate();
			}, that.config.heartbeat_interval);

			that.get_device_nodes();
			that.get_scene_nodes();
			that.status_fetch()
			
			// Start status refresh loop
			refresh_interval = setInterval(() => { 
				that.get_device_nodes();
				that.get_scene_nodes();
				that.status_fetch();
			}, that.config.refresh_interval);

			that.log.info("Socket open, listening...");
		});

		ws.on('close', function() {
			clearTimeout(heartbeat_timeout);
			clearInterval(refresh_interval);

			setTimeout(connect, that.config.reconnect_interval);

			that.accessories.forEach(function(_accessory) {
				that.updateAccessoriesReachability(_accessory.accessory, false);
			});

			that.log.warn("Socket unreachable, attempting reconnect...");
		});

		ws.on('error', function(error) {
			that.log.debug("Socket error:\n%s", error);
		});

		ws.on('message', function (data) {
			
			var parser = new xml2js.Parser();
			parser.parseString(data, function (err, result) {

				if (result.Event != undefined){

					var action  = parseInt(result.Event.action[0]);
					var control = result.Event.control[0];

					if (action == 120 && control == "_0") {

						clearTimeout(heartbeat_timeout);
						heartbeat_timeout = setTimeout(() => {
							ws.terminate();
						}, that.config.heartbeat_interval);
					
					}else if (control == "ST") {
					
						try{
							
							var deviceIdParts = result.Event.node[0].trim().split(" ");
							var deviceId = "";
							var value = action;
							
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
							
						}catch{
							return;
						}

						that.accessories.forEach(function(_accessory) {

							if (_accessory.accessory.context.class == "scene" && 
								_accessory.accessory.context.node_config["type"] == "keypad_scene"){

								if (_accessory.accessory.context.trigger_node == deviceId){
									var statelessService = _accessory.getService(Service.StatelessProgrammableSwitch).getCharacteristic(Characteristic.ProgrammableSwitchEvent);
									if (value == 255){
										statelessService.setValue(0);
									}else{
										statelessService.setValue(0);
									}
								}

							}else{

								_accessory.accessory.context.status_nodes.forEach(function(node) {
									if (node['id'] == deviceId){
										node['value'] = value
									}
								});

								if (_accessory.accessory.reachable) {
									_accessory.updateState();
								}

							}

						});

					}
				}

			});
		});

	}

	connect();

}


ISYHub.prototype.status_fetch = function() {
	
	var that = this;

	var url = 'http://' + this.config.host + '/rest/status';
	request.get(url).auth(this.config.username, this.config.password, false)
	.then(function (parsedBody) {

		var parser = new xml2js.Parser();
		parser.parseString(parsedBody, function (err, result) {

			that.accessories.forEach(function(_accessory) {
				
				var found = false;

				// update status nodes
				_accessory.accessory.context.status_nodes.forEach(function(node) {
					result.nodes.node.forEach(function(_node) {

						try {
							var deviceIdParts = _node.$.id.trim().split(" ");
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

							var value = parseInt(_node.property[0].$.value);
						}catch{
							return;
						}
						
						if (node['id'] == deviceId) { 
							node['value'] = value;
							found = true;
						}

					});
				});

				if (found) {
					_accessory.updateState();
				}
				that.updateAccessoriesReachability(_accessory.accessory, found);
			});

		});
	})
	.catch(function (err) {
		that.log.debug("Status fetch error:\n%s", err);
	});

}


ISYHub.prototype.get_device_nodes = function() {
	
	var that = this;

	this.accessories.forEach(function(accessory) {
		accessory = accessory.accessory;

		if (accessory.context.class == "device") {
			accessory.context.status_nodes = [];
			accessory.context.status_nodes.push( {"id":accessory.context.node_config["id"], "value": null} );
		}

	});

}


ISYHub.prototype.get_scene_nodes = function() {
	
	var that = this;

	var url = 'http://' + this.config.host + '/rest/nodes/scenes';
	request.get(url).auth(this.config.username, this.config.password, false)
	.then(function (parsedBody) {

		var parser = new xml2js.Parser();
		parser.parseString(parsedBody, function (err, result) {

			result.nodes.group.forEach(function(group) {
				that.accessories.forEach(function(_accessory) {
					
					if (group.address == _accessory.accessory.context.node_config["id"] && 
						_accessory.accessory.context.class == "scene" && 
						_accessory.accessory.context.status_nodes != null) {

						_accessory.accessory.context.status_nodes = [];

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

							_accessory.accessory.context.status_nodes.push( {"id": deviceId, "value": null} );
						});
					}
				});

			});
		});
	})
	.catch(function (err) {
		that.log.debug("Get scene nodes error:\n%s", err);
	});

}