# homebridge-isy-hub

[![npm-total-downloads](https://badgen.net/npm/dt/homebridge-isy-hub)](https://www.npmjs.com/package/homebridge-isy-hub)
[![npm-version](https://badgen.net/npm/v/homebridge-isy-hub)](https://www.npmjs.com/package/homebridge-isy-hub)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

`homebridge-isy-hub` is a [Homebridge](https://homebridge.io) plugin that enables HomeKit support for [Insteon](https://www.insteon.com/) devices and scenes controlled by the [ISY-994i](https://www.universal-devices.com/product/isy994i/) hub.

This plugin finds all `nodes` linked to the [ISY-994i](https://www.universal-devices.com/product/isy994i/) hub and creates the corresponding HomeKit accessory. `nodes` are all **Insteon scenes** and **Insteon devices** paired to the hub, that are supported by this plugin (see table below).

Changes to the [ISY-994i](https://www.universal-devices.com/product/isy994i/) `nodes`, such as adding, updating or removing, reflect automatically to HomeKit. Further more, optional features such as `stateless_scenes` can turn **Inteon KeyPads** into **Stateless Programable Switches**, allowing native control and automation of HomeKit using wall buttons.

## Key Points

- **Easy setup** - automatic discovery and management of `nodes` linked to [ISY-994i](https://www.universal-devices.com/product/isy994i/).
- Scenes can act as **Programable Stateless Switches**. This allows **Insteon KeyPads** paired to that scene to act as buttons in HomeKit, for example. See below for details.
- Usage of the **REST API** for discovery and **WebSocket** for state change detection.
- Requires correct setup of the Insteon network and [ISY-994i](https://www.universal-devices.com/product/isy994i/). Refer to [Insteon](https://www.insteon.com/) and [Universal Devices](https://www.universal-devices.com/) for more info.
- Please note, this is an unofficial plugin. Some features might not work as expected. Please open an issue if found in such scenario.

## Supported Nodes

| ISY-994i Node                                                         | HomeKit Accessory                      | Description                                                                                                                                                              |
|-----------------------------------------------------------------------|----------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [Insteon Micro Dimmer](https://shelly.cloud/shelly1-open-source/)     | Lightbulb (dimmable)                   | Simple lightbulb with brightness                                                                                                                                         |
| [Insteon Micro Open/Close](https://shelly.cloud/shelly1-open-source/) | Window Covering                        | Simple window covering with level                                                                                                                                        |
| [Insteon Scenes](https://shelly.cloud/shelly1-open-source/)           | Switch (default) or Stateless Programable Switch | If configured in the optional setting `stateless_scenes`, a scene will become a Stateless Programable Switch accessory, allowing for automation in HomeKit. If left untouched, scenes will default to a regular Switch accessory|

## Supported Hubs

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
    2. Follow the instrcutions below to out find how to configure your `config.json`.

## Configuration

This plugin will **auto discover** `nodes` registered to ISY and that are **supported**.

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
| hidden_nodes | no | list of strings |   | Used to specify which devices or scenes should<br/>be hidden from auto discovery. List of addresses<br/>as strings, even if address is numeric. |
| stateless_scenes | no | list of strings |   | Used to specify which scenes become **Stateless<br/>Programable Switches** in HomeKit. If not specified, scene will default to regular **Switch**.<br/>List of addresses as strings, even if address is<br/>numeric. |
| on_level_scenes | no | list of dicts |   | Used to specify the on level of a scene. Default for<br/>all scenes is 255 (100%). Only change if on level is<br/>different. List of dicts, each dict with keys:<br/>`address` - string, even if address is numeric<br/>`on_level` - numeric (number from 0-255). |
| refresh_interval | no | integer | 60<br/>(min: 1) | Time in seconds for the plugin to fetch all `nodes`<br/>via REST API. |
| reconnect_interval | no | integer | 30<br/>(min: 10) | Time in seconds for the plugin to attempt a<br/>reconnect if the WebSocket terminates. |
| heartbeat_interval | no | integer | 30<br/>(min: 25) | Time in seconds for a heartbeat to be received<br/>from the WebSocket. If no heartbeat is received,<br/>plugin will attempt a reconnect. |
| rest_timeout | no | integer | 10<br/>(min: 5) | Time in seconds for REST requests to timeout. |

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

Hides `nodes` from the auto discovery. If a `node` already exists, and then is added here, it will be removed (and if removed here, will be added by auto discovery).
Requires changing the parameter `hidden_nodes`, which expects a list of `node` addresses as strings.

### Stateless Scenes

Allows `nodes` that are **Insteon Scenes** to act as **Stateless Programable Switches** in HomeKit. The main use of this feature is in combination with **Insteon KeyPads**. Although not directly supported, if linked to a `stateless scene`, it will act as a button in HomeKit. This button enables two actions (buttons presses), the first one for ON and the second one for OFF. These actions can than be configured to control HomeKit in various ways. Requires changing the parameter `stateless_scenes`, which expects a list of `scene node` addresses as strings.

### Scene ON Level

Allows `nodes` that are **Insteon Scenes** to adjust their ON level. By default, all `scene node` will consider ON the value 255 (100% in Insteon). This value can be changed here if a Scene is considered ON on a level different than 255. If multiple devices in a scene dim to different levels, the ON level for the scene should the average of the device's ON level. Requires changing the parameter `on_level_scenes`, which expects a list of dicts, each dict composed of two keys: `address` and `on_level`. `address` is a `scene node` addresse as string and `on_level` is an integer between 0 and 255.

## Advances Settings

### Refresh Interval

### Reconnect Interval

### Heartbeat Timeout

### REST Timeout
