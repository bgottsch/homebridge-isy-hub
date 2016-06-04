var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var fs = require('fs');

var tokenPath = __dirname + "/token.json";

var hostURL;

var username;
var password;
var clientID;
var accessToken;
var refreshToken;
var expirationTime;
var dateCreated;


function InsteonHub(username, password, clientID, hostURL) {
	
	if(!this.fileExists()) {
		return;
	}
	
	if(typeof hostURL === "undefined" || !(hostURL.endsWith(".com/"))) {
		console.log("Using default URL. Check instructions and custom URL for errors.");
		this.hostURL = "https://connect.insteon.com/";
	}else{
		this.hostURL = hostURL;
	}
	
	this.username = username; //client provided
	this.password = password; //client provided
	this.clientID = clientID; //client provided
	this.accessToken = ""; //server provided
	this.refreshToken = ""; //server provided
	this.expirationTime = 0; //server provided
	this.dateCreated = 0; //server provided
	
}

// working
InsteonHub.prototype.update = function(callback) {
	
	var main = this;
	
	var callbackFunciton = function() {
		
		var callbackFunctionInside = function () {
		
			var callbackFunctionInsideInside = function () {
				callback();
			};
			
			main.saveToken(callbackFunctionInsideInside);
		};
		
		var callbackFunctionInside2 = function () {
			callback();
		};
		
		var date = new Date().getTime() / (1000 * 60); // minutes since 1/1/1970
		var expired = (date - main.dateCreated + (0.025 * main.expirationTime) >= main.expirationTime) ? true:false; // 2.5% * 7200 = 180 -> 3h margin (arbitrary)
		
		if(typeof main.accessToken !== "string" || typeof main.refreshToken !== "string" || typeof main.expirationTime !== "number") {
			//console.log("No valid token found: getting new token");
			main.getTokenData(callbackFunctionInside);
		}else if(expired) {
			//console.log("Token expired: refreshing token");
			main.refreshTokenData(callbackFunctionInside);
		}else{
			//console.log("Valid token: using existing token");
			main.loadToken(callbackFunctionInside2);
		}
	};
	
	this.loadToken(callbackFunciton);
};

// working
InsteonHub.prototype.fileExists = function() {
	
	var exists;
	
	try {
		exists = fs.statSync(tokenPath).isFile();
	}catch (err){
		exists = false;
	}
	
	if(!exists) {
		console.log("Could not find token.json file. Creating a new one.");
		
		var obj = {};
		
		obj.access_token;
		obj.refresh_token;
		obj.expiration_time;
		obj.date_created;
		
		fs.writeFileSync(tokenPath, JSON.stringify(obj, null, 2), "utf8");
	}
	
	try {
		return fs.statSync(tokenPath).isFile();
	}catch (err){
		console.log("Unable to create file. Error:");
		console.log(err);
		return false;
	}
};

// working
InsteonHub.prototype.loadToken = function(callback) {
	
	if(!this.fileExists()) {
		return;
	}
	
	var obj = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
	
	this.accessToken = obj["access_token"];
	this.refreshToken = obj["refresh_token"];
	this.expirationTime = obj["expiration_time"];
	this.dateCreated = obj["date_created"];
	
	callback();
};

// working
InsteonHub.prototype.saveToken = function(callback) {
	
	if(!this.fileExists()) {
		return;
	}
	
	var obj = {};
	
	obj.access_token = this.accessToken;
	obj.refresh_token = this.refreshToken;
	obj.expiration_time = this.expirationTime;
	obj.date_created = this.dateCreated;
	
	fs.writeFileSync(tokenPath, JSON.stringify(obj, null, 2), "utf8");
	
	if(!(typeof callback === "undefined")) {
		callback();
	}
};

