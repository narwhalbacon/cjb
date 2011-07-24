var fs = require('fs')
	,path = require('path')
	,spawn = require('child_process').spawn
	,util = require('util');

var cjbutil = require('cjbutil')
	,config = require('cjbconfig')
	,history = require('history')
	,sessions = require('sessions');

var appdir = path.resolve(__dirname+'/../');

var playTimer = null;	// setTimeout for current song
var themeTimer = null;

var startedat = 0;	// currently playing song started at this timestamp

var queue = [];		// holds the queue (uuids)
var songs = {};		// holds song information (objects)

var totranscode = [];	// holds the transcoding queue (uuids)
var curtranscode = 0;	// current number of transcoding processes

var fileinfo = {};	// holds file information for uploaded file

var socketio = null;	// a copy of our socket.io handle

setInterval(function() {
	playNext();
	processQueue();
}, 5000);

setInterval(housekeeping, 60000);	// do housekeeping every 60 seconds

exports.setSocketIO = function(io) {
	socketio = io;
}

// queue functions
exports.dequeue = fnDequeue;

exports.duration = function() {
	var total = 0;
	for(var i in queue) {
		total += songs[queue[i]].length;
	}
	return formatDuration(total);
}

exports.enqueue = function(uuid) {
	queue.push(uuid);
	socketio.sockets.emit('ENQUEUE', songs[uuid]);
	util.log(logSession(songs[uuid].who)
		+' started uploading song'
		+logSong(songs[uuid]));
	if(themeTimer) {
		clearTimeout(themeTimer);
		themeTimer = null;
	}
}

exports.getQueue = function() {
	return queue;
}

exports.length = function() {
	return queue.length;
}

function playNext() {
	if(startedat || !queue.length) {
		return null;
	}

	for(var idx in queue) {
		var song = songs[queue[idx]];
		if(song.state == 3) { // ready state
			if(idx > 0) {
				promoteSong(idx);
			}

			util.log(logSong(song)+' playing; ('+song.duration+')');
			socketio.cjbnotify('Playing '+formatSong(song));

			startedat = new Date().getTime();
			socketio.sockets.emit('PLAY', {
				uuid:song.uuid
				,position:0
			});

			song.state = 4; // playing
			playTimer = setTimeout(function() {
				fnDequeue(song.uuid);
				playNext();
			}, song.length+5000);
			break;
		}
	}
}

function processQueue() { 
	if(totranscode.length && (curtranscode < config.server.maxtranscode)) {
		for(var i in totranscode) {
			if(curtranscode >= config.server.maxtranscode) {
				break;
			}
			curtranscode += 1;
			transcodeSong(totranscode.splice(0,1));
		}	
	}	
}

exports.transcodingCount = function() {
	return curtranscode;
}

exports.transcodingLength = function() {
	return totranscode.length;
}

// songs
exports.createSong = function() {
	var uuid = cjbutil.generateUuid();
	songs[uuid] = {
		uuid:uuid
		,title:''
		,artist:''
		,album:''
		,filename:null
		,length:0	       // duration in ms
		,duration:'0:00'	// human readable duration
		,cover:'nocover.jpg'
		,who:{uuid:null, name:null}
		,progress:0	     // %
		,state:0		// 0:uploading, 1:waiting, 2:processing, 3:ready, 4:playing, 5:removed
		,ts:new Date().getTime()
		,url:{}
	};
	return songs[uuid];
}

exports.currentSong = function() {
	if(startedat) {
		return {
			uuid:songs[queue[0]].uuid
			,position:(new Date().getTime())-startedat
		};
	}
}

exports.getSongs = function() {
	return songs;
}

