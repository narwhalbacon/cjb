/* Author: */

function calcDuration(length) {
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

function escapeHTML(s) {
	return $('<div/>').text(s).html();
}

function formatPlayingSong(song) {
	var html = '';
	html += '<p class="title">'+(song.title||song.filename||'Unknown Title')+'</p>';
	html += '<p class="artist">'+(song.artist||'Unknown Artist')+'</p>';
	if(song.album) {
		html += '<p class="album">';
		html += (song.url) ? '<a href="'+song.url+'" target="_new" title="Open in a new window/tab">'+song.album+'</a>' : song.album;
		html += '</p>';
	}
	html += '<p>Added by <span class="by">'+(song.who.name)+'</span></p>';
	return html;
}

function formatSong(song, status) {
	var html = '';
	html += '<span class="title">'+(song.title||song.filename||'Unknown Title')+'</span>';
	if(song.state>1) {
		html += ' by <span class="artist">'+(song.artist||'Unknown Artist')+'</span>';
	}
	if(song.album) {
		html += ' from <span class="album">';
		html += (song.url) ? '<a href="'+song.url+'" target="_new" title="Open in a new window/tab">'+song.album+'</a>' : song.album;
		html += '</span>';
	}
	if(status) {
		switch(song.state) {
			case 0:
				html+= ' <span class="state">(uploading:'+song.progress+'%)</span>';
				break;

			case 1:
				html+= ' <span class="state">(processing)</span>';
				break;

			case 2: // pending
			case 3: // playing
				html += ' (<span class="length'+(song.length>(10*60*1000)?' long':'')+'">'+song.duration+'</span>)';
				break;

			default: break;
		}
		html += '<br>added by <span class="by">'+(song.who.name)+'</span>';
	}

	return html;
}

function generateUuid() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
		return v.toString(16);
	}).toUpperCase();
}

function getHHMM(ts) {
	var html = '';
	var now = (ts === undefined) ? new Date() : new Date(ts);
	var hh = now.getHours()<10 ? '0'+now.getHours() : now.getHours();
	var mm = now.getMinutes()<10 ? '0'+now.getMinutes() : now.getMinutes();
	var time12 = ((hh%12)?(hh%12):'12')+':'+mm+((hh<12)?'am':'pm');
	var time24 = hh+':'+mm;

	html += '<span class="clock" data-time12="'+time12+'" data-time24="'+time24+'">';
	html += $('#time24').attr('checked') ? time24 : time12;
	html += '</span>';
	
	return html;
}

function displayCorrectTime() {
	log('setting time');
	var time24 = $('#time24').attr('checked');
        $('.clock').each(function() { $(this).html( time24 ? $(this).data('time24') : $(this).data('time12') ); });
}

$(document).ready(function() {   
	var controller = new Controller();
	var chat       = new Chat(controller);
	var queue      = new Queue(controller);
	var player     = new Player(controller);

	var a = new AjaxUpload('add', {
		action: '/upload',
		name: 'song',
		autoSubmit:true,
		onSubmit:function(file,extension){ this.disable(); },
		onComplete:function(file,response){ this.enable(); }
	});

	// allow user to toggle between a 24-hour and a 12-hour clock
	$('#time24').click(function() {
		$.cookie('time24', $(this).attr('checked')?1:0);
		displayCorrectTime();
		return true;
	});

	// set the user's default
	if($.cookie('time24') !== null) {
		$('#time24').attr('checked', parseInt($.cookie('time24'), 10));
		displayCorrectTime();
	}

});
