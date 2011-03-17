function Player(controller) {
	// PUBLIC

	// PRIVATE
	var isPlaying = 0
		,muteone = $('#muteone')
		,muteall = $('#muteall')
		,remaining = $('#songRemaining')
		,self  = this
		,sound = null
		;

	function fnPLAY(data) {
		var start = new Date().getTime();

		if(isPlaying) {
			return;
		}

		if(muteone.data('status')) {
			muteone.click();
		}

		sound = soundManager.createSound({
			id:"cjb"
			,url:'/music/'+data.song.uuid+'.mp3'
			,autoLoad: true
			,autoPlay: false
			,whileloading:function(){
				// attempt to start at the correct time, adjusting for loading time
				if(!isPlaying) {
					var position = data.position+((new Date().getTime()-start));
					if(this.duration > position) {
						this.setPosition(position);
						this.play();
					}
				}
			}
			,onplay:function(){ isPlaying = 1; }
			,whileplaying:function() { 
				switch(this.readyState) {
					case 0: remaining.html('');break;
					case 1: remaining.html('(buffering)');break;
					case 2: remaining.html('(failed/error)');break;
					case 3: remaining.html('('+calcDuration(this.duration-this.position)+')');break;
					default: remaining.html('');break;
				}
			}
		});

		if(muteone.data('status') || muteall.data('status')) { sound.mute(); }
	}

	function fnSTOP(data) {
		isPlaying = 0;
		remaining.html('');
		if(sound) {
			sound.stop();
			sound.unload();
			sound.destruct();
			sound = null; 
		}
	}

	// PRIVILEGED

	// initialize
	$('#muteone, #muteall').click(function(e) {
		var button = $(e.target);
		var status = button.data('status', !button.data('status')).data('status');
		button.html( status ? button.data('unmute') : button.data('mute') );
		if(sound) {
			if(muteone.data('status') || muteall.data('status')) {
				sound.mute();
			} else {
				sound.unmute();
			}
		}
		if(button.attr('id') == 'muteall') {
			muteone.attr('disabled', status?'disabled':'');
		}
	});

	controller.register('PLAY', fnPLAY);
	controller.register('STOP', fnSTOP);

	soundManager.debugMode = false;
	soundManager.defaultOptions.volume = 50;
	soundManager.url = '/swf/';
	//soundManager.useHTML5Audio = $('html').hasClass('audio');	// use html5 audio if available
	soundManager.onerror = function() { $('#error').html('SoundManager failed to load; perhaps you are blocking Flash?'); };
	soundManager.onready(function() { controller.send({type:'READY'}); });
}
