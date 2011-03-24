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
	port: 8080
	,gettags: 0             // read tags from files (requires Perl)
	,maxtranscode: 3        // maximum number of transcoding processes at any one time
};
