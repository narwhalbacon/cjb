//setup Dependencies
require(__dirname + "/lib/setup")
	.ext( __dirname + "/lib")
	.ext( __dirname + "/lib/express/support");

var connect = require('connect')
	,express = require('express')
	,io = require('socket.io')
	,formidable = require('formidable')
	,sys = require('sys')
	,fs = require('fs')
	,util = require('util')
	,spawn = require('child_process').spawn
	,name = require('name')
	,config = require(__dirname+'/config.js')
	,port = (process.env.PORT || config.server.port || 8081)
	;

// clean up any old data
var directories = ['static/images', 'static/music', config.uploadDir];
for(var i in directories) {
	fs.readdir(directories[i], function(err, files) {
		for(file in files) {
			if(files[file] != 'nocover.jpg' &&
			  files[file] != '.gitignore') {
				util.log('Unlinking '+files[file]);
				fs.unlink(directories[i]+'/'+files[file]);
			}
		}
	});
}

//Setup Express
var server = express.createServer();
server.configure(function() {
	server.set('views', __dirname + '/views');
	server.use(connect.bodyParser());
	server.use(connect.static(__dirname + '/static'));
	server.use(server.router);
});

//setup the errors
server.error(function(err, req, res, next) {
	if (err instanceof NotFound) {
		res.render('404.ejs', {
			locals: { 
				header: config.page.header
				,footer: config.page.footer
				,title : '404 - Not Found'
				,description: ''
				,author: ''
				,scriptversion:1
				,extrascripts:[]
			},
			status: 404
		});
	} else {
		res.render('500.ejs', {
			locals: { 
				header: config.page.header
				,footer: config.page.footer
				,title : 'The Server Encountered an Error'
				,description: ''
				,author: ''
				,scriptversion:1
				,extrascripts:[]
				,error: err 
			},
			status: 500
		});
	}
});
server.listen(port);

var currentSongStarted = 0;	// timestamp of when current song was started
var playTimer = null;		// setTimout for current song
var songs = {};			// song data
var queue = [];			// FIFO queue songs UUIDs
var sessions = {};		// who is at the website

//Setup Socket.IO
var io = io.listen(server);
io.on('connection', function(client){
	var session = {uuid:null, name:name.generate()};
	sessions[client.sessionId] = session;

	client.on('message', function(message){
		switch(message.type) {
			case 'DEQUEUE':	// someone has removed a song
				removeFromQueue(message.uuid, session);
				break;

			case 'MSG': // someone has sent a message
				message.who=session.name;
				util.log('user:'+session.uuid+':'+session.name+': '+message.message);
				io.broadcast(message);
				break;

			case 'NICK':  // user changes nickname
				var name = escapeHtml(message.name);

				// notify everyone of the change
				io.broadcast({
					type:'NICK'
					,uuid:session.uuid
					,oldname:session.name
					,name:name
				});
				util.log('user:'+session.uuid+':'+session.name+' is now '+name);
				session.name = name;
				break;

			case 'READY': // user is ready for music
				if(currentSongStarted) {
					client.send({
						type:'PLAY'
						,song:songs[queue[0]]
						,position:(new Date().getTime())-currentSongStarted
					});
				};
				break;

			case 'USER': // user has joined the page
				session.uuid = message.uuid;
				if(message.name) {
					session.name = escapeHtml(message.name);
				}
				client.send({
					type:'NICK'
					,uuid:session.uuid
					,name:session.name
				});
				client.broadcast({
					type:'JOIN'
					,uuid:session.uuid
					,name:session.name
				});
				client.send({
					type:'NAMES'
					,members:getMembers()
				});
				client.send({
					type:'SONGS'
					,queue:queue
					,songs:getSongs()
				});
				if(!currentSongStarted) {
					client.send({type:'STOP'});
				}
				break;

			default: // should never see this
				util.log('user:'+session.uuid+
					':'+session.name+
					' Unknown message: '+message);
				break;
		}
	});

	// someone has disconnected
	client.on('disconnect', function(){
		var session = sessions[client.sessionId];
		if(session.uuid) {
			client.broadcast({
				type:'PART'
				,uuid:session.uuid
			});
		}
		delete sessions[client.sessionId];
	});
});

///////////////////////////////////////////
//              Routes                   //
///////////////////////////////////////////

/////// ADD ALL YOUR ROUTES HERE  /////////

server.get('/', function(req,res){
	res.render('index.ejs', {
		locals : { 
			 header: config.page.header
			,footer: config.page.footer
			,title : config.page.title
			,description: config.page.description
			,author: config.page.author
			,scriptversion: config.page.scriptversion
			,extrascripts: [
				 'socket.io.min.js'
				,'soundmanager2.min.js'
				,'ajaxupload.js'
				,'chat.js'
				,'controller.js'
				,'player.js'
				,'queue.js'
				,'plugins.js'
				,'script.js'
			]
		}
	});
});

