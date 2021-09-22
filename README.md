# homebridge-isy-hub

[![npm-total-downloads](https://badgen.net/npm/dt/homebridge-isy-hub)](https://www.npmjs.com/package/homebridge-isy-hub)
[![npm-version](https://badgen.net/npm/v/homebridge-isy-hub)](https://www.npmjs.com/package/homebridge-isy-hub)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

**THIS BRANCH IS STILL IN BETA**

**homebridge-isy-hub** is a [Homebridge](https://homebridge.io) plugin that enables HomeKit support for [Insteon](https://www.insteon.com/) devices and scenes controlled by the [ISY-994i](https://www.universal-devices.com/product/isy994i/) hub.

This plugin finds all nodes linked to the [ISY-994i](https://www.universal-devices.com/product/isy994i/) hub and creates the corresponding HomeKit accessory. Nodes are all **Insteon scenes** and **Insteon devices** paired to the hub, that are supported by this plugin (see table below).

Changes to the [ISY-994i](https://www.universal-devices.com/product/isy994i/), such as adding, updating or removing nodes, replicate automatically to HomeKit. Further more, optional features such as **Stateless Scenes** can turn **Inteon KeyPads** into **Stateless Programable Switches**.

## Key Points

- **Easy setup** - automatic discovery and management of nodes linked to [ISY-994i](https://www.universal-devices.com/product/isy994i/).
- **Stateless Scenes** - scenes can act as **Programable Stateless Switches**. This allows **Insteon KeyPads** paired to that scene to act as buttons in HomeKit. See below for details.
- **Scene ON Level** - allows the ON level of a scene to be changed from the default (255 or 100%). This is useful to detect the state of a scene.
- Usage of the **REST API** for discovery and **WebSocket** for state change detection.
- Requires correct setup of the Insteon network and [ISY-994i](https://www.universal-devices.com/product/isy994i/). Refer to [Insteon](https://www.insteon.com/) and [Universal Devices](https://www.universal-devices.com/) for more info.
- Please note, this is an unofficial plugin. Some features might not work as expected. Please open an issue if found in such scenario.

## Supported Nodes

| ISY-994i Node | HomeKit Accessory | Description |
|---|---|---|
| [Insteon Micro Dimmer](https://www.insteon.com/dimmer-micro-module) | Lightbulb (dimmable) | Simple lightbulb with brightness. |
| [Insteon Micro Open/Close](https://www.insteon.com/open-close-micro-module) | Window Covering | Simple window covering with level. |
| [Insteon Scenes](https://wiki.universal-devices.com/index.php?title=ISY-99i/ISY-26_INSTEON:Scene) | Switch (default) or Stateless Programable Switch | If configured in the optional setting<br/>**Stateless Scenes**, a node will become<br/>a **Stateless Programable Switch** accessory,<br/>allowing for automation in HomeKit. If left<br/>untouched, nodes will default to a regular **Switch** accessory. |

## Supported Hubs

| Hub Model | Supported firmware version(s) |
|---|---|
| [ISY-994i](https://www.universal-devices.com/product/isy994i/) | 5.0.0 and up |

## Installation

1. Install Homebridge by following
   [the instructions](https://github.com/homebridge/homebridge/wiki).
2. After installing,

- if using [Homebridge Config UI X](https://github.com/oznu/homebridge-config-ui-x):
    1. Search for `isy hub` in the plugin page and install it.
    2. Follow on-screen instructions on how to setup.
    3. (optional) configure extra features of the plugin.
- if setup is manual:
    1. Run `npm install -g homebridge-isy-hub` to install it.
    2. Follow the instrcutions below to out find how to configure your `config.json`.

## Configuration

This plugin will auto discover nodes linked to the hub and that are supported.

If installed with [Homebridge Config UI X](https://github.com/oznu/homebridge-config-ui-x), this plugin can be configured using the GUI.

If configuring manually, below follows a minimal configuration sample with the required parameters only:

```json
"platforms": [
    {
        "name": "ISY Hub",
        "platform": "ISY Hub",
        "hostname": "192.168.x.x",
        "login": "LOGIN",
        "password": "PASSWORD"
    }
]
```

This minimal configuration is enough for the plugin to work.

For optional and advanced features, refer to the parameters definition below, and the subsequent explanation of all features.

### Parameters Definition

| **Parameter** | **Required** | **Data Type** | **Default** | **Details** |
|---|---|---|---|---|
| name | yes | string | ISY Hub | Can be changed, affects logs mainly. |
| platform | yes | string | ISY Hub | DO NOT CHANGE! Used by homebrigde. |
| hostname | yes | string |   | Hostname or IP address of ISY-994i hub. |
| login | yes | string |   | Login for the ISY-994i hub. |
| password | yes | string |   | Password for the ISY-994i hub. |
| hidden_nodes | no | list of strings |   | Used to specify which devices or scenes should<br/>be hidden from auto discovery. List of addresses<br/>as strings, even if address is numeric. |
| stateless_scenes | no | list of strings |   | Used to specify which scenes become **Stateless<br/>Programable Switches** in HomeKit. If not specified, scene will default to regular **Switch**. List of<br/>addresses as strings, even if address is numeric. |
| on_level_scenes | no | list of dicts |   | Used to specify the on level of a scene. Default ON<br/>level for all scenes is 255 (or 100%). Only change<br/>if on level is different. List of dicts, each dict with keys:<br/>> `address` - string, even if address is numeric.<br/>> `on_level` - numeric (number from 0-255). |
| refresh_interval | no | integer | 60 | Time in seconds for the plugin to fetch all nodes<br/>via REST API.<br/>*(minimum: 1)* |
| reconnect_interval | no | integer | 30 | Time in seconds for the plugin to attempt a<br/>reconnect if the WebSocket terminates.<br/>*(minimum: 10)* |
| heartbeat_interval | no | integer | 30 | Time in seconds for a heartbeat to be received<br/>from the WebSocket. If no heartbeat is received,<br/>plugin will attempt a reconnect.<br/>*(minimum: 25)* |
| rest_timeout | no | integer | 10 | Time in seconds for REST requests to timeout.<br/>*(minimum: 5)* |

### Full Example

```json
"platforms": [
    {
        "name": "ISY Hub",
        "platform": "ISY Hub",
        "hostname": "192.168.x.x",
        "login": "LOGIN",
        "password": "PASSWORD",
        "hidden_nodes": [
            "12345",
            "AA BB CC 1"
        ],
        "stateless_scenes": [
            "12345",
            "5555"
        ],
        "on_level_scenes": [
            {
                "address": "44444",
                "on_level": 76
            },
            {
                "address": "9090",
                "on_level": 76
            }
        ],
        "refresh_interval": 60,
        "reconnect_interval": 30,
        "heartbeat_timeout": 30,
        "rest_timeout": 10
    }
]
```

## Optional Settings

### Hidden Nodes

Hides nodes from the auto discovery. If a node already exists, and then is added here, it will be removed (and if removed here, will be added by auto discovery).
Requires changing the parameter `hidden_nodes`, which expects a list of node addresses as **strings**.

### Stateless Scenes

Allows nodes that are **Insteon Scenes** to act as **Stateless Programable Switches** in HomeKit. The main use of this feature is in combination with **Insteon KeyPads**. Although not directly supported, if an **Insteon Keypad** is linked to a Stateless Scene, it will act as a button in HomeKit. The accessory comes with two actions (buttons presses), the first one for `ON` and the second one for `OFF`. These actions can than be configured to control HomeKit in various ways. Requires changing the parameter `stateless_scenes`, which expects a list of node addresses as **strings**.

### Scene ON Level

Allows nodes that are **Insteon Scenes** to adjust their `ON` level. By default, nodes will consider `ON` the value `255` (or 100%). This value can be changed here if a scene is considered `ON` on a level different than `255`. If multiple devices in a scene dim to different levels, the `ON` level for that scene should be the average of the device's `ON` level. Requires changing the parameter `on_level_scenes`, which expects a list of dicts, each dict composed of two keys:

- `address` - a scene node address as a **string**
- `on_level` - an **integer** between `0` and `255`.

## Advances Settings

### Refresh Interval

Time in **seconds** for the plugin to refresh the devices via REST API. This is what enables the auto discovery. If the WebSocket is closed, it is disabled. And when open renabled. Minimum of **1 second**.

### Reconnect Interval

Time in **seconds** for the plugin to attempt a reconnect of the WebSocket if it closes or exits with an error. Minimum of **10 seconds**.

### Heartbeat Timeout

Time in seconds for a heartbeat to be received from the WebSocket when it is open. If the timeout expires, a reconnect is imediatelly attempted. This is paired to what is emitted by the hub (wiht some margin), change with caution. Minimum of **25 seconds**.

### REST Timeout

Time in seconds for REST API requests to timeout. Minimum of **5 seconds**.

## Development

This plugin was based on the [homebridge-plugin-template](https://github.com/homebridge/homebridge-plugin-template) repo, thus allowing live code changes. To setup, clone this repo, and configure homebridge to start with the option `-P <PATH_TO-homebridge-isy-hub`. Further more, to use live code, run `npm run watch`. Sudo might be required.

For further instructions on the Homebridge API, refer to documentation.

## License

Apache 2.0
