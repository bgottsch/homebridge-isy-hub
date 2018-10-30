'use strict';

var request = require('request-promise'),
	xml2js  = require('xml2js');

const LightSceneAccessoryModule = require('./light_scene.js');
const LightSceneAccessory = LightSceneAccessoryModule.LightSceneAccessory;

const ToggleSceneAccessoryModule = require('./toggle_scene.js');
const ToggleSceneAccessory = ToggleSceneAccessoryModule.ToggleSceneAccessory;

const WindowSceneAccessoryModule = require('./window_scene.js');
const WindowSceneAccessory = WindowSceneAccessoryModule.WindowSceneAccessory;

const packageConfig = require('../package.json');


var Accessory, Service, Characteristic, UUIDGen;


function setHomebridge(homebridge) {

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

    	if (config == null) {
    		this.api.disabled = true;
    		return;
    	}

    	this.config = {
    		platform: config["platform"],
    		name: config["name"],
			username: config["username"] || "admin",
			password: config["password"] || "admin",
			host: config["host"] || "192.168.0.50",
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

				that.accessories.forEach(function(cachedAccessory){
					var shouldRemove = true;
					that.config.scenes.forEach(function(scene) {
						if (cachedAccessory.displayName == scene.name){
							shouldRemove = false;
						}
						if (cachedAccessory.context.id == scene.id){
							shouldRemove = false;
						}
					});
					if (shouldRemove) {
						that.log("Removing cached accessory not found on config (%s, %s)", cachedAccessory.displayName, cachedAccessory.context.id);
						that.removeAccessory(cachedAccessory.context.id);
					}
				});

				that.config.scenes.forEach(function(scene){
					var update = false;
					that.accessories.forEach(function(cachedAccessory){
						if (cachedAccessory.displayName == scene.name && cachedAccessory.context.id == scene.id){
							if (cachedAccessory.context.type != scene.type || cachedAccessory.context.onLevel != scene.on_level){
								update = true;
							}
						}
					});
					if (update) {
						that.log("Updating accessory... (%s, %s)", scene.name, scene.id);
						that.removeAccessory(scene.id);
						that.addAccessory(scene);
					}
				});

				that.config.scenes.forEach(function(scene){

					var duplicate = false;

					that.accessories.forEach(function(cachedAccessory){

						if (cachedAccessory.context.id == scene.id){
							duplicate = true;
							return;
						}
						if (cachedAccessory.displayName == scene.name){
							duplicate = true;
							return;
						}
					});

					if (!duplicate) {
						if (scene.name == null || scene.id == null || scene.type == null) {
							that.log("Wrong scene declaration (%s)", scene);
						}else{
							that.addAccessory(scene);
						}
					}else{
						that.log.debug("Ignoring cached device (name: %s, id: %s)", scene.name, scene.id);
					}
				});

				setInterval(function(){ that.status_fetch() }, that.config.refresh_interval);

			}.bind(this));
		}
	}

	configurationRequestHandler(context, request, callback) {
		return;
	}

	configureAccessory(accessory) {

		var that = this;
		var duplicate = false;

		this.accessories.forEach(function(cachedAccessory){
  			if (cachedAccessory.UUID == accessory.UUID){
  				that.log("Configure accessory error: device with UUID %s already exists!", accessory.UUID);
  				duplicate = true;
  				return;
  			}
  			if (cachedAccessory.displayName == accessory.displayName){
  				that.log("Configure accessory error: device with name %s already exists!", accessory.displayName);
  				duplicate = true;
  				return;
  			}
  			if (cachedAccessory.context.id == accessory.context.id){
  				that.log("Configure accessory error: device with id %s already exists!", accessory.context.id);
  				duplicate = true;
  				return;
  			}
		});

		this.config.scenes.forEach(function(configAccessory){
			if (configAccessory['name'] == accessory.displayName) {
				if (accessory.context.id != configAccessory['id'] || accessory.context.type != configAccessory['type']) {

					that.log.info('Updated config of cached device "%s" from: (%s, %s) to: (%s, %s)', accessory.displayName, accessory.context.id,
						accessory.context.type, configAccessory['id'], configAccessory['type']);

					accessory.context.id = configAccessory['id'];
					accessory.context.type = configAccessory['type'];
				}
				return;
			}
		});

		if (!duplicate) {

			var cachedAccessory = null;

			switch (accessory.context.type) {
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

			if (cachedAccessory != null) {

				cachedAccessory.reachable = true;

				this.accessories.push(cachedAccessory);
				this.log("Adding cached device (%s, %s)", accessory.displayName, accessory.context.id);
			}
		}else{
			this.log("Ignoring duplicate cached accessory (%s, %s)", accessory.displayName, accessory.context.id);
		}
	}

	addAccessory(scene) {

		var that = this;
		var duplicate = false;

		this.accessories.forEach(function(cachedAccessory){
  			if (cachedAccessory.displayName == scene.name){
  				that.log("Configure accessory error: device with name %s already exists!", accessory.displayName);
  				duplicate = true;
  				return;
  			}
  			if (cachedAccessory.context.id == scene.id){
  				that.log("Configure accessory error: device with id %s already exists!", accessory.context.id);
  				duplicate = true;
  				return;
  			}
		});

		if (!duplicate) {
			this.log("Adding accessory (%s, %s)", scene.name, scene.id);

			var uuid = UUIDGen.generate(scene.name);
			var defaultAccessory = new Accessory(scene.name, uuid);

			defaultAccessory.context.id = scene.id;
			defaultAccessory.context.type = scene.type;

			var newAccessory = null;

			switch (defaultAccessory.context.type) {
				case "light_scene":
					newAccessory = new LightSceneAccessory(this, defaultAccessory).accessory;
					break;
				case "toggle_scene":
					if (scene.on_level == null){
						newAccessory = null;
						break;
					}
					defaultAccessory.context.onLevel = scene.on_level;
					newAccessory = new ToggleSceneAccessory(this, defaultAccessory).accessory;
					break;
				case "window_scene":
					newAccessory = new WindowSceneAccessory(this, defaultAccessory).accessory;
					break;
				default:
					newAccessory = null;
			}

			if (newAccessory != null) {

				newAccessory.reachable = true;

				this.accessories.push(newAccessory);
				this.api.registerPlatformAccessories('homebridge-isy994i', 'ISY-994i', [newAccessory]);
			}else{
				this.log.error("Wrong scene declaration! (%s, %s)", scene.name, scene.id);
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
						accessory.context.status = node_status;
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
