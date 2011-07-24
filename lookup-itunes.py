#!/usr/bin/env python
# -*- coding: utf-8 -*-
 
import cjb, itunes, json, sys

if len(sys.argv) > 1:
	uartist = sys.argv[1]
	ualbum = sys.argv[2]
	utrack = sys.argv[3]
else:
	exit(0)

if not itunes.is_caching_enabled():
	itunes.enable_caching('/tmp/itunes_cache')

score = 0
url = {'itunes':''}

try:
	artist = itunes.search_artist(uartist)[0]
	if uartist == artist.get_name() or cjb.simple_compare(uartist, artist.get_name(), .90):
		url['itunes'] = artist.get_url()

		for album in artist.get_albums():
			albumscore = 0
		
			if ualbum == album.get_name():
				albumscore += 32
			elif cjb.simple_compare(ualbum, album.get_name(), .80):
				albumscore += 20
		
			for track in album.get_tracks():
				trackscore = 0
				if utrack == track.get_name():
					trackscore += 10
				elif cjb.simple_compare(utrack, track.get_name(), .90):
					trackscore += 20
		
				if(albumscore+trackscore) > score:
					score = albumscore+trackscore
					url['itunes'] = album.get_url()
except:
	exit(-1)

print json.dumps(url)

# score = 0
# if album = amazon.album, score += 32
# elsif album LIKE amazon.album (80%), score += 20
# foreach track:
#  if track == amazon.track, score += 10
#  elsif track LIKE amazon.track (90%), score += 8
# highest score wins