// allow user to submit music
server.post('/upload', function(req,res) {
	var key = req.client.remoteAddress+':'+req.client.remotePort;

	var form = new formidable.IncomingForm()
		,data = {}; 

	form.keepExtensions = true;
	form.uploadDir = config.uploadDir;

	form.on('error', function(err) {
		util.log('upload error: '+err);
	});

	form.on('fileBegin', function(name, file) {
		if(name == 'song') {
			var match = /uuid=([^;]+)/.exec(req.headers.cookie);
			var user = getSessionByUuid(match[1]);
			if(!user) { return; }
			var song = {
				uuid:generateUuid()
				,title:''
				,artist:''
				,album:''
				,filename:file.name
				,length:0		// duration in ms
				,duration:'0:00'	// human readable duration
				,cover:0
				,who:user.name
				,progress:0		// %
				,state:0		// 0:uploading, 1:processing, 2:ready, 3:playing, 4:removed
				,ts:new Date().getTime()
			};

			data[key] = {
				fileinfo:file
				,song:song
				,user:user
			};

			songs[song.uuid] = song;
			queue.push(song.uuid);
			io.broadcast({
				'type':'ENQUEUE'
				,song:song
			});
			util.log('user:'+user.uuid+':'+user.name+
				' uploading song:'+song.uuid+' - '+file.name);
		}
	});

	form.on('progress', function(bytesReceived, bytesExpected) {
		if(data[key] == undefined ||
		   data[key].song == undefined) {
			return;
		}
		var now = new Date().getTime();
		var progress = bytesExpected ?
			Math.floor((bytesReceived/bytesExpected)*100) : 0;
		var song = data[key].song;
		var last = {progress:song.progress, ts:song.ts};

		song.ts = now;

		// update every 10% or 10 second increments, whichever is first
		if(((progress-last.progress)>=10) ||
		   (now-last.ts)>=(10*1000)) {
			song.progress = progress;
			if(song.state == 0) {
				// only update if still uploading
				io.broadcast({type:'UPDATE', song:song});
			}
		}
	});

	form.on('end', function() {
		res.writeHead(200, {'content-type': 'text/plain'});
		res.end('ok');

		var info = data[key];
		delete data[key];

		info.song.progress = 100;
		info.song.ts = new Date().getTime();
		util.log('user:'+info.user.uuid+':'+info.user.name+
				' finished uploading song:'+info.song.uuid);
		processSong(info.song, info.fileinfo);
	});

	form.parse(req);
});

//A Route for Creating a 500 Error (Useful to keep around)
server.get('/500', function(req, res){
	throw new Error('This is a 500 Error');
});

//The 404 Route (ALWAYS Keep this as the last route)
server.get('/*', function(req, res){
	throw new NotFound;
});

function NotFound(msg){
	this.name = 'NotFound';
	Error.call(this, msg);
	Error.captureStackTrace(this, arguments.callee);
}


util.log('Listening on http://0.0.0.0:' + port );

// check queue every five seconds
setInterval(playQueue, 5000);

// update clients every 60 seconds
setInterval(function() {
	if(sessions.length) {
		io.broadcast({
			type:'NAMES'
			,members:getMembers()
		});
	}
	io.broadcast({
		type:'SONGS'
		,queue:queue
		,songs:getSongs()
	});
	if(currentSongStarted) {
		io.broadcast({
			type:'PLAY'
			,song:songs[queue[0]]
			,position:(new Date().getTime())-currentSongStarted
		});
	};

	// clear out song data if if not in the queue anymore
	var now = new Date().getTime();
	for(var uuid in songs) {
		if(queue.indexOf(uuid) == -1) {
			util.log('CLEANUP: Unlinking '+uuid+'.mp3');
			fs.unlink(__dirname+'/static/music/'+uuid+'.mp3');
			if(songs[uuid].cover) {
				util.log('CLEANUP: Unlinking '+uuid+'.jpg');
				fs.unlink(__dirname+'/static/images/'+uuid+'.jpg');
			}
			delete songs[uuid];
		} else {
			if(songs[uuid].state < 2 &&
			   (now-songs[uuid].ts) > (5*60*1000)) {
				// hasn't been updated in 5 minutes; dequeue
				util.log('Removing song '+uuid+' due to inactivity.');
				removeFromQueue(uuid);
			} else if (songs[uuid].state == 2 &&
			   songs[uuid].length < 1000) {
				// song was processed, but has no length
				util.log('Removing song '+uuid+' due to length.');
				removeFromQueue(uuid);
			}
		}
	}
}, 60000); // update data every 60 seconds

