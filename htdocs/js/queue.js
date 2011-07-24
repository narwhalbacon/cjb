function Queue(socket) {
	// PUBLIC

	// PRIVATE
	var focused = 1				// does window have focus
		,history = $('#songhistory')
		,playing = $('#playing')
		,pending = $('#pending')
		,outdur  = $('#queueDuration')
		,marqueeTimeout = null
		,muteone = $('#muteone')
		,muteall = $('#muteall')
		,remaining = $('#songRemaining')
		,sitename = document.title
		,volume = $('#volume')
		;

	var currentSong = { ends:0, playing:0, uuid:null }
		,queue = []
		,songs = {}
		;

	socket.on('DEQUEUE', function(uuid) {
		var i = $.inArray(uuid, queue);
		if(i != -1) {	// found
			queue.splice(i,1);
			var song = songs[uuid];
			$('#song-'+uuid).remove();
			delete songs[uuid];
		}
		destroySound(uuid);
		updateTimestamps();
	});

	socket.on('ENQUEUE', function(song) {
		songs[song.uuid] = song;
		queue.push(song.uuid);
		addSong(song);
		updateTimestamps();
	});

	socket.on('HISTORY', function(history) {
		redrawHistory(history.queue);
	});

	socket.on('PLAY', function(data) {
		var song = songs[data.uuid];
		if(song) {
			song.state = 4;
			currentSong.ends = new Date().getTime()+(song.length-data.position);
			currentSong.uuid = song.uuid;
			$('#song-'+song.uuid).remove();
			playSong(song);
			loadSound(song, data.position);
		} else {
			console.log('PLAY '+data.uuid+' '+data.position);
			console.log(songs);
		}
		updateTimestamps();
	});

	socket.on('SONGS', function(data) {
		queue = data.queue;
		songs = data.songs;
		redrawQueue();
		updateTimestamps();
	});

	socket.on('STOP', function() {
                remaining.html('');
		destroySound(currentSong.uuid);
                var sound = soundManager.getSoundById('song-'+currentSong.uuid);
		if(sound) {
			sound.stop();
			sound.unload();
			sound.destruct();
		}
		currentSong = {ends:0, playing:0, uuid:null};

		// unclick the "mute one" button
		if(parseInt(muteone.data('status'),10)) {
			toggleMute(muteone);
		}

		clearInterval(marqueeTimeout);
		document.title = sitename;
	});

	socket.on('UPDATE', function(song) {
		songs[song.uuid] = song;
		if(song.state < 4) {
			$('#songinfo-'+song.uuid).html(formatSongInQueue(song));
			if(song.state) {
				$('#remove-'+song.uuid).removeClass('hidden');
			}
		} else {
			$('#songinfo-'+uuid).html(formatPlayingSong(song));
		}
		updateTimestamps();
	});

	function addSong(song) {
		var html = '<li id="song-'+song.uuid+'" class="'+(song.who.uuid == $.cookie('uuid')?'mysong':'')+'">';
		html += '<span id="songts-'+song.uuid+'" class="ts"></span> ';
		html += '<span id="songinfo-'+song.uuid+'" class="songinfo">'+formatSongInQueue(song)+'</span> ';
		html += '<a class="hidden" id="remove-'+song.uuid+'" href="#" class="meta">[Remove]</a>';
		html += '</li>';
		pending.append(html);
		$('#remove-'+song.uuid).click(function(){ verifyRemoval(song.uuid); });
	}

	function playSong(song) {
		var html = '<div id="song-'+song.uuid+'">';
		html += '<img src="/images/'+song.cover+'" width="256" height="256" align="center" />';
		html += '<p id="songinfo-'+song.uuid+'" class="songinfo">'+formatPlayingSong(song)+'</p>';
		html += '<a id="remove-'+song.uuid+'" href="#" class="meta">[Remove]</a>';
		playing.html(html);
		$('#remove-'+song.uuid).click(function(){ verifyRemoval(song.uuid); });

		if(!focused) {
			clearInterval(marqueeTimeout);
			marqueeTimeout = $.marqueeTitle({text:sitename+' - '+(song.title||song.filename)+' by '+(song.artist||'Unknown Artist')+' - '});
		}
	}

	function formatPlayingSong(song) {
		var html = '';
		html += '<p class="title">'+(song.title||song.filename||'Unknown Title')+'</p>';
		html += '<p class="artist">'+(song.artist||'Unknown Artist')+'</p>';
		if(song.album) {
			html += '<p class="album">'+song.album+'</p>';
		}
		html += '<p class="meta">Added by <span class="by">'+(song.who.name)+'</span></p>';
		if(song.url && Object.keys(song.url).length) {
			html += '<p class="meta">Download: ';
			for(var i in song.url) {
				html += '<a href="'+song.url[i]+'" target="_blank" title="opens in a new window">['+i+']</a> ';
			}       
			html += '</p>';
		}
		return html;
	}

	function formatSongInHistory(song) {
		var html = '<span class="title">'+(song.title||song.filename||'Unknown Title')+'</span>';
		html += ' by <span class="artist">'+(song.artist||'Unknown Artist')+'</span>';
		if(song.album) {
			html += ' from <span class="album">'+song.album+'</span>';
		}
		if(song.url && Object.keys(song.url).length) {
			html += '<p class="meta">Download: ';
			for(var i in song.url) {
				html += '<a href="'+song.url[i]+'" target="_blank" title="opens in a new window">['+i+']</a> ';
			}       
			html += '</p>';
		}
		return html;
	}

	function formatSongInQueue(song) {
		var html = '<span class="title">'+(song.title||song.filename||'Unknown Title')+'</span>';
		if(song.state != 0) {
			html += ' by <span class="artist">'+(song.artist||'Unknown Artist')+'</span>';
		}
		if(song.album) {
			html += ' from <span class="album">'+song.album+'</span>';
		}
		switch(song.state) {
			case 0: // uploading
				html+= ' <span class="state">(uploading:'+song.progress+'%)</span>';
				break;

			case 1: // waiting to transcode
				html+= ' <span class="state">(waiting)</span>';
				break;

			case 2: // transcoding
				html+= ' <span class="state">(transcoding)</span>';
				break;

			case 3: // pending
			case 4: // playing
				html += ' (<span class="length'+(song.length>(10*60*1000)?' long':'')+'">'+song.duration+'</span>)';
				break;

			default: break;
		}
		html += '<br><span class="meta">added by <span class="by">'+(song.who.name)+'</span></span>';
	
		return html;
	}

	function redrawHistory(songs) {
		var html = ''
		for(var i in songs.reverse()) {
			var song = songs[i][1];
			html += '<li class="songinfo '+(song.who.uuid == $.cookie('uuid')?'mysong':'')+'">';
			html += formatSongInHistory(song);
			html += '</li>';
		}
		history.html(html);
	}

	function redrawQueue(uuid) {
		playing.html('');
		pending.html('');
		$.each(queue, function(i) {
			var song = songs[queue[i]];
			if(song.state > 4) { return; } // no need to display
			if(song.state == 4) {
				playSong(song);
			} else {
				addSong(song);
				if(song.state) {
					$('#remove-'+song.uuid).removeClass('hidden');
				}
			}
		});
	} 

	function updateTimestamps() {
		var duration = 0;
		var now = new Date().getTime();

		$.each(queue, function(i) {
			var song = songs[queue[i]];
			if(!song || song.state > 3) { return; };
			var ends = currentSong.ends ? currentSong.ends : new Date().getTime();
			var toplay = new Date(ends+duration);
			duration+=song.length;
			$('#songts-'+song.uuid).html('@'+getHHMM(toplay));
		});
                outdur.html(duration?calcDuration(duration):'');
	}

	function verifyRemoval(uuid) {
		if(confirm('This will remove the song for everyone.  ARE YOU SURE?')) {
			socket.emit('DEQUEUE', uuid);
		}
	}

	function destroySound(uuid) {
		var sound = soundManager.getSoundById('song-'+uuid);
		if(sound) {
			sound.stop();
			sound.unload();
			sound.destruct();
		}
	}

        function loadSound(song, startat) {
		if(currentSong.uuid == song.uuid && currentSong.playing) { return; }

		var sound;
		var start = new Date().getTime();

		sound = soundManager.getSoundById('song-'+song.uuid);
		if(!sound) {
			sound = soundManager.createSound({
				id:'song-'+song.uuid
				,url:'/music/'+song.uuid+'.mp3'
				,autoLoad: true
				,autoPlay: false
				,whileloading:function(){
					// attempt to start at the correct time, adjusting for loading time
					if((currentSong.uuid == song.uuid) && !currentSong.playing) {
						var position = startat+((new Date().getTime()-start));
						if(sound.duration > position) {
							currentSong.playing = 1;
							sound.setPosition(position);
							sound.setVolume(parseInt(volume.val(), 10));
							sound.play();
						}
					}
				}
				,onplay:function(){ currentSong.playing = 1; }
				,whileplaying:function() { 
					switch(sound.readyState) {
						case 0: remaining.html('');break;
						case 1: remaining.html(calcDuration(sound.durationEstimate-sound.position)
							+'<br><small>(buffering:'+parseInt(((sound.bytesLoaded/sound.bytesTotal)*100),10)+'%)</small> '); break;
						case 2: remaining.html('(failed/error)');break;
						case 3: if(currentSong.playing) {
								remaining.html(calcDuration(sound.duration-sound.position));break;
							}
						default: remaining.html('');break;
					}
				}
			});
		}

		// mute song if "mute all" is selected
		if(currentSong.uuid == song.uuid) {
			if(parseInt(muteone.data('status'),10) ||
			  parseInt(muteall.data('status'),10)) {
				sound.mute();
			}

			if(sound.readyState == 3) {
				sound.setVolume(parseInt(volume.val(), 10));
				sound.play();
			}
		}
	}

	function toggleMute(button) {
		var status = parseInt(button.data('status')) == 1;
		button.data('status', status?"0":"1");
		$(button).button('option', 'label', status ? button.data('mute') : button.data('unmute'));

		if(currentSong.uuid) {
			var sound = soundManager.getSoundById('song-'+currentSong.uuid);
			if(sound) {
				if(parseInt(muteone.data('status'),10) || parseInt(muteall.data('status'),10)) {
					sound.mute();
				} else {
					sound.unmute();
				}
			}
		}

		if(button.attr('id') == 'muteall') {
			muteone.button('option', 'disabled', status?null:'disabled');
		}
	}

	// PRIVILEGED

	// initialize
	muteall.click(function(){ toggleMute(muteall); return false; });
	muteone.click(function(){ toggleMute(muteone); return false; });

	// does the browser support input[type=range] ?
	if(Modernizr.inputtypes.range) {
		volume.change(function(e) {
			if(currentSong.uuid) {
				var sound = soundManager.getSoundById('song-'+currentSong.uuid);
				if(sound) {
					sound.setVolume(parseInt($(e.target).val(), 10));
				}
			}
		});
	} else {
		volume.parent().hide();
	}

	// initialize
	// preload three songs at a time
	setInterval(function() {
		var uuids = queue.slice(0,3);
		for(var i in uuids) {
			var song = songs[uuids[i]];
			if(song.state >= 3) {
				loadSound(song, 0);
			}
		}
	}, 30000);

	$(window).focus(function() {
		focused = 1;
		clearInterval(marqueeTimeout);
		marqueeTimeout = null;
		document.title = sitename;
	});

	$(window).blur(function() {
		focused = 0;
		if(currentSong.uuid) {
			var song = songs[currentSong.uuid];
			marqueeTimeout = $.marqueeTitle({text:sitename+' - '+(song.title||song.filename)+' by '+(song.artist||'Unknown Artist')+' - '});
		}
	});
}