// working
InsteonHub.prototype.getTokenData = function(callback) {

	var main = this;

	var xmlhttp = new XMLHttpRequest();
	var url = this.hostURL + "api/v2/oauth2/token";
	var params = "grant_type=password&username=" + encodeURIComponent(this.username) + "&password=" + encodeURIComponent(this.password) + "&client_id=" + encodeURIComponent(this.clientID);
	
	xmlhttp.open("POST", url, true);
	xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	
	xmlhttp.onreadystatechange = function() {
		if(xmlhttp.readyState == 4 && xmlhttp.status == 200) {
		
			var arr = JSON.parse(xmlhttp.responseText);
			var seconds = new Date().getTime() / (1000 * 60);
			
			main.accessToken = arr["access_token"];
			main.refreshToken = arr["refresh_token"];
			main.expirationTime = arr["expires_in"];
			main.dateCreated = seconds;
			
			callback();
			
    	}else if(xmlhttp.readyState == 4) {
    		console.log("Error retrieving token");
    		callback();
    	}
	};
	
	xmlhttp.send(params);
};

// working
InsteonHub.prototype.refreshTokenData = function(callback) {
	
	var main = this;
	
	var xmlhttp = new XMLHttpRequest();
	var url = this.hostURL + "api/v2/oauth2/token";
	var params = "grant_type=refresh_token&refresh_token=" + encodeURIComponent(this.refreshToken) + "&client_id=" + encodeURIComponent(this.clientID);
	
	xmlhttp.open("POST", url, true);
	xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	
	xmlhttp.onreadystatechange = function() {
		if(xmlhttp.readyState == 4 && xmlhttp.status == 200) {
		
			var arr = JSON.parse(xmlhttp.responseText);
			var seconds = new Date().getTime() / (1000 * 60);
			
			main.accessToken = arr["access_token"];
			main.refreshToken = arr["refresh_token"];
			main.expirationTime = arr["expires_in"];
			main.dateCreated = seconds;
			
			callback();
			
    	}else if(xmlhttp.readyState == 4) {
    		console.log("Error retrieving token");
    		callback();
    	}
	};
	
	xmlhttp.send(params);
};

// working
InsteonHub.prototype.sendDeviceAction = function(deviceID, command, level, callback) {

	var main = this;

	var callbackFunciton = function() {

		var xmlhttp = new XMLHttpRequest();
		var url = main.hostURL + "api/v2/commands";
		var params = '{"command":"' + command + '", "level":' + level + ', "device_id":' + deviceID + '}';
	
		xmlhttp.open("POST", url, true);
		xmlhttp.setRequestHeader("Content-Type", "application/json");
		xmlhttp.setRequestHeader("Authentication", "APIKey " + main.clientID);
		xmlhttp.setRequestHeader("Authorization", "Bearer " + main.accessToken);
	
		xmlhttp.onreadystatechange = function() {
			if(xmlhttp.readyState == 4 && xmlhttp.status == 202) {
				var arr = JSON.parse(xmlhttp.responseText);
				callback.apply(arr);
			}else if(xmlhttp.readyState == 4 && xmlhttp.status != 202) {
				callback.apply(null);
				console.log("Error sending action");
			}
		}
	
		xmlhttp.send(params);
	};
	
	this.update(callbackFunciton);
};

// working
InsteonHub.prototype.sendSceneAction = function(sceneID, command, callback) {
	
	var main = this;

	var callbackFunciton = function() {
	
		var xmlhttp = new XMLHttpRequest();
		var url = main.hostURL + "api/v2/commands";
		var params = '{"command":"' + command + '", "scene_id":' + sceneID + '}';
	
		xmlhttp.open("POST", url, true);
		xmlhttp.setRequestHeader("Content-Type", "application/json");
		xmlhttp.setRequestHeader("Authentication", "APIKey " + main.clientID);
		xmlhttp.setRequestHeader("Authorization", "Bearer " + main.accessToken);
	
		xmlhttp.onreadystatechange = function() {
			if(xmlhttp.readyState == 4 && xmlhttp.status == 202) {
				var arr = JSON.parse(xmlhttp.responseText);
				callback.apply(arr);
			}else if(xmlhttp.readyState == 4 && xmlhttp.status != 202) {
				callback.apply(null);
				console.log("Error sending action");
			}
		}
	
		xmlhttp.send(params);
	};
	
	this.update(callbackFunciton);
};

