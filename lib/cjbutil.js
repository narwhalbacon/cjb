var unlink = require('fs').unlink
	,util = require('util');

exports.escapeHtml = function(str) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

exports.generateUuid = function() {
	return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
		return v.toString(16);
	}).toUpperCase();
};

exports.unlinkFile = function(filename) {
	unlink(filename, function(e) {
		util.log('Unlinked '+(e?e:filename));
	});
};
