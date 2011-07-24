// configure soundManager
soundManager.debugMode = false;
soundManager.defaultOptions.volume = $('#volume').val();
soundManager.url = '/swf/';
soundManager.useHTML5Audio = $('html').hasClass('audio');     // use html5 audio if available
soundManager.onerror = function() { $('#error').html('SoundManager failed to load; perhaps you are blocking Flash?'); };


// usage: log('inside coolFunc', this, arguments);
// paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function(){
  log.history = log.history || [];   // store logs to an array for reference
  log.history.push(arguments);
  if(this.console) console.log( Array.prototype.slice.call(arguments) );
};

// place any jQuery/helper plugins in here, instead of separate, slower script files.

/**
 * Cookie plugin
 *
 * Copyright (c) 2006 Klaus Hartl (stilbuero.de)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 */
jQuery.cookie=function(d,c,a){if(typeof c!="undefined"){a=a||{expires:90};if(c===null){c="";a.expires=-1}var b="";if(a.expires&&(typeof a.expires=="number"||a.expires.toUTCString)){if(typeof a.expires=="number"){b=new Date;b.setTime(b.getTime()+a.expires*24*60*60*1E3)}else b=a.expires;b="; expires="+b.toUTCString()}var e=a.path?"; path="+a.path:"",f=a.domain?"; domain="+a.domain:"";a=a.secure?"; secure":"";document.cookie=[d,"=",encodeURIComponent(c),b,e,f,a].join("")}else{c=null;if(document.cookie&&document.cookie!=
""){a=document.cookie.split(";");for(b=0;b<a.length;b++){e=jQuery.trim(a[b]);if(e.substring(0,d.length+1)==d+"="){c=decodeURIComponent(e.substring(d.length+1));break}}}return c}};

/**
 * Title Marquee
 * http://blog.dreasgrech.com/2010/02/scrolling-page-title-with-javascript.html
 * This is slightly modified
 */
(function(d){var f={left:function(a){a.push(a.shift())},right:function(a){a.unshift(a.pop())}};d.marqueeTitle=function(a){var c=d.extend({},{text:"",dir:"left",speed:500},a),b=(c.text||document.title).split("");if(b){b.push(" ");return setInterval(function(){var e=f[c.dir];if(e){e(b);document.title=b.join("")}},c.speed)}}})(jQuery);

/**
 * For Internet Explorer < v9
 * http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
 */
Object.keys=Object.keys||function(){var e=Object.prototype.hasOwnProperty,f=!{toString:null}.propertyIsEnumerable("toString"),c=["toString","toLocaleString","valueOf","hasOwnProperty","isPrototypeOf","propertyIsEnumerable","constructor"],g=c.length;return function(b){if(typeof b!="object"&&typeof b!="function"||b===null)throw new TypeError("Object.keys called on a non-object");var d=[],a;for(a in b)e.call(b,a)&&d.push(a);if(f)for(a=0;a<g;a++)e.call(b,c[a])&&d.push(c[a]);return d}}();
