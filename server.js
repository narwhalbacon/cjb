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

// add a trim function to the String object
String.prototype.trim = function() {
        return this.replace(/^\s+|\s+$/g,"");
}

// clean up any old data
var directories = ['/static/images/', '/static/music/', '/uploads/'];
for(var i in directories) {
	var files = fs.readdirSync(__dirname+directories[i]);
	for(j in files) {
		if(files[j] != 'nocover.jpg' &&
		  files[j] != '.gitignore') {
			unlinkFile(__dirname+directories[i]+files[j]);
		}
	};
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
var fileinfo = {};		// non-transcoded locations of songs
var queue = [];			// FIFO queue songs UUIDs
var transCount = 0;		// number of concurrent processes transcoding
var sessions = {};		// who is at the website
var clients = {};

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
				var oldname = session.name;
				session.name = sanitizeName(message.name);
				io.broadcast({
			                type:'NICK'
			                ,uuid:session.uuid
			                ,oldname:oldname
			                ,name:session.name
			        });
				util.log('user:'+session.uuid+':'+oldname+' is now '+session.name);
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
				session.name = sanitizeName(message.name);
				client.send({
			                type:'NICK'
			                ,uuid:session.uuid
			                ,name:session.name
			        });
				util.log('Client '+client.sessionId+' user:'+session.uuid+' name:'+session.name+' ip:'+client.connection.remoteAddress);

				if((session.uuid in clients) == false) {
					client.broadcast({
						type:'JOIN'
						,uuid:session.uuid
						,name:session.name
					});
				}
				clients[session.uuid] = client.sessionId;
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
				util.log('user:'+session.uuid+':'+session.name
					+'; unknown message:'+util.inspect(message, true, null));
				break;
		}
	});

	// someone has disconnected
	client.on('disconnect', function(){
		var session = sessions[client.sessionId];
		var clientid = clients[session.uuid];

		if(session.uuid && clientid && clientid == client.sessionId) {
			client.broadcast({
				type:'PART'
				,uuid:session.uuid
			});
			delete clients[session.uuid];
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
				,'plugins.js'
				,'ajaxupload.js'
				,'chat.js'
				,'controller.js'
				,'player.js'
				,'queue.js'
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
	form.uploadDir = __dirname+'/uploads';

	form.on('error', function(err) {
		util.log('upload error: '+err);
	});

	form.on('fileBegin', function(name, file) {
		if(name == 'song') {
			var match = /uuid=([^;]+)/.exec(req.headers.cookie);
			var user = null;
			if(match) {
				user = getSessionByUuid(match[1]);
			}
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
				,who:{uuid:user.uuid, name:user.name}
				,progress:0		// %
				,state:0		// 0:uploading, 1:waiting, 2:processing, 3:ready, 4:playing, 5:removed
				,ts:new Date().getTime()
			};


			data[key] = song;

			songs[song.uuid] = song;
			fileinfo[song.uuid] = file;

			queue.push(song.uuid);
			io.broadcast({
				'type':'ENQUEUE'
				,song:song
			});
			util.log('user:'+user.uuid+':'+user.name
				+' uploading song:'+song.uuid+':'+file.name
				+'; path:'+file.path);
		}
	});

	form.on('progress', function(bytesReceived, bytesExpected) {
		if((key in data) === false) {
			return;
		}
		var now = new Date().getTime();
		var progress = bytesExpected ?
			Math.floor((bytesReceived/bytesExpected)*100) : 0;
		var song = data[key];
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
		finalizeSong(data, key);
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

// check queue every five seconds
setInterval(processQueue, 5000);

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
			unlinkFile(__dirname+'/static/music/'+uuid+'.mp3');
			if(songs[uuid].cover) {
				unlinkFile(__dirname+'/static/images/'+uuid+'.jpg');
			}
			delete songs[uuid];
		} else {
			if(songs[uuid].state == 0 &&
			   (now-songs[uuid].ts) > (5*60*1000)) {
				// hasn't been updated in 5 minutes; dequeue
				util.log('Removing song '+uuid+' due to upload inactivity.');
				removeFromQueue(uuid);

			} else if (songs[uuid].state == 2 && // processing
			   (now-songs[uuid].ts) > (10*60*1000)) {
				// hasn't been updated in 5 minutes; dequeue
				util.log('Removing song '+uuid+' due to transcode inactivity.');
				removeFromQueue(uuid);

			} else if (songs[uuid].state == 3 &&
			   songs[uuid].length < 1000) {
				// song was processed, but has no length
				util.log('Removing song '+uuid+' due to length.');
				removeFromQueue(uuid);
			}
		}
	}
	for(var i in fileinfo) {
		if((i in songs) === false) {
			util.log('Removing '+uuid+' from fileinfo cache.');
		}
	}
			

}, 60000); // update data every 60 seconds

