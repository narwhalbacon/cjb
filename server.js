#!/usr/bin/env node

//setup Dependencies
require(__dirname + "/lib/setup")
        .ext( __dirname + "/lib");

var express = require('express')
	,formidable = require('formidable')
	,fs = require('fs')
	,io = require('socket.io')
	,util = require('util')
	;

// cjb stuff
var cjbutil = require('cjbutil')
	,config = require('cjbconfig')
	,history = require('history')
	,names = require('names')
	,sessions = require('sessions')
	,queue = require('queue')
	;

var state = {			// holds the current state of things
	scnt: 0
	,qcnt: 0
	,qlen: '0:00'
	,tcnt: 0
	,tlen: 0
};



// clean up any old data
var directories = ['/htdocs/images/', '/htdocs/music/', '/uploads/'];
for(var i in directories) {
	var files = fs.readdirSync(__dirname+directories[i]);
	for(j in files) {
		if(files[j] != 'nocover.jpg' &&
		  files[j] != '.gitignore') {
			cjbutil.unlinkFile(__dirname+directories[i]+files[j]);
		}
	};
}

var app = express.createServer();
app.use(express.logger());
app.use(express.bodyParser());
app.use(express.cookieParser());

app.configure(function() {
	app.use(express.static(__dirname + '/htdocs'));
	app.use(express.errorHandler({
		dumpExceptions: true
		,showStack: true
	}));
});

var socketio = io.listen(app);
socketio.enable('browser client minification');
socketio.enable('browser client etag');
socketio.set('log level', 1);
socketio.configure('development', function() {
	socketio.disable('browser client minification');
	socketio.disable('browser client etag');
	socketio.set('log level', 3);
});

app.listen(config.server.port);

// add our own little function
socketio.cjbnotify = function(message) {
	history.enqueueChat('NOTICE', message);
	this.sockets.emit('NOTICE', message);
}

history.setSocketIO(socketio);
queue.setSocketIO(socketio);

socketio.cjbnotify('server started');

socketio.sockets.on('connection', function(socket) {
	var session = sessions.create(socket.id);

	socket.on('disconnect', function() {
		if(session.uuid) {
			util.log('disconnect '+socket.id
				+' '+session.uuid
				+':'+session.name);
//				+':'+socket.connection.remoteAddress);
			//socketio.cjbnotify(session.name+' has left');
			socketio.sockets.emit('PART', session.uuid);
		}
		sessions.destroy(socket.id);
	});

	socket.on('DEQUEUE', function(uuid) {
		queue.dequeue(uuid, session);
	});

	socket.on('JOIN', function(uuid, nickname) {
		session.uuid = uuid;
		session.name = names.sanitize(nickname);

		// send the last 100 events to the user
		socket.emit('HISTORY', history.get());

		// give a sanitized nickname back to the user
		socket.emit('NICK', {
			uuid:session.uuid
			,name:session.name
			});

		util.log('connect '+socket.id
			+' '+session.uuid
			+':'+session.name);
//			+':'+socket.connection.remoteAddress);

		// only broadcast to everyone if new connection
		//socketio.cjbnotify(session.name+' has joined');
		socketio.sockets.emit('JOIN', {
			uuid:session.uuid
			,name:session.name
			});

		socket.emit('NAMES', sessions.get());
		socket.emit('SONGS', {
			queue:queue.getQueue()
			,songs:queue.getSongs()
		});
		socket.emit('THEME', history.getTheme());
		if(queue.isPlaying() == false) {
			socket.emit('STOP');
		}
	});

	socket.on('MSG', function(message) {
		if(sessions.is_valid(session.uuid)) {
			util.log('m: '+session.uuid+':'+session.name
				+' '+message);

			message = message.trim();

			if(message.substr(0,6).toLowerCase() == '/theme') {
				var theme = message.substr(7, 128);
				var message = session.name+' set the theme ';
				if(theme == '') {
					message += 'back to the default';
				} else {
					message += 'to: '+theme;
				}
				socketio.cjbnotify(message);
				history.setTheme(theme);
			} else {
				history.enqueueChat(
					'MSG'
					,{name:session.name, message:message}
				);
				socketio.sockets.emit('MSG', {
					uuid:session.uuid
					, message:message
				});
			}
		} else {
		        util.log('m? '+session.uuid+':'+session.name
				+' '+message);
			socket.disconnect();
		}
	});
	
	socket.on('NICK', function(nickname) {
		var sanitized = names.sanitize(nickname);
		var message = session.name+' is now '+sanitized;
		session.name = sanitized;

		util.log(message);
		socketio.cjbnotify(message);
		socketio.sockets.emit('NICK', {
			uuid:session.uuid
			,name:session.name
			});
	});
	
	socket.on('READY', function() {
		var current = queue.currentSong();
		if(current) {
			socket.emit('SONGS', {
				queue:queue.getQueue()
				,songs:queue.getSongs()
			});
			socket.emit('PLAY', current);
		}
	});
});

// allow user to submit music
app.post('/upload', function(req,res) {
	var fileinfo = null
		,form = new formidable.IncomingForm()
		,song = queue.createSong();

	form.keepExtensions = true;
	form.uploadDir = __dirname+'/uploads';

	form.on('error', function(err) {
		util.log('upload error: '+err);
	});

	form.on('fileBegin', function(name, file) {
		if(name == 'song') {
			fileinfo = file;
			song.who.name = req.cookies.name;
			song.who.uuid = req.cookies.uuid;
			song.filename = file.name;
			queue.enqueue(song.uuid);
		}
	});

	form.on('progress', function(bytesReceived, bytesExpected) {
		song.progress = bytesExpected ?
			Math.floor((bytesReceived/bytesExpected)*100) : 0;
		song.ts = new Date().getTime();
		socketio.sockets.volatile.emit('UPDATE', song);
	});

	form.on('end', function() {
		res.writeHead(200, {'content-type': 'text/plain'});
		res.end('ok');
		queue.finalizeUpload(song, fileinfo);
	});

	form.parse(req);
});

// log the state of things every 60 seconds
// but only if different than the past log
setInterval(logState, 60000);

function logState() {
	var current = {
		scnt: sessions.count()
		,qcnt: queue.length()
		,qlen: queue.duration()
		,tcnt: queue.transcodingCount()
		,tlen: queue.transcodingLength()
	};
	for(var i in current) {
		if(current[i] != state[i]) {
			util.log('sessions:'+current.scnt
				+', queue:'+current.qcnt+' ('+current.qlen+')'
				+', transcoding:'+current.tcnt+'/'+current.tlen
				);
			state = current;
			break;
		}
        }
}
