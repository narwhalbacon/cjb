/* Authmr: */

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

function generateUuid() {
	return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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
	html += $('#time24').prop('checked') ? time24 : time12;
	html += '</span>';
	
	return html;
}

function displayCorrectTime() {
	var time24 = $('#time24').prop('checked');
        $('.clock').each(function() { $(this).html( time24 ? $(this).data('time24') : $(this).data('time12') ); });
}

$(document).ready(function() {   
	var controller = new Controller();
	var socket     = controller.socket();
	var chat       = new Chat(socket);
	var queue      = new Queue(socket);

	$('.accordion').accordion({
		autoHeight:false
		,collapsible:true
	});

	$('#nicknameDialog').dialog({
		autoOpen: false
		//,height: 200
		//,width: 300
		,modal: true
		//,open: function(event, ui) {
		//	var nickname = $('#nickname');
		//	nickname.css('width', nickname.parent().css('width'));
		//}
		//,resize: function(event, ui) {
		//	var nickname = $('#nickname');
		//	nickname.css('width', nickname.parent().css('width'));
		//}
		,buttons: {
			Change: function() {
				$('#formNickname').submit();
			},
			Cancel: function() {
				$(this).dialog('close');
			}
		}
	});
	$('#configDialog').dialog({
		autoOpen: false
		,modal: true
	});
	
	$(window).resize(function() {
		var message = $('#message');
		message.width(message.parent().width());
		var volume = $('#volume');
		volume.width(volume.parent().width()-25);
	}).resize();

	var a = new AjaxUpload('add', {
		action: '/upload',
		name: 'song',
		autoSubmit:true,
		onSubmit:function(file,extension){ $('#add').button('option', 'disabled', 'disabled'); },
		onComplete:function(file,response){ $('#add').button('option', 'disabled', ''); }
	});

	// allow user to toggle between a 24-hour and a 12-hour clock
	$('#time12, #time24').click(function() {
		$.cookie('time24', $(this).val());
		displayCorrectTime();
		return true;
	});

	$('#sfx0, #sfx1').click(function() {
		$.cookie('sfx', $(this).val());
		return true;
	});

	// set the user's default
	if($.cookie('time24') !== null) {
		if(parseInt($.cookie('time24'), 10) == 0) {
			$('#time12').prop('checked', true);
		}
		displayCorrectTime();
	}

	if($.cookie('sfx') !== null) {
		if(parseInt($.cookie('sfx'), 10) == 1) {
			$('#sfx1').prop('checked', true);
		}
	}

	$('#clock').buttonset();
	$('#sfx').buttonset();
	$('button').button();

	// conditional motd for bugs, etc
	//if(navigator.userAgent.indexOf('Firefox')>-1) {
	//	$('#motd').show('fade', 2000);
	//}

	$('#config').click(function(){$('#configDialog').dialog('open');});
});
