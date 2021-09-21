# homebridge-isy-hub

<span align="center">

[![npm-total-downloads](https://badgen.net/npm/dt/homebridge-isy-hub)](https://www.npmjs.com/package/homebridge-isy-hub)
[![npm-version](https://badgen.net/npm/v/homebridge-isy-hub)](https://www.npmjs.com/package/homebridge-isy-hub)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

</span>
<br />

```homebridge-isy-hub``` is a [Homebridge](https://homebridge.io) plugin that enables HomeKit support for [Insteon](https://www.insteon.com/) devices and scenes controlled by the [ISY-994i](https://www.universal-devices.com/product/isy994i/) hub.
<br />

This plugin finds all ```nodes``` linked to the [ISY-994i](https://www.universal-devices.com/product/isy994i/) hub and creates the corresponding HomeKit accessory - ```nodes``` are all ```Insteon scenes``` and ```Insteon devices``` paired to the hub. It also detects name and device type changes, so that changes to the [ISY-994i](https://www.universal-devices.com/product/isy994i/) ```nodes``` reflect automatically to HomeKit.
<br />

Further more, advanced features such as ```stateless_scenes``` can turn ```Inteon KeyPads``` into ```Stateless Programable Switches```, allowing native control and automation of HomeKit using wall buttons. To find more about advanced features go (here).
<br />
<br />

## Key Points

- **Easy setup** - automatic discovery and management of devices and scenes already linked to [ISY-994i](https://www.universal-devices.com/product/isy994i/)
- **Better automation support**, scenes can act as **Programable Stateless Switches**. This allows for **KeyPads** controlling the scene to act as real buttons in HomeKit.
- Usage of **REST API** for discovery and **WebSocket** to detect state changes
- Requires correct setup of the Insteon network and ISY-994i. Refer to [Insteon](https://www.insteon.com/) and [Universal Devices](https://www.universal-devices.com/) for more info.
- Please note, this is an unofficial plugin

<br />

## Supported Nodes

| ISY-994i Node                                                         | HomeKit Accessory                      | Description                                                                                                                                                              |
|-----------------------------------------------------------------------|----------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [Insteon Micro Dimmer](https://shelly.cloud/shelly1-open-source/)     | Lightbulb (dimmable)                   | Simple lightbulb with brightness                                                                                                                                         |
| [Insteon Micro Open/Close](https://shelly.cloud/shelly1-open-source/) | Window Covering                        | Simple window covering with level                                                                                                                                        |
| [Insteon Scenes](https://shelly.cloud/shelly1-open-source/)           | Switch or Stateless Programable Switch | If configured in the advanced setting of ```stateless_scenes```, it will act as a stateless switch, allowing automation. If left alone, will default to a regular switch |

<br />

## Supported Universal Devices Hubs

| Hub Model                                                      | Supported firmware version(s) |
|----------------------------------------------------------------|-------------------------------|
| [ISY-994i](https://www.universal-devices.com/product/isy994i/) |                               |

<br />
<br />

# Installation

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

<br />
<br />

# Configuration

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

<br />

## Parameters Definition

| **Parameter** | **Required** | **Data Type** | **Default** | **Description** | **Example** |
|---|---|---|---|---|---|
| name | yes | string | ISY Hub | Can be changed, affects logs mainly. |  |
| platform | yes | string | ISY Hub | DO NOT CHANGE! Used by homebrigde. |  |
| hostname | yes | string |   | Hostname or IP address of ISY-994i hub. |  |
| login | yes | string |   | Login for the ISY-994i hub. |  |
| password | yes | string |   | Password for the ISY-994i hub. |  |
| hidden_nodes | no | list of strings |   | Used to specify which devices or scenes should be hidden<br />from auto discovery. List of ```addresses``` as strings, even if<br />address is numeric. | ["12345", "AA BB CC 1"] |
| stateless_scenes | no | list of strings |   | Used to specify which scenes become Stateless<br />Programable Switches in HomeKit. If not specified, scene<br />will default to regular Switch. List of ```addresses``` as strings,<br />even if address is numeric. | ["12345", "5555"] |
| on_level_scenes | no | list of dicts |   | Used to specify the on level of a scene. Default for all<br />scenes is 255 (100%). Only change if on level is different.<br />List of dicts, each dict with keys: ```address``` and ```on_level```.<br />Key ```address``` is a string, even if address is numeric.<br />And key ```on_level``` is numeric (number from 0-255). | [{"address": "12345", "on_level": 76 }] |
| refresh_interval | no | integer | 60 | Time in seconds for the plugin to fetch all devices and<br />scenes via REST API. |  |
| reconnect_interval | no | integer | 30 | Time in seconds for the plugin to attempt a reconnect<br />if the WebSocket terminates. |  |
| heartbeat_interval | no | integer | 30 | Time in seconds for a heartbeat to be received from<br />the WebSocket. If no heartbeat is received, plugin will<br />attempt a reconnect. |  |
| rest_timeout | no | integer | 10 | Time in seconds for REST requests to timeout. |  |

<br />

## Full Example

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
