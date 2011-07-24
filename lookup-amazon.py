#!/usr/bin/env python

from amazonproduct import API
import cjb, json, sys

AWS_KEY = ''
SECRET_KEY = ''

if AWS_KEY == '':
	exit(0)

if len(sys.argv) > 1:
	uartist = sys.argv[1]
	ualbum = sys.argv[2]
	utrack = sys.argv[3]
else:
	exit(0)

score = 0
url = {'Amazon':''}

api = API(AWS_KEY, SECRET_KEY, 'us')
node = api.item_search('Music', Artist=uartist, Title=ualbum, Track=utrack, ResponseGroup="Large")
for item in node.Items.Item:
	if not hasattr(item, 'Tracks'):
		continue

	if uartist != item.ItemAttributes.Artist.pyval and not cjb.simple_compare(uartist, item.ItemAttributes.Artist.pyval, .90):
		continue

	albumscore = 0
	if ualbum == item.ItemAttributes.Title:
		albumscore += 32
	elif cjb.simple_compare(ualbum, item.ItemAttributes.Title.pyval, .80):
		albumscore += 20
	
	for disc in item.Tracks.Disc:
		for track in disc.Track:
			trackscore = 0
			if utrack == track.pyval:
				trackscore += 10
			elif cjb.simple_compare(utrack, track.pyval, .90):
				trackscore += 20

			if(albumscore+trackscore) > score:
				score = albumscore+trackscore
				url['Amazon'] = item.DetailPageURL.pyval

print json.dumps(url)

# score = 0
# if album = amazon.album, score += 32
# elsif album LIKE amazon.album (80%), score += 20
# foreach track:
#  if track == amazon.track, score += 10
#  elsif track LIKE amazon.track (90%), score += 8
# highest score wins
