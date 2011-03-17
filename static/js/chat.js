function Chat(controller) {
	// PUBLIC

	// PRIVATE
	var memberbox = $('#chatMembers')
		,members = {}
		,msg = $('#message')
		,name = $('#nickname')
		,history = $('#chatHistory')
		,isPlaying = 0
		,self = this;


	function fnDEQUEUE(data) {
		if(data.who) {
			fnNOTICE(data.who+' has removed <span class="song-'+data.song.uuid+'">'+formatSong(data.song,0)+'</span>');
		}
	}

	function fnENQUEUE(data) {
		fnNOTICE(data.song.who+' added <span class="song-'+data.song.uuid+'">'+formatSong(data.song,0)+'</span>');
	}

	function fnJOIN(data) {
		fnNOTICE(data.name+' has joined');
		members[data.uuid] = data.name;
		redrawMembers();
	}

	function fnMSG(data) {
		var now = new Date();
		history.prepend('<li>('+getHHMM()+') <strong>'+data.who+'</strong>: ' + escapeHTML(data.message) + '</li>');  
	}

	function fnNAMES(data) {
		members = data.members;
		redrawMembers();
	}

	function fnNICK(data) {
		if(data.oldname) {
			fnNOTICE(data.oldname+' is now '+data.name);
		}
		if(data.uuid == $.cookie('uuid')) {
			$.cookie('name', data.name);
			name.val(data.name);
		}
		members[data.uuid] = data.name;
    		redrawMembers();
	}

	function fnNOTICE(message) {
		history.prepend('<li class="announce">('+getHHMM()+') '+message+'</li>');  
	}

	function fnPLAY(data) {
		if(!isPlaying) {
			isPlaying=1;
			fnNOTICE('Playing '+formatSong(data.song,0));
		}
	}

	function fnPART(data) {
		if(data.uuid != $.cookie('uuid') && members[data.uuid]) {
			fnNOTICE(members[data.uuid]+' has left');
			delete members[data.uuid];
			redrawMembers();
		}
	}

	function fnSTOP(data) {
		if(isPlaying) {
			isPlaying=0;
			if(data.song) {
				fnNOTICE('Finished playing '+formatSong(data.song,0));
			}
		}
	}

	function fnUPDATE(data) {
		$('.song-'+data.song.uuid).html(formatSong(data.song,0));
	}

	function redrawMembers() {
		memberbox.html('');
		$.each(members, function(k,v) { memberbox.append('<option>'+v+'</option>'); });
	} 

	// initialize
	msg.val(msg.data('watermark')).addClass('watermark').click(function() {
		if(msg.val() == msg.data('watermark')) {
			msg.val('').removeClass('watermark');
		}
	});
			
	$('#formChat').submit(function() {
		if(msg.val() != '') {
			controller.send({type:'MSG', message:msg.val()});
			msg.val('');
		}
		return false;
	});

	$('#formNickname').submit(function() {
		if(name.val() != $.cookie('name')) {
			controller.send({type:'NICK', name:name.val()});
		}
		return false;
	});

	setInterval(function() {
		$(history).children('li').slice(100).detach();
	}, 60000);

	controller.register('DEQUEUE', fnDEQUEUE);
	controller.register('ENQUEUE', fnENQUEUE);
	controller.register('JOIN', fnJOIN);
	controller.register('MSG', fnMSG);
	controller.register('NAMES', fnNAMES);
	controller.register('NICK', fnNICK);
	controller.register('PART', fnPART);
	controller.register('PLAY', fnPLAY);
	controller.register('STOP', fnSTOP);
	controller.register('UPDATE', fnUPDATE);
}
