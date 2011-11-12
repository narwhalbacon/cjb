var util = require('util');

var cjbutil = require('cjbutil');
	names = require('names');
	;

var sessions = {};		// holds all socket.io sessions

exports.count = function() {
	return Object.keys(sessions).length;
}

exports.create = function(socketid) {
	var session = {name:names.generate(), uuid:null};
	sessions[socketid] = session;
	return session;
}

exports.destroy = function(socketid) {
	delete sessions[socketid];
}

exports.get = function() {
	var result = {};
	for(var i in sessions) {
		result[sessions[i].uuid] = sessions[i].name;
	}
	return result;
}

exports.is_valid = function(uuid) {
	for(var i in sessions) {
		if(sessions[i].uuid == uuid) {
			return true;
		}
	}
	return false;
}