// this handles sending the PLAY signal to clients when the next song is ready
function playQueue() {
	if(queue.length && !currentSongStarted) {

		// find the first song that is ready to play
		for(var idx in queue) {
			var song = songs[queue[idx]];
			if(song.state == 3) { // ready state
				// if not the first song in the queue, send it to the top
				if(idx > 0) {
					util.log('promoting song:'+song.uuid+':'+song.filename);
					var a = queue.splice(idx, 1);
					queue.splice(0, 0, a[0]);
					io.broadcast({
						type:'SONGS'
						,queue:queue
						,songs:getSongs()
					});
				}

				util.log('song:'+song.uuid+':'+song.filename+' playing; ('+song.duration+')');
				currentSongStarted = new Date().getTime();
				io.broadcast({
					type:'PLAY'
					,song:song
					,position:0
				});
				song.state = 4; // playing
				playTimer = setTimeout(function(){
					removeFromQueue(song.uuid);
				}, song.length+5000); // sleep an extra five seconds to ensure everyone hears the song
				break;
			}
		}
	}
}

function finalizeSong(data, key) {
        if((key in data) === false) {
                setTimeout(function() { finalizeSong(data, key); }, 1000);
                return;
        }
        var song = data[key];
        delete data[key];
        
        song.progress = 100;
        song.ts = new Date().getTime();
	song.state=1; // processing
	io.broadcast({type:'UPDATE', song:song});

        util.log('user:'+song.who.uuid+':'+song.who.name
          +' finished uploading song:'+song.uuid+':'+song.filename
          +'; size:'+fileinfo[song.uuid].size);

	if(config.server.gettags) {
		var gettags = spawn(__dirname+'/gettags.pl', [fileinfo[song.uuid].path, song.uuid]);
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
				util.log('song:'+song.uuid+':'+song.filename+' caught exception while trying to read tags');
			}
		});
	}
}

function processQueue() {
	if(queue.length) {
		for(var i in queue) {
			if(transCount >= config.server.maxtranscode) {
				break;
			}

			var song = songs[queue[i]];
			if(song.state == 1) {
				transcodeSong(song);
			}
		}
	}
}

function transcodeSong(song) {
	transCount += 1;
	util.log('song:'+song.uuid+':'+song.filename+' transcoding');

	song.state = 2;	// processing
	song.ts = new Date().getTime();
	io.broadcast({type:'UPDATE', song:song});

	var time = new RegExp('time=([\\d\\.]+)');
	var ffmpeg = spawn('ffmpeg', [
		'-i', fileinfo[song.uuid].path,
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
		unlinkFile(fileinfo[song.uuid].path);
		delete fileinfo[song.uuid];
		transCount -= 1;

		if(song.state == 2) {
			song.duration = formatDuration(song.length);
			song.state = 3; // ready
			io.broadcast({type:'UPDATE', song:song});
		}
		fs.stat(__dirname+'/static/music/'+song.uuid+'.mp3', function(e,s) {
			if(e) {
				util.log('song:'+song.uuid+':'+song.filename+' transcoding finished');
				util.log(e);
			} else {
				util.log('song:'+song.uuid+':'+song.filename+' transcoding finished'
					+'; size:'+s.size);
			}
		});
	});
}



// remove the song from the queue, sending a stop signal if it's the currently
// playing song
function removeFromQueue(uuid, session) {
	var i = queue.indexOf(uuid);
	if(i == -1) { return; } // not found

	var song = songs[uuid];
	if(session) {
		util.log('user:'+session.uuid+':'+session.name+' removed song:'+uuid+':'+song.filename+' from the queue');
	}
	if(i == 0 && currentSongStarted) {
		util.log('song:'+uuid+':'+song.filename+' finished playing');
		clearTimeout(playTimer);
		io.broadcast({type:'STOP', song:song});
		currentSongStarted = 0; // stop
	}
	queue.splice(i,1);

	song.state = 5;	// removed
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

function unlinkFile(filename) {
        fs.unlink(filename, function(e) {
                util.log('Unlinked '+(e?e:filename));
        });
}

function sanitizeName(newnick) {
	var sanitized = '';
	if(newnick === null) {
		sanitized = name.generate();
	} else {
		sanitized = escapeHtml(newnick.trim());
		if(sanitized == '') {
			sanitized = name.generate();
		}
	}
	return sanitized;
}