function fnDequeue(uuid, session) {
	var i = queue.indexOf(uuid);
	if(i>-1) { queue.splice(i,1); }

	var j = totranscode.indexOf(uuid);
	if(j>-1) { totranscode.splice(j,1); }

	if(i == -1) {
		return false;
	}

	var song = songs[uuid];
	song.state = 5; // removed

	if(session) {
		socketio.cjbnotify(session.name+' removed '+formatSong(song));
		util.log(logSession(session)
			+' removed '+logSong(song)
			+' from the queue');
	}		
	if(i == 0 && startedat) {
		util.log(logSong(song)+' finished playing');
		clearTimeout(playTimer);
		socketio.sockets.emit('STOP', uuid);
		history.enqueueSong(song);
		startedat = 0; // stop
	}

	socketio.sockets.emit('DEQUEUE', uuid);
	history.send();

	return true;
}

exports.finalizeUpload = function(song, file) {
	song.progress = 100;
	song.ts = new Date().getTime();
	song.state = 1;				// processing state
	fileinfo[song.uuid] = file;		// for transcoding later
	totranscode.push(song.uuid);		// add to transcoding queue
	socketio.sockets.emit('UPDATE', song);

	util.log(logSession(song.who)
		+' finished uploading '
		+logSong(song)
		+'; size:'+file.size);

	if(config.server.gettags) {
		processSongTags(song, file);
	}
}

exports.isPlaying = function() {
	return startedat;
}


function housekeeping() {
	var now = new Date().getTime();
	for(var uuid in songs) {
		if(queue.indexOf(uuid) == -1) {
			cjbutil.unlinkFile(appdir+'/htdocs/music/'+uuid+'.mp3');
			cjbutil.unlinkFile(appdir+'/htdocs/images/'+uuid+'.jpg');
			delete songs[uuid];
		} else {
			if(songs[uuid].state == 0 &&
			  (now-songs[uuid].ts) > (5*60*1000)) {
				// hasn't been updated in 5 minutes; dequeue
				socketio.cjbnotify('Removing '
					+formatSong(songs[uuid])
					+' due to upload inactivity.');
				util.log('Removing '+
					+logSong(songs[uuid])
					+' due to upload inactivity.');
				fnDequeue(uuid);

			} else if (songs[uuid].state == 2 && // processing
			   (now-songs[uuid].ts) > (10*60*1000)) {
				// hasn't been updated in 5 minutes; dequeue
				socketio.cjbnotify('Removing '
					+formatSong(songs[uuid])
					+' due to transcoding inactivity.');
				util.log('Removing song '
					+logSong(songs[uuid])
					+' due to transcoding inactivity.');
				fnDequeue(uuid);
	
			} else if (songs[uuid].state == 3 &&
			   songs[uuid].length < 1000) {
				// song was processed, but has no length
				socketio.cjbnotify('Removing '
					+formatSong(songs[uuid])
					+' due to length.');
				util.log('Removing '
					+logSong(songs[uuid])
					+' due to length.');
				fnDequeue(uuid);
			}
		}
	}

	if(queue.length == 0 && !themeTimer && history.getTheme() != '') {
		themeTimer = setTimeout(function() {
			socketio.cjbnotify('Resetting theme due to queue inactivity');
			util.log('Reset theme');
			history.setTheme('');
		}, 600000); // 10 minutes ought to do it
	}
}

function processSongTags(song, file) {
	var gettags = spawn(appdir+'/gettags.py', [
		file.path
		,song.uuid
	]);

	gettags.stdout.on('data', function(data) {
		try {
			eval('var tags='+data.toString('ascii'));
			song.title = tags.title;
			song.artist = tags.artist;
			song.album = tags.album;
			if('cover' in tags) {
				song.cover = tags.cover;
			}
			socketio.sockets.emit('UPDATE', song);

			if(tags.artist && tags.title) {
				storeLookupAmazon(song);
				storeLookupItunes(song);
			}
		} catch(e) {
			util.log(logSong(song)
				+' caught exception while trying to read tags');
		}
	});
}

