# Collaborative Jukebox

## Changelog

### 2011-07-21 - History, iTunes, UI redesign 
### 2011-07-04 - Updated for Socket.IO v0.7
### 2011-03-09 - Initial Release

## Installation

To use this application, you need:

* node.js ([http://nodejs.org/](http://nodejs.org/)).
* npm ([http://npmjs.org/](http://npmjs.org/))
	* bootstrap the node environment: `npm install express formidable socket.io`
* ffmpeg with libmp3lame installed.  If you want to support AAC, OGG, and Flac, you will want those libraries, too.  Debian users should use debian-multimedia.org; Ubuntu users can use medibuntu.org.  Or compile from source.
* Optional: For tag/album cover support, you will need Python and the following modules:
	* mutagen
	* PythonMagick
* Optional: For Amazon link support, you will need Python and the following modules:
	* amazonproduct [https://bitbucket.org/basti/python-amazon-product-api/](https://bitbucket.org/basti/python-amazon-product-api/)
* Optional: For iTunes link support, you will need Python and the following modules:
	* itunes [https://github.com/ocelma/python-itunes/](https://github.com/ocelma/python-itunes/)


## Third-Party Software:

This application uses the following third-party software/libraries:

* ajaxupload - [http://github.com/valums/ajax-upload](http://github.com/valums/ajax-upload)
* html5boilerplate - [http://html5boilerplate.com/](http://html5boilerplate.com/)
* jQuery - [http://github.com/jquery/jquery](http://github.com/jquery/jquery)
* jQuery UI - [http://github.com/jquery/jquery-ui](http://github.com/jquery/jquery-ui)
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
