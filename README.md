# homebridge-isy-hub

<span align="center">

[![npm-total-downloads](https://badgen.net/npm/dt/homebridge-isy-hub)](https://www.npmjs.com/package/homebridge-isy-hub)
[![npm-version](https://badgen.net/npm/v/homebridge-isy-hub)](https://www.npmjs.com/package/homebridge-isy-hub)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

</span>

```homebridge-isy-hub``` is a [Homebridge](https://homebridge.io) plugin that enables HomeKit support for [Insteon](https://www.insteon.com/) devices and scenes controlled by the [ISY-994i](https://www.universal-devices.com/product/isy994i/) hub.

This plugin finds all ```nodes``` linked to the [ISY-994i](https://www.universal-devices.com/product/isy994i/) hub and creates the corresponding HomeKit accessory - ```nodes``` are all ```Insteon scenes``` and ```Insteon devices``` paired to the hub. It also detects name and device type changes, so that changes to the [ISY-994i](https://www.universal-devices.com/product/isy994i/) ```nodes``` reflect automatically to HomeKit.

Further more, optional features such as ```stateless_scenes``` can turn ```Inteon KeyPads``` into ```Stateless Programable Switches```, allowing native control and automation of HomeKit using wall buttons.

## Key Points

- **Easy setup** - automatic discovery and management of devices and scenes already linked to [ISY-994i](https://www.universal-devices.com/product/isy994i/)
- **Better automation support**, scenes can act as **Programable Stateless Switches**. This allows for **KeyPads** controlling the scene to act as real buttons in HomeKit.
- Usage of **REST API** for discovery and **WebSocket** to detect state changes
- Requires correct setup of the Insteon network and ISY-994i. Refer to [Insteon](https://www.insteon.com/) and [Universal Devices](https://www.universal-devices.com/) for more info.
- Please note, this is an unofficial plugin

## Supported Nodes

| ISY-994i Node                                                         | HomeKit Accessory                      | Description                                                                                                                                                              |
|-----------------------------------------------------------------------|----------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [Insteon Micro Dimmer](https://shelly.cloud/shelly1-open-source/)     | Lightbulb (dimmable)                   | Simple lightbulb with brightness                                                                                                                                         |
| [Insteon Micro Open/Close](https://shelly.cloud/shelly1-open-source/) | Window Covering                        | Simple window covering with level                                                                                                                                        |
| [Insteon Scenes](https://shelly.cloud/shelly1-open-source/)           | Switch or Stateless Programable Switch | If configured in the advanced setting of ```stateless_scenes```, it will act as a stateless switch, allowing automation. If left alone, will default to a regular switch |

## Supported Universal Devices Hubs

| Hub Model                                                      | Supported firmware version(s) |
|----------------------------------------------------------------|-------------------------------|
| [ISY-994i](https://www.universal-devices.com/product/isy994i/) |                               |

## Installation

1. Install Homebridge by following
   [the instructions](https://github.com/homebridge/homebridge/wiki).
2. After installing,

- if using [Homebridge Config UI X](https://github.com/oznu/homebridge-config-ui-x):
    1. Search for `homebridge-isy-hub` in the plugin page and install it.
    2. Follow on-screen instructions on how to setup.
    3. (optional) configure advanced options in the plugin page.
- if setup is manual:
    1. Run `npm install -g homebridge-isy-hub` to install it.
    2. Follow the instrcutions below to out find how to configure your ```config.json```.

## Configuration

This plugin will **auto discover** ```nodes``` registered to ISY and that are **supported**.

To configure if installing with [Homebridge Config UI X](https://github.com/oznu/homebridge-config-ui-x), a setup guide should appear on install. Follow the GUI instructions. For further customization of the advanced features, refer to the parameters definition below.

If configuring manually, below follows a **minimal** configuration sample with the required parameters only:

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

This minimal configuration is enough for the plugin to work and to auto discover ```nodes```

### Parameters Definition

| **Parameter** | **Required** | **Data Type** | **Default** | **Details** |
|---|---|---|---|---|
| name | yes | string | ISY Hub | Can be changed, affects logs mainly. |
| platform | yes | string | ISY Hub | DO NOT CHANGE! Used by homebrigde. |
| hostname | yes | string |   | Hostname or IP address of ISY-994i hub. |
| login | yes | string |   | Login for the ISY-994i hub. |
| password | yes | string |   | Password for the ISY-994i hub. |
| hidden_nodes | no | list of strings |   | Used to specify which devices or scenes should be hidden from auto discovery. List of addresses as strings, even if address is numeric. |
| stateless_scenes | no | list of strings |   | Used to specify which scenes become Stateless Programable Switches in HomeKit. If not specified, scene will default to regular Switch. List of addresses as strings, even if address is numeric. |
| on_level_scenes | no | list of dicts |   | Used to specify the on level of a scene. Default for all scenes is 255 (100%). Only change if on level is different. List of dicts, each dict with keys: ```address``` and ```on_level```. ```address``` is a string, even if address is numeric. ```on_level``` is numeric (number from 0-255). |
| refresh_interval | no | integer | 60 (min: 1) | Time in seconds for the plugin to fetch all devices and scenes via REST API. |
| reconnect_interval | no | integer | 30 (min: 10) | Time in seconds for the plugin to attempt a reconnect if the WebSocket terminates. |
| heartbeat_interval | no | integer | 30 (min: 25) | Time in seconds for a heartbeat to be received from the WebSocket. If no heartbeat is received, plugin will attempt a reconnect. |
| rest_timeout | no | integer | 10 (min: 5) | Time in seconds for REST requests to timeout. |

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
