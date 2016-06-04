# homebridge-insteonScene

[homebrige](https://github.com/nfarina/homebridge) platform plugin for Insteon Hub.

This plugin interprets scenes and open/close modules. Each scene can be turned on or off. Each open/close module can be closed or opened.

Open/close modules should be configures as scenes in Insteon (simply add the module to a scene), and they should be added to the `window_scenes` parameter. There you specify each item as window scene with its name or Scene ID. You can add as many as you want.

The `black_list` parameter works exactly as the `window_scenes` parameter, but instead of adding a specific type, the exclude scenes. You can also add as many as you want.

# Installation

1. Install [homebrige](https://github.com/nfarina/homebridge) using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g bgottsch/homebridge-insteonScene` (I still need to add this to npm)
3. Run `sudo chmod 777 /usr/local/lib/node_modules/homebridge-insteonScene/` to allow the plugin to create a token to store the Insteon API keys (I don't understand much of chmod, so if anyone has a better solution please create an issue)
4. Update your configuration file as instructed below.

# Usage:

For [homebrige](https://github.com/nfarina/homebridge) to use the plugin, you will need to add the following code in your `config.json` file. Refer to [homebridge's wiki](https://github.com/nfarina/homebridge/wiki) for more info.

Also, you will need to request an API Key from Insteon. Please refer to [Insteon](http://www.insteon.com/become-an-insteon-developer) for more details.

Configuration sample:
```
"platforms": [
  {
    "platform" : "InsteonScene",
    "name" : "Insteon Scene",
    "username": "username",
    "password": "password",
    "client_id": "APIKey",
	"window_scenes": ["scene_name", "scene_id"],
    "black_list": ["scene_name", "scene_id"],
    "host": "https://connect.insteon.com/"
  }
]
```
Fields:
- platform (required): Platform name recognized by homebridge (do not change)
- name (required): Name of the plugin
- username (required): Insteon account username (same as used to login into the Insteon App)
- password (required): Insteon account password (same as used to login into the Insteon App)
- client_id (required): The API Key provided by [Insteon](http://www.insteon.com/become-an-insteon-developer) (you will need to request an API Key for the plugin to work)
- window_scenes (optional): A list of scenes which should be considered window covers for open/close modules
- black_list (optional): A list of Scenes to be excluded (each item is a Scene. A scene can be recognized by it's name or ID)
- host (optional): The Insteon Hub API's host address