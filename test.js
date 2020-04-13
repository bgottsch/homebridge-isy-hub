'use strict';

const request   = require('request-promise'),
	  xml2js    = require('xml2js'),
      WebSocket = require('ws');
    

const ws = new WebSocket('wss://10.0.1.64/rest/subscribe/', 'ISYSUB', {
    protocolVersion: 13,
    origin: 'com.universal-devices.websockets.isy',
    headers : {
        'Authorization': 'Basic ' + Buffer.from('beno' + ':' + 'Balad@812').toString('base64')
    },
    rejectUnauthorized: false
});

const parser = new xml2js.Parser();

ws.on('open', function () {
    console.log("open");
});

ws.on('error', function (error) {
    console.log(error);
});

ws.on('message', function (data) {
    parser.parseString(data, function (err, result) {
        if (result.Event != undefined){
            var action = parseInt(result.Event.action[0]);

            if (action == 3){
                var deviceIdParts = result.Event.eventInfo[0].split("]")[0].replace("[", "").trim().split(" ");
                var deviceId = "";
                deviceIdParts.forEach(function(part){
                    if (deviceIdParts.indexOf(part) != 3){
                        if (part.length == 1){
                            deviceId += '0' + part;
                        }else{
                            deviceId += part;
                        }
                    }else{
                        deviceId += part;
                    }
                    deviceId += ' ';
                });
                deviceId = deviceId.trim();

                var state = result.Event.eventInfo[0].split("ST")[1].trim();
                state = parseInt(state);

                console.log(deviceId, state);
            }
        }
    });
});