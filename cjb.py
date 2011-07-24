#!/usr/bin/env python
# -*- coding: utf-8 -*-
# use a dynamically populated translation dictionary to remove accents
# from a string
# http://chmullig.com/2009/12/python-unicode-ascii-ifier/
 
from re import sub
import sys, unicodedata

def levenshtein(a,b):
	"Calculates the Levenshtein distance between a and b."
	n, m = len(a), len(b)
	if n > m:
		# Make sure n <= m, to use O(min(n,m)) space
		a,b = b,a
		n,m = m,n
		 
	current = range(n+1)
	for i in range(1,m+1):
		previous, current = current, [i]+[0]*n
		for j in range(1,n+1):
			add, delete = previous[j]+1, current[j-1]+1
			change = previous[j-1]
			if a[j-1] != b[i-1]:
				change = change + 1
			current[j] = min(add, delete, change)
			 
	return current[n]

 
class unaccented_map(dict):
# Translation dictionary.  Translation entries are added to this dictionary as needed.
	CHAR_REPLACEMENT = {
		0xc6: u"AE", # Æ LATIN CAPITAL LETTER AE
		0xd0: u"D",  # Ð LATIN CAPITAL LETTER ETH
		0xd8: u"OE", # Ø LATIN CAPITAL LETTER O WITH STROKE
		0xde: u"Th", # Þ LATIN CAPITAL LETTER THORN
		0xc4: u'Ae', # Ä LATIN CAPITAL LETTER A WITH DIAERESIS
		0xd6: u'Oe', # Ö LATIN CAPITAL LETTER O WITH DIAERESIS
		0xdc: u'Ue', # Ü LATIN CAPITAL LETTER U WITH DIAERESIS
 
		0xc0: u"A", # À LATIN CAPITAL LETTER A WITH GRAVE
		0xc1: u"A", # Á LATIN CAPITAL LETTER A WITH ACUTE
		0xc3: u"A", # Ã LATIN CAPITAL LETTER A WITH TILDE
		0xc7: u"C", # Ç LATIN CAPITAL LETTER C WITH CEDILLA
		0xc8: u"E", # È LATIN CAPITAL LETTER E WITH GRAVE
		0xc9: u"E", # É LATIN CAPITAL LETTER E WITH ACUTE
		0xca: u"E", # Ê LATIN CAPITAL LETTER E WITH CIRCUMFLEX
		0xcc: u"I", # Ì LATIN CAPITAL LETTER I WITH GRAVE
		0xcd: u"I", # Í LATIN CAPITAL LETTER I WITH ACUTE
		0xd2: u"O", # Ò LATIN CAPITAL LETTER O WITH GRAVE
		0xd3: u"O", # Ó LATIN CAPITAL LETTER O WITH ACUTE
		0xd5: u"O", # Õ LATIN CAPITAL LETTER O WITH TILDE
		0xd9: u"U", # Ù LATIN CAPITAL LETTER U WITH GRAVE
		0xda: u"U", # Ú LATIN CAPITAL LETTER U WITH ACUTE
 
		0xdf: u"ss", # ß LATIN SMALL LETTER SHARP S
		0xe6: u"ae", # æ LATIN SMALL LETTER AE
		0xf0: u"d",  # ð LATIN SMALL LETTER ETH
		0xf8: u"oe", # ø LATIN SMALL LETTER O WITH STROKE
		0xfe: u"th", # þ LATIN SMALL LETTER THORN,
		0xe4: u'ae', # ä LATIN SMALL LETTER A WITH DIAERESIS
		0xf6: u'oe', # ö LATIN SMALL LETTER O WITH DIAERESIS
		0xfc: u'ue', # ü LATIN SMALL LETTER U WITH DIAERESIS
 
		0xe0: u"a", # à LATIN SMALL LETTER A WITH GRAVE
		0xe1: u"a", # á LATIN SMALL LETTER A WITH ACUTE
		0xe3: u"a", # ã LATIN SMALL LETTER A WITH TILDE
		0xe7: u"c", # ç LATIN SMALL LETTER C WITH CEDILLA
		0xe8: u"e", # è LATIN SMALL LETTER E WITH GRAVE
		0xe9: u"e", # é LATIN SMALL LETTER E WITH ACUTE
		0xea: u"e", # ê LATIN SMALL LETTER E WITH CIRCUMFLEX
		0xec: u"i", # ì LATIN SMALL LETTER I WITH GRAVE
		0xed: u"i", # í LATIN SMALL LETTER I WITH ACUTE
		0xf2: u"o", # ò LATIN SMALL LETTER O WITH GRAVE
		0xf3: u"o", # ó LATIN SMALL LETTER O WITH ACUTE
		0xf5: u"o", # õ LATIN SMALL LETTER O WITH TILDE
		0xf9: u"u", # ù LATIN SMALL LETTER U WITH GRAVE
		0xfa: u"u", # ú LATIN SMALL LETTER U WITH ACUTE
 
		0x2018: u"'", # ‘ LEFT SINGLE QUOTATION MARK
		0x2019: u"'", # ’ RIGHT SINGLE QUOTATION MARK
		0x201c: u'"', # “ LEFT DOUBLE QUOTATION MARK
		0x201d: u'"', # ” RIGHT DOUBLE QUOTATION MARK
 
		}
 
	# Maps a unicode character code (the key) to a replacement code
	# (either a character code or a unicode string).
	def mapchar(self, key):
		ch = self.get(key)
		if ch is not None:
			return ch
		try:
			de = unicodedata.decomposition(unichr(key))
			p1, p2 = [int(x, 16) for x in de.split(None, 1)]
			if p2 == 0x308:
				ch = self.CHAR_REPLACEMENT.get(key)
			else:
				ch = int(p1)
 
		except (IndexError, ValueError):
			ch = self.CHAR_REPLACEMENT.get(key, key)
		self[key] = ch
		return ch
 
	if sys.version <= "2.5":
		# use __missing__ where available
		__missing__ = mapchar
	else:
		# otherwise, use standard __getitem__ hook (this is slower,
		# since it's called for each character)
		__getitem__ = mapchar
 
