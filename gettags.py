#!/usr/bin/env python

from cgi import escape
from math import floor
from mutagen import File
from mutagen.easyid3 import EasyID3
from os import unlink
from pprint import pprint
from PythonMagick import Image, Blob
from tempfile import NamedTemporaryFile
import json
import sys

def extractCover(uuid, data):
	"""Extract the cover, resize, and save."""
	f = NamedTemporaryFile(delete=False)
	f.write(data)
	f.close()
	image = Image(f.name)
	image.magick('JPEG') 
	image.sample('256x256')
	image.write('htdocs/images/'+uuid+'.jpg')
	unlink(f.name)

if len(sys.argv) > 1:
	fname = sys.argv[1]
	uuid = sys.argv[2]
else:
	exit(0)

data = {}
audio = File(fname, easy=True)
if hasattr(audio, 'mime') == False:
	exit(0)

for f in set(['title','artist','album']):
	if audio.has_key(f): data[f] = escape(audio[f][0])
data['length'] = int(floor(audio.info.length*1000))

# now try to extract the cover.
audio = File(fname, easy=False)

# each filetype has a different method
if 'audio/vorbis' in audio.mime or 'audio/x-flac' in audio.mime:
	for f in set(['title','artist','album']):
		if audio.has_key(f): data[f] = escape(audio[f][0])
	if audio.has_key('pictures'):
		data['cover'] = uuid+'.jpg';
		extractCover(uuid, audio['pictures'][0])

if 'audio/aac' in audio.mime:
	if audio.has_key('covr'):
		data['cover'] = uuid+'.jpg';
		extractCover(uuid, audio['covr'][0])

if 'audio/mp3' in audio.mime:
	if audio.has_key('TIT2'): data['title'] = escape(audio['TIT2'][0])
	if audio.has_key('TPE1'): data['artist'] = escape(audio['TPE1'][0])
	if audio.has_key('TALB'): data['album'] = escape(audio['TALB'][0])
	if audio.has_key('APIC:'):
		data['cover'] = uuid+'.jpg';
		extractCover(uuid, audio['APIC:'].data)

print json.dumps(data)
