function Queue(controller) {
	// PUBLIC

	// PRIVATE
	var playing = $('#playing');
	var pending = $('#pending');
	var outdur  = $('#queueDuration');
	var songends = 0;
	var songs   = {};
	var queue   = [];
	var self  = this;

	function fnDEQUEUE(data) {
		var i = $.inArray(data.song.uuid, queue);
		if(i != -1) {	// found
                	queue.splice(i,1);
			redrawQueue();
		}
	}

	function fnENQUEUE(data) {
		songs[data.song.uuid] = data.song;
		queue.push(data.song.uuid);
		redrawQueue();
	}

	function fnPLAY(data) {
		var song = songs[data.song.uuid];
		if(song) {
			song.state = 3;
			songends = new Date().getTime()+(song.length-data.position);
			redrawQueue();
		}
	}

	function fnSONGS(data) {
		songs = data.songs;
		queue = data.queue;
		redrawQueue();
	}

	function fnSTOP(data) {
		songends = 0;
	}

	function fnUPDATE(data) {
		songs[data.song.uuid] = data.song;
		redrawQueue();
	}

	function redrawQueue() {
		var duration = 0;
                var now = new Date().getTime();

		playing.html('');
		pending.html('');
		$.each(queue, function(i) {
			var song = songs[queue[i]];
                        var ends = songends ? songends : new Date().getTime();
			if(song.state > 3) { return; } // no need to display

			var html = '';
			var remove = ' <a id="remove-'+song.uuid+'" href="#">[Remove]</a>';
			if(song.state == 3) {
				html += '<img src="/images/'+(song.cover ? song.uuid : 'nocover')+'.jpg" width="256" height="256" align="center" />';
				html += '<p class="songinfo">'+formatPlayingSong(song)+'</p>';
				html += remove;
				playing.html(html);
			} else {
				var toplay = new Date(ends+duration);
				duration+=song.length;
				html = '<li id="song-'+song.uuid+'">';
				html += '@'+getHHMM(toplay);
				html += ' <span class="songinfo">'+formatSong(song,1)+'</span>';
				if(song.state > 0) { // do not allow remove during uploading
					html += remove;
				}
				html += '</li>';
				pending.append(html);
			}

			$('#remove-'+song.uuid).click(function(){
				if(confirm('This will remove the song for everyone.  ARE YOU SURE?')) {
					controller.send({type:'DEQUEUE',uuid:song.uuid});
				}
			});
		});
		outdur.html(calcDuration(duration));
	} 

	// initialize
	controller.register('DEQUEUE', fnDEQUEUE);
	controller.register('ENQUEUE', fnENQUEUE);
	controller.register('PLAY', fnPLAY);
	controller.register('SONGS', fnSONGS);
	controller.register('STOP', fnSTOP);
	controller.register('UPDATE', fnUPDATE);
}
