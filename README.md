# Collaborative Jukebox

## Changelog

### 1.0 - 2011-03-09 - Initial Release

## Installation

To use this application, you need:

* node.js ([http://nodejs.org/](http://nodejs.org/)).  I used version 0.4.2.
* npm ([http://npmjs.org/](http://npmjs.org/))
	* bootstrap the node environment: `npm install express ejs formidable socket.io`
* ffmpeg with libmp3lame installed.  If you want to support AAC, OGG, and Flac, you'll want those libraries, too.  Debian users should use debian-multimedia.org; Ubuntu users can use medibuntu.org.  Or compile from source.
* Optional: Perl and the following modules.  Without these, the site will not parse the media files for tags or covers.
	* Image::Magick
	* Music::Tag
	* Music::Tag::FLAC
	* Music::Tag::M4A
	* Music::Tag::MP3
	* Music::Tag::OGG
	* Music::Tag::Amazon (optional)
		* If you want Amazon support, edit the gettags.pl script to set your Amazon Developer token and secret key.
* Review and edit the settings in config.js
* To run the application, execute `node ./server.js` and connect with a web browser.

## Third-Party Software:

This application uses the following third-party software/libraries:

* ajaxupload - [http://github.com/valums/ajax-upload](http://github.com/valums/ajax-upload)
* html5boilerplate - [http://html5boilerplate.com/](http://html5boilerplate.com/)
* jQuery - [http://github.com/jquery/jquery](http://github.com/jquery/jquery)
* modernizr - [http://github.com/Modernizr/Modernizr](http://github.com/Modernizr/Modernizr)
* Socket.IO - [http://github.com/LearnBoost/Socket.IO](http://github.com/LearnBoost/Socket.IO)
* soundmanager2 - [http://github.com/scottschiller/SoundManager2](http://github.com/scottschiller/SoundManager2)


## License:

Major components:

* ajaxupload - MIT license
* html5boilerplate - Public Domain
* jQuery: MIT/GPL license
* Modernizr: MIT/BSD license
* Socket.IO - MIT license
* soundmanager2 - BSD license