// this handles sending the PLAY signal to clients when the next song is ready
function playQueue() {
	if(queue.length && !currentSongStarted) {

		// find the first song that is ready to play
		for(var idx in queue) {
			var song = songs[queue[idx]];
			if(song.state == 2) { // ready state
				// if not the first song in the queue, send it to the top
				if(idx > 0) {
					util.log('promoting song:'+song.uuid);
					var a = queue.splice(idx, 1);
					queue.splice(0, 0, a[0]);
					io.broadcast({
						type:'SONGS'
						,queue:queue
						,songs:getSongs()
					});
				}

				util.log('song:'+song.uuid+' playing');
				currentSongStarted = new Date().getTime();
				io.broadcast({
					type:'PLAY'
					,song:song
					,position:0
				});
				song.state=3; // playing
				playTimer = setTimeout(function(){
					removeFromQueue(song.uuid);
				}, song.length+5000); // sleep an extra five seconds to ensure everyone hears the song
				break;
			}
		}
	}
}

// this processes the uploaded file.
// both the gettags.pl and ffmpeg programs are run concurrently and one may
// finish before the other.  The song may actually start playing before the mp3
// tags and artwork are updated.
function processSong(song, fileinfo) {
	if(song.state > 0) { return; }

	song.state=1; // processing
	io.broadcast({type:'UPDATE', song:song});

	if(config.server.gettags) {
		var gettags = spawn(__dirname+'/gettags.pl', [fileinfo.path, song.uuid]);
		gettags.stdout.on('data', function(data) {
			try {
				eval('var tags='+data.toString('ascii')); 
				song.title = tags.title;
				song.artist = tags.artist;
				song.album = tags.album;
				song.cover = tags.cover;
				song.url = tags.url;
				io.broadcast({type:'UPDATE', song:song});
			} catch(e) {
				util.log('song:'+song.uuid+' caught exception while trying to read tags');
			}
		});
	}

	song.ts = new Date().getTime();
	var time = new RegExp('time=([\\d\\.]+)');
	var ffmpeg = spawn('ffmpeg', [
		'-i', fileinfo.path,
		'-acodec', 'libmp3lame',
		'-ab', '56000', // or 128000 or 192000; bigger = more bandwidth 
		'-ar', '44100', 
		'-y',  __dirname+'/static/music/'+song.uuid+'.mp3'
	]);
	ffmpeg.stderr.on('data', function(data) {
		song.ts = new Date().getTime();
		var match = time.exec(data);
		if(match) { song.length = match[1]*1000; }
	});
	ffmpeg.on('exit', function(code) {
		fs.unlink(fileinfo.path);
		song.duration = formatDuration(song.length);
		song.state=2; // ready
		io.broadcast({type:'UPDATE', song:song});
	});
}

// remove the song from the queue, sending a stop signal if it's the currently
// playing song
function removeFromQueue(uuid, session) {
	var i = queue.indexOf(uuid);
	if(i == -1) { return; } // not found

	var song = songs[uuid];
	if(session) {
		util.log('user:'+session.uuid+':'+session.name+' removed song:'+uuid+' from the queue');
	}
	if(i == 0 && currentSongStarted) {
		util.log('song:'+uuid+' finished playing');
		clearTimeout(playTimer);
		io.broadcast({type:'STOP', song:song});
		currentSongStarted = 0; // stop
	}
	queue.splice(i,1);

	song.state=4;	// removed
	if(session) {
		io.broadcast({type:'DEQUEUE', song:song, who:session.name});
	} else {
		io.broadcast({type:'DEQUEUE', song:song});
	}
}

function escapeHtml(str) {
  return str
	.replace(/&/g, '&amp;')
	.replace(/"/g, '&quot;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;');
}

function generateUuid() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
		return v.toString(16);
	}).toUpperCase();
}

function getMembers() {
	var members = {};
	for(var i in sessions) {
		if(sessions[i].uuid) {
			members[sessions[i].uuid] = sessions[i].name;
		}
	}
	return members;
}

function getSongs() {
	var data = {};
	for(var i in queue) {
		data[queue[i]] = songs[queue[i]];
	}
	return data;
}

function getSessionByUuid(uuid) {
	for(var i in sessions) {
		if(sessions[i].uuid == uuid) {
			return sessions[i];
		}
	}
	return null;
}

function formatDuration(length) {
	var hour = Math.floor(length / (3600000));
	length   = Math.floor(length%(3600000));
	var min  = Math.floor(length / (60000));
	length   = Math.floor(length%(60000));
	var sec  = Math.floor(length / 1000);
	
	if(hour) {
		if(min < 10) { min = '0'+min; }
		if(sec < 10) { sec = '0'+sec; }
		return hour+':'+min+':'+sec;
	} else {
		if(sec < 10) { sec = '0'+sec; }
		return min+':'+sec;
	}
}