// not implemented
InsteonHub.prototype.getDeviceStatus = function(deviceID, callback) {

	var main = this;

	var callbackFunciton = function() {
	
		var xmlhttp = new XMLHttpRequest();
		var url = main.hostURL + "api/v2/devices/" + deviceID;
	
		xmlhttp.open("GET", url, true);
		xmlhttp.setRequestHeader("Content-Type", "application/json");
		xmlhttp.setRequestHeader("Authentication", "APIKey " + main.clientID);
		xmlhttp.setRequestHeader("Authorization", "Bearer " + main.accessToken);
	
		xmlhttp.onreadystatechange = function() {
			if(xmlhttp.readyState == 4 && xmlhttp.status == 200) {
				//error with JSON Parse
				callback.apply(xmlhttp.responseText);
			}else if(xmlhttp.readyState == 4 && xmlhttp.status != 200) {
				callback.apply(null);
				console.log("Error retrieving status");
			}
		}
	
		xmlhttp.send();
	};
	
	this.update(callbackFunciton);
};

// not working
InsteonHub.prototype.getSceneStatus = function(sceneID, callback) {

	var main = this;

	var callbackFunciton = function() {
		
		var xmlhttp = new XMLHttpRequest();
		var url = main.hostURL + "api/v2/scenes/" + sceneID;
	
		xmlhttp.open("GET", url, true);
		xmlhttp.setRequestHeader("Content-Type", "application/json");
		xmlhttp.setRequestHeader("Authentication", "APIKey " + main.clientID);
		xmlhttp.setRequestHeader("Authorization", "Bearer " + main.accessToken);
	
		xmlhttp.onreadystatechange = function() {
			if(xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        		var arr = JSON.parse(xmlhttp.responseText);
      	  		callback.apply(arr);
    		}else if(xmlhttp.readyState == 4 && xmlhttp.status != 200) {
    			callback.apply(null);
    			console.log("Error retrieving status");
    		}
		};
		
		xmlhttp.send();
	};
	
	this.update(callbackFunciton);
};

// not working
InsteonHub.prototype.openStream = function(houseId, callback) {
	
	var main = this;
	
	var callbackFunciton = function() {
		
		var xmlhttp = new XMLHttpRequest();
		var url = main.hostURL + "api/v2/houses/" + houseId + "/stream";
	
		xmlhttp.open("GET", url, true);
		xmlhttp.setRequestHeader("Content-Type", "text/event-stream");
		xmlhttp.setRequestHeader("Authentication", "APIKey " + main.clientID);
		xmlhttp.setRequestHeader("Authorization", "Bearer " + main.accessToken);
	
		xmlhttp.onreadystatechange = function() {
			if(xmlhttp.readyState === 4) {
				console.log('Status:', xmlhttp.status);
				console.log('Headers:', xmlhttp.getAllResponseHeaders());
				console.log('Body:', xmlhttp.responseText);
        		var arr = JSON.parse(xmlhttp.responseText);
      	  		callback.apply(arr);
    		}else if(xmlhttp.readyState == 4) {
    			callback.apply(null);
    			console.log("Error retrieving status");
    		}
		};
		
		xmlhttp.send();
	};
	
};


InsteonHub.prototype.getScenes = function(callback) {
	
	var main = this;

	var callbackFunciton = function() {
	
		var xmlhttp = new XMLHttpRequest();
		var url = main.hostURL + "api/v2/scenes/";
	
		xmlhttp.open("GET", url, true);
		xmlhttp.setRequestHeader("Content-Type", "application/json");
		xmlhttp.setRequestHeader("Authentication", "APIKey " + main.clientID);
		xmlhttp.setRequestHeader("Authorization", "Bearer " + main.accessToken);
	
		xmlhttp.onreadystatechange = function() {
			if(xmlhttp.readyState == 4 && xmlhttp.status == 200) {
				var arr = JSON.parse(xmlhttp.responseText);
				callback(arr);
			}else if(xmlhttp.readyState == 4 && xmlhttp.status != 200) {
				callback.apply(null);
				console.log("Error sending action");
			}
		}
	
		xmlhttp.send();
	};
	
	this.update(callbackFunciton);
};

module.exports = InsteonHub;