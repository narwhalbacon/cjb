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

		if(parseInt(muteone.data('status'),10)) {
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

		if(parseInt(muteone.data('status'),10) || parseInt(muteall.data('status'),10)) {
			sound.mute();
		}
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
		var status = parseInt(button.data('status')) == 1;
		button.data('status', status?"0":"1");
		button.html( status ? button.data('mute') : button.data('unmute') );
		if(sound) {
			if(parseInt(muteone.data('status'),10) || parseInt(muteall.data('status'),10)) {
				sound.mute();
			} else {
				sound.unmute();
			}
		}
		if(button.attr('id') == 'muteall') {
			muteone.attr('disabled', status?'':'disabled');
		}
	});

	// does the browser support input[type=range] ?
	if(Modernizr.inputtypes.range) {
		$('#volume').change(function(e) {
			if(sound) {
				soundManager.setVolume('cjb', parseInt($(e.target).val(), 10));
			}
		});
	} else {
		$('#volume').parent().hide();
	}

	controller.register('PLAY', fnPLAY);
	controller.register('STOP', fnSTOP);
}
