FROM node:alpine

# Install fonts for charts
RUN apk add --no-cache --update \
    libmount ttf-dejavu ttf-droid ttf-freefont ttf-liberation ttf-ubuntu-font-family fontconfig

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . /usr/src/app

# Install build depedencies for charts
RUN apk add --no-cache --virtual .build-deps git build-base g++ && \
	  apk add --no-cache --virtual .npm-deps cairo-dev libjpeg-turbo-dev pango && \
    npm install && \
    apk del .build-deps

EXPOSE 9000
CMD [ "node", "main.js" ]