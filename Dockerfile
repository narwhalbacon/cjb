FROM node:latest

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN echo deb http://www.deb-multimedia.org jessie main non-free >> /etc/apt/sources.list
RUN echo deb-src http://www.deb-multimedia.org jessie main non-free >> /etc/apt/sources.list

# RUN apt-get install deb-multimedia-keyring

RUN apt-get update && apt-get install -y --force-yes \
    python-pip \
    ffmpeg \
    libmp3lame0

COPY package.json /usr/src/app
RUN npm install

# RUN pip install \
#     mutagen \
#     PythonMagick \
#     amazonproduct \
#     python-itunes

COPY . /usr/src/app

EXPOSE 13001

CMD ["npm", "start"]
