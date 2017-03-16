#!/usr/bin/env node

var express = require('express')
	,formidable = require('formidable')
	,fs = require('fs')
  ,util = require('util')
  ,morgan = require('morgan')
  ,bodyParser = require('body-parser')
  ,cookieParser = require('cookie-parser')
  ,errorhandler = require('errorhandler')
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

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

app.use(morgan('combined'));
app.use(bodyParser());
app.use(cookieParser());

app.use(express.static(__dirname + '/htdocs'));
app.use(errorhandler({
		dumpExceptions: true
		,showStack: true
}));


// io.enable('browser client minification');
// io.enable('browser client etag');
// io.set('log level', 1);
// socketio.configure('development', function() {
// 	socketio.disable('browser client minification');
// 	socketio.disable('browser client etag');
// 	socketio.set('log level', 3);
// });

server.listen(config.server.port);

// add our own little function
io.cjbnotify = function(message) {
	history.enqueueChat('NOTICE', message);
	this.sockets.emit('NOTICE', message);
}

history.setSocketIO(io);
queue.setSocketIO(io);

io.cjbnotify('server started');

io.sockets.on('connection', function(socket) {
	var session = sessions.create(socket.id);

	socket.on('disconnect', function() {
		if(session.uuid) {
			util.log('disconnect '+socket.id
				+' '+session.uuid
				+':'+session.name);
//				+':'+socket.connection.remoteAddress);
			//io.cjbnotify(session.name+' has left');
			io.sockets.emit('PART', session.uuid);
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
		//io.cjbnotify(session.name+' has joined');
		io.sockets.emit('JOIN', {
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
				io.cjbnotify(message);
				history.setTheme(theme);
			} else {
				history.enqueueChat(
					'MSG'
					,{name:session.name, message:message}
				);
				io.sockets.emit('MSG', {
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
		io.cjbnotify(message);
		io.sockets.emit('NICK', {
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
		io.sockets.volatile.emit('UPDATE', song);
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
