'use strict';

const dynamic = true;

const ISYPlatformModule = require('./lib/platform');
const ISYPlatform = ISYPlatformModule.ISYPlatform;

module.exports = function (homebridge) {
	ISYPlatformModule.setHomebridge(homebridge);
	homebridge.registerPlatform('homebridge-isy', 'ISY-994i', ISYPlatform, dynamic);
};
