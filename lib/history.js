// holds chat and queue history
var chat = []
	,queue = []
	,theme = ''
	;

var socketio = null;

var timer = setTimeout(housekeeping, 60000);

exports.enqueueChat = function(type, message) {
	chat.push([new Date().getTime(), type, message]);
}

exports.enqueueSong = function(song) {
	queue.push([new Date().getTime(), song]);
}

exports.setTheme = function(text) {
	theme = text;
	socketio.sockets.emit('THEME', theme);
}

exports.get = function() {
	return {
		chat:chat
		,queue:queue
	};
};

exports.getTheme = function() {
	return theme;
}

exports.send = housekeeping;

exports.setSocketIO = function(io) {
        socketio = io;
}

function housekeeping() {
	if(chat.length > 100) {
		chat.splice(0, chat.length-100);
	}
	if(queue.length > 25) {
		queue.splice(0, queue.length-25);
	}
	if(socketio) {
		socketio.sockets.emit('HISTORY', {
			chat:chat
			,queue:queue
		});
	}
	if(timer) {
		clearTimeout(timer);
	}
	timer = setTimeout(housekeeping, 60000);
}
