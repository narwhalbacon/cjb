#!/bin/sh

if [ "$3" -lt 5 ]; then
  bitrate=128000;
elif [ "$3" -lt 10 ]; then
  bitrate=96000;
else
  bitrate=56000;
fi

/usr/bin/ffmpeg -i $1 -acodec libmp3lame -ab $bitrate -ar 44100 -y $2
