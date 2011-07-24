function Chat(socket) {
	// PUBLIC

	// PRIVATE
	var accordion = $('#memberAccordion')
		,enter = null
		,history = $('#chatHistory')
		,isPlaying = 0
		,leave = null
		,memberbox = $('#chatMembers')
		,membercnt = $('#memberCount')
		,members = {}
		,msg = $('#message')
		,name = $('#nickname')
		,theme = $('#theme')
		,zebra = 0
		;


	socket.on('HISTORY', function(data) {
		zebra = 0;
		history.html('');
		for(var i in data.chat) {
			var element = data.chat[i];
			switch(element[1]) {
				case 'MSG':
					renderMessage(getHHMM(element[0]), element[2].name, element[2].message);
					break;
				case 'NOTICE':
					renderNotice(getHHMM(element[0]), element[2]);
					break;
			}
		}
	});

	socket.on('JOIN', function(data) {
		members[data.uuid] = data.name;
		var button = $('<button>')
				.hide()
				.attr('id', 'member-'+data.uuid)
				.html(data.name)
				.button();
		memberbox.append(button);
		accordion.resize();
		button.fadeIn(1000, function() {button.css('display', 'inline-block')});
		membercnt.html(Object.keys(members).length);
		if(enter && parseInt($.cookie('sfx'), 10)) { enter.play(); }
	});

	socket.on('MSG', function (data) {
		if(data.uuid in members) {
			renderMessage(getHHMM(), members[data.uuid], data.message);
		}
	});
		
	socket.on('NAMES', function(data) {
		var newmembers = {};
		for(var i in data) {
			if(typeof(data[i]) == 'string') {
				newmembers[i] = data[i];
			}
		}
		members = newmembers;
		redrawMembers();
	});

	socket.on('NICK', function(data) {
		if(data.uuid == $.cookie('uuid')) {
			$.cookie('name', data.name);
			name.val(data.name);
		}
		members[data.uuid] = data.name;
		$('#member-'+data.uuid)
			.button('option', 'label', data.name)
			.effect('highlight', 2000);
	});

	socket.on('NOTICE', function(message) {
		renderNotice(getHHMM(), message);
	});

	socket.on('PART', function(uuid) {
		if(uuid in members) {
			delete members[uuid];
			var button = $('#member-'+uuid);
			button.fadeOut(1000, function() {
				button.remove();
			});
			accordion.resize();
			membercnt.html(Object.keys(members).length);
			if(leave && parseInt($.cookie('sfx'), 10)) { leave.play(); }
		}
	});

	socket.on('THEME', function(message) {
		if(!message || message == '') {
			theme.html(theme.data('default'));
		} else {
			theme.html(escapeHTML(message));
		}
	});

	function redrawMembers() {
		memberbox.html('');
		$.each(members, function(k,v) {
			var button = $('<button>')
				.attr('id', 'member-'+k)
				.html(v)
				.button();
			memberbox.append(button);
		});
		accordion.resize();
		membercnt.html(Object.keys(members).length);
		$('#member-'+$.cookie('uuid'))
			.addClass('ui-state-highlight')
			.attr('title', 'Click to change your name')
			.click(function() {$('#nicknameDialog').dialog('open');})
			;
	} 

	function renderMessage(hhmm, name, message) {
		var oddeven = (zebra++%2) ? 'odd':'even';
		history.prepend('<li class="'+oddeven+'">'
				+'<span class="ts">'+hhmm+'</span>'
				+' <strong>'+name+'</strong>:'
				+' '+escapeHTML(message)+'</li>');  
	}

	function renderNotice(hhmm, message) {
		var oddeven = (zebra++%2) ? 'odd':'even';
		history.prepend('<li class="announce '+oddeven+'">'
				+'<span class="ts">'+hhmm+'</span>'
				+' '+message+'</li>');
	}

	// initialize
	msg.val(msg.data('watermark')).addClass('watermark').click(function() {
		if(msg.val() == msg.data('watermark')) {
			msg.val('').removeClass('watermark');
		}
	});
			
	$('#formChat').submit(function() {
		if(msg.val() !== '') {
			socket.emit('MSG', msg.val());
			msg.val('');
		}
		return false;
	});

	$('#formNickname').submit(function() {
		if(name.val() != $.cookie('name')) {
			socket.emit('NICK', name.val());
		}
		$('#nicknameDialog').dialog('close');
		return false;
	});

	if($.cookie('name') == null) {
		$('#firsttime').show().delay(10000).hide('fade',2000);
	}

	soundManager.onready(function() {
		enter = soundManager.createSound({
			id:'enter'
			,url:'/sfx/enter.mp3'
			,autoLoad: true
			,autoPlay: false
			,volume:25
		});

		leave = soundManager.createSound({
			id:'leave'
			,url:'/sfx/leave.mp3'
			,autoLoad: true
			,autoPlay: false
			,volume:25
		});
	});

}
