function Player(controller) {
	// PUBLIC

	// PRIVATE
	var isPlaying = 0
		,mute = 0
		,remaining = $('#songRemaining')
		,self  = this
		,sound = null
		;

	function fnPLAY(data) {
		var start = new Date().getTime();

		if(isPlaying) {
			return;
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
					case 1: remaining.html('(loading)');break;
					case 2: remaining.html('(failed/error)');break;
					case 3: remaining.html('('+calcDuration(this.duration-this.position)+')');break;
					default: remaining.html('');break;
				}
			}
		});

		if(mute) { sound.mute(); }
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
	$('#mute').click(function(e) {
		var button = $(e.target);
		button.html( button.html() == 'Mute' ? 'Unmute' : 'Mute' );
		mute = !mute;
		if(sound) {
			mute ? sound.mute() : sound.unmute();
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
