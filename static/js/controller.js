function Controller(user) {
	// PUBLIC

	// PRIVATE
	var handlers = {};
	var self     = this;
	var socket   = null;
	var uuid     = $.cookie('uuid');
	var reconnectTimeout = 1;

	function connect(data) {
		$('#error').html('');
		if(!uuid) {
			uuid = generateUuid();
    			$.cookie('uuid', uuid);
		}
		socket.send({type:'USER', uuid:uuid, name:$.cookie('name')});
	  }

	function disconnect(data) {
		$('#error').html('Attempting to reconnect...');
		socket.disconnect();
		socket.connect();
	}

	function message(data) {
		//log(data);
		if(handlers[data.type] != undefined) {
			for(var i in handlers[data.type]) {
				handlers[data.type][i](data);
			}
		}
	}

	// PRIVILEGED
	this.register = function(type, fn) {
		if(handlers[type] == undefined) { handlers[type] = []; }
		handlers[type].push(fn);
	};

	this.send = function(message) {
		socket.send(message);
	};

	// initialize
	socket = new io.Socket();
	socket.on('connect', function(data) { connect(data); });
	socket.on('connect_failed', function(data) { disconnect(data); });
	socket.on('disconnect', function(data) { disconnect(data); });
	socket.on('message', function(data) { message(data); });
	socket.connect();

	soundManager.onready(function() { socket.send({type:'READY'}); });
}