map = unaccented_map()
 
def asciify(input):
	try:
		return input.encode('ascii')
	except AttributeError:
		return str(input).encode('ascii')
	except UnicodeEncodeError:
			return unicodedata.normalize('NFKD', input.translate(map)).encode('ascii', 'replace')
	except:
		return input

def simplify(text):
	text.rstrip("\n")
	if(text == ''):
		return text

	text = asciify(text)
	text = text.lower()
	text = sub(r'\[[^\]]+\]', r'', text)
	text = sub(r'[\s_]', r' ', text)

	if text.__len__ > 5:
		text = sub(r'\bthe\s', r'', text)
		text = sub(r'\ba\s', r'', text)
		text = sub(r'\ban\s', r'', text)
		text = sub(r'\band\s', r'', text)
		text = sub(r'\ble\s', r'', text)
		text = sub(r'\bles\s', r'', text)
		text = sub(r'\bla\s', r'', text)
		text = sub(r'\bde\s', r'', text)

	text = sub(r'\b10\s', r'ten ', text)
	text = sub(r'\b9\s', r'nine ', text)
	text = sub(r'\b8\s', r'eight ', text)
	text = sub(r'\b7\s', r'seven ', text)
	text = sub(r'\b6\s', r'six ', text)
	text = sub(r'\b5\s', r'five ', text)
	text = sub(r'\b4\s', r'four ', text)
	text = sub(r'\b3\s', r'three ', text)
	text = sub(r'\b2\s', r'two ', text)
	text = sub(r'\b1\s', r'one ', text)
	text = sub(r'\b0\s', r'zero ', text)

	text = sub(r'\bii\s', r'two ', text)
	text = sub(r'\biii\s', r'three ', text)
	text = sub(r'\biv\s', r'four ', text)
	text = sub(r'\bv\s', r'five ', text)
	text = sub(r'\bvi\s', r'six ', text)
	text = sub(r'\bvii\s', r'seven ', text)
	text = sub(r'\bviii\s', r'eight ', text)

	text = sub(r'[^a-z0-9]', r'', text)
	return text

def simple_compare(a, b, similar_percent):
	sa = simplify(a)
	sb = simplify(b)
	if(sa == sb):
		return 1

	smin = min(sa.__len__(), sb.__len__())

	if(smin == 0):
		return

	dist = levenshtein(sa, sb)

	if(dist and (((smin-dist)/smin) >= similar_percent)):
		return -1

	if(smin < 10):
		return 0
	
	if(sa[0:smin] == sb[0:smin]):
		return -1

	return 0;

