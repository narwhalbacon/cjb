// where submitted music will go
exports.uploadDir = __dirname+'/uploads';

exports.page = {
	header: '&#x1d106; Collaborative Jukebox &#x1d107;'
	,footer: 'Now, play nice.'
	,title : 'Collaborative Jukebox'
	,description: 'A social place to share music interactively.'
	,author: 'Your Name Here'
	,scriptversion: 1
};

exports.server = {
	// if you change this, you'll need to edit static/js/controller.js, too
	port: 80
	,gettags: 1
};
