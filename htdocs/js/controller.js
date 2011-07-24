function Controller(user) {
	// PUBLIC
        this.register = function(type, fn) {
                if(handlers[type] == undefined) { handlers[type] = []; }
                handlers[type].push(fn);
        };

	this.socket = function() {
		return socketio;
	}

	// PRIVATE
	var handlers = {};

	function on_connect() {
		if(!$.cookie('uuid')) {
			$.cookie('uuid', generateUuid());
		}
		socketio.emit('JOIN',
			$.cookie('uuid')
			,$.cookie('name')
			);
	}

	function on_disconnect() {
		$('#error')
			.hide()
			.html('Attempting to reconnect...')
			.fadeIn(1500);
	}

	function on_failure() {
		$('#error').html('Unable to connect; please refresh your browser');
	}

	function on_reconnect(transport_type,attempt) {
		$('#error')
			.html('Reconnected after '+attempt+' attempts.')
			.delay(2000)
			.fadeOut(1500, function() {
				$(this).html('').show();
			});
	}

	function on_reconnecting(delay,attempt) {
		if(attempt>3) {
			$('#error').html('Attempt #'+attempt
//				+'/'+socketio.options['max reconnection attempts']
 				+' to reconnect;'
				+' will try again in '+calcDuration(delay)
			);
		}
	}

	// initialize socket.io
	var socketio = io.connect();
	socketio.on('connect', on_connect);
	socketio.on('connect_failed', on_failure);
	socketio.on('disconnect', on_disconnect);
	socketio.on('reconnect', on_reconnect);
	socketio.on('reconnecting', on_reconnecting);
	socketio.on('reconnect_failed', on_failure);

	// PRIVILEGED
	soundManager.onready(function() { socketio.emit('READY'); });
}
