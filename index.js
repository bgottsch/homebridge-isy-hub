'use strict';

module.exports = function (homebridge) {
	let ISYHub = require('./lib/ISYHub')(homebridge);
	homebridge.registerPlatform('homebridge-isy-hub', 'isy-hub', ISYHub, true);
};
