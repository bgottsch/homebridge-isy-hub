# homebridge-isy994i

[homebrige](https://github.com/nfarina/homebridge) platform plugin for Insteon Hub.

This plugin is an interface to expose Insteon Scenes avaliable in the ISY-994i hub to HomeKit. There are 3 possible types of scenes to be imported: light_scenes, toggle_scenes and window_scenes.

- light_scenes: used when the Insteon scene contains lights
- toggle_scene: used when the Insteon scene is a toggle button from a KeyPad Linc
- window_scene: used when a open/close module is in use, such as in blinds and curtains

# Installation

1. Install [homebrige](https://github.com/nfarina/homebridge) using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g bgottsch/homebridge-isy994i` (I still need to add this to npm)
3. Update your configuration file as instructed below.

# Usage:

For [homebrige](https://github.com/nfarina/homebridge) to use the plugin, you will need to add the following code in your `config.json` file. Refer to [homebridge's wiki](https://github.com/nfarina/homebridge/wiki) for more info.

Configuration sample:
```
{
    "platform" : "ISY-994i",
    "name" : "ISY-994i",
    "username": "username",
    "password": "password",
    "host": "10.0.1.2",
    "refresh_interval": 30000,
    "scenes": [
        { "name": "Light Scene", "id": 12345, "type": "light_scene" },
        { "name": "Toggle Scene", "id": 23456, "type": "toggle_scene", "on_level": 76 },
        { "name": "Window Scene", "id": 34567, "type": "window_scene" }
    ]
}
```
Fields:
- platform (required): Platform name recognized by homebridge (do not change)
- name (required): Name of the plugin
- username (required): ISY-994i username
- password (required): ISY-994i password
- host: IP address of the ISY-994i hub
- refresh_interval: time to refresh status in ms
- scenes: list of scenes. Types as listed below

  - light_scene: normal light scene
  - toggle_scene: for a keypad linc using a toggle button (on_level is used to determine if that toggle scene is active)
  - window_scene: scene containing a blind or curtain