function storeLookupAmazon(song) {
	var artist = song.artist?song.artist:''
		,album = song.album?song.album:''
		,title = song.title?song.title:''
		;

	util.log('amazon s:'+song.uuid
		+' ['+artist+']'
		+' ['+album+']'
		+' ['+title+']'
	);
	var child = spawn(appdir+'/lookup-amazon.py', [
		artist
		,album
		,title
	]);

	child.stdout.on('data', function(data) {
		util.log('amazon s:'+song.uuid+' = '+data.toString('ascii'));
		try {
			eval('var tags='+data.toString('ascii'));
			if(tags.Amazon) {
				song.url.Amazon = tags.Amazon;
				socketio.sockets.emit('UPDATE', song);
			}
		} catch(e) {
			util.log(logSong(song)
				+' caught exception while trying to lookup @Amazon');
		}
	});
	child.on('exit', function() {
		util.log('amazon s:'+song.uuid+' finished');
	});
}

function storeLookupItunes(song) {
	var artist = song.artist?song.artist:''
		,album = song.album?song.album:''
		,title = song.title?song.title:''
		;

	util.log('itunes s:'+song.uuid
		+' ['+artist+']'
		+' ['+album+']'
		+' ['+title+']'
	);
	var child = spawn(appdir+'/lookup-itunes.py', [
		artist
		,album
		,title
	]);

	child.stdout.on('data', function(data) {
		util.log('itunes s:'+song.uuid+' = '+data.toString('ascii'));
		try {
			eval('var tags='+data.toString('ascii'));
			if(tags.itunes) {
				song.url.iTunes = tags.itunes;
				socketio.sockets.emit('UPDATE', song);
			}
		} catch(e) {
			util.log(logSong(song)
				+' caught exception while trying to lookup @iTunes');
		}
	});
	child.on('exit', function() {
		util.log('itunes s:'+song.uuid+' finished');
	});
}

function promoteSong(idx) {
	util.log('promoting song:'+logSong(songs[queue[idx]]));
	var a = queue.splice(idx,1);
	queue.splice(0, 0, a[0]);
	history.send();
	return true;
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

function formatSong(song) {
	var text = (song.title||song.filename)
		+' by '+(song.artist||'Unknown Artist');
	return text;
}

function logSession(session) {
  return 'u:'+session.uuid+':'+session.name;
}

function logSong(song) {
  return 's:'+song.uuid+':'+song.filename;
}

function transcodeSong(uuid) {
	var song = songs[uuid];
	util.log(logSong(song)+' transcoding');

	song.state = 2; // processing
	song.ts = new Date().getTime();
	socketio.sockets.volatile.emit('UPDATE', song);
	
	var time = new RegExp('time=([\\d\\.]+)');
	var outfile = appdir+'/htdocs/music/'+song.uuid+'.mp3';
	
	var ffmpeg = spawn(appdir+'/transcode.sh', [
		fileinfo[song.uuid].path
		,outfile
		,sessions.count()
	]);
		
	ffmpeg.stderr.on('data', function(data) {
		song.ts = new Date().getTime();
		var match = time.exec(data);
		if(match) { song.length = match[1]*1000; }
	});
	
	ffmpeg.on('exit', function(code) {
		cjbutil.unlinkFile(fileinfo[song.uuid].path);
		delete fileinfo[song.uuid];
		curtranscode -= 1;
	
		if(code) {
			util.log(logSong(song)+' transcoding error');
			socketio.cjbnotify('Unable to transcode '
				+formatSong(song));
			fnDequeue(song.uuid);
		} else {
			if(song.state == 2) {
				song.duration = formatDuration(song.length);
				song.state = 3; // ready
				socketio.sockets.volatile.emit('UPDATE', song);
			}

			fs.stat(outfile, function(e,s) {
				util.log(logSong(song)
					+' transcoding finished'
					+(s?('; size:'+s.size):''));
				if(e) { util.log(e); }
			});
		}
	});
}
