'use strict';

const dynamic = true;

const ISY994PlatformModule = require('./lib/platform');
const ISY994Platform = ISY994PlatformModule.ISY994Platform;

module.exports = function (homebridge) {
	ISY994PlatformModule.setHomebridge(homebridge);
	homebridge.registerPlatform('homebridge-isy994i', 'ISY-994i', ISY994Platform, dynamic);
};
