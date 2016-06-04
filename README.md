# homebridge-insteonScene

[homebrige](https://github.com/nfarina/homebridge) platform plugin for Insteon Hub Scenes

# Installation

1. Install [homebrige](https://github.com/nfarina/homebridge) using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g bgottsch/homebridge-insteonScene`
3. Update your configuration file as instructed below.

# Usage:

For [homebrige](https://github.com/nfarina/homebridge) to use the plugin, you will need to add the following code in your `config.json` file. Refer to [homebridge's wiki](https://github.com/nfarina/homebridge/wiki) for more info.

Also, you will need to request an API Key from Insteon. Please refer to [Insteon](http://www.insteon.com/become-an-insteon-developer) for more details.

Configuration sample:
```
"platforms": [
  {
    "platform" : "InsteonScene",
    "name" : "InsteonScene",
    "username": "username",
    "password": "password",
    "client_id": "APIKey",
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
- black_list (optional): A list of Scenes to be excluded (each item is a Scene. A scene can be recognized by it's name or ID)
- host (optional): The Insteon Hub API's host address