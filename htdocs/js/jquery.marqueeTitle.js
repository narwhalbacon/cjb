/**
 * Title Marquee
 * http://blog.dreasgrech.com/2010/02/scrolling-page-title-with-javascript.html
 * This is slightly modified
 */
(function ($) {
	var shift = {
		"left": function (a) {
			a.push(a.shift());
		},
		"right": function (a) {
			a.unshift(a.pop());
		}
	};

	$.marqueeTitle = function (options) {
		var opts = $.extend({}, {
					dir: "left"
					,speed: 200
					,text: ""
        			}, options)
			,t = (opts.text || document.title).split("");
		if (!t) {
			return null;
		}
		t.push(" ");
		return setInterval(function () {
			var f = shift[opts.dir];
			if (f) {
				f(t);
				document.title = t.join("");
			}
		}, opts.speed);
	};
}(jQuery));
