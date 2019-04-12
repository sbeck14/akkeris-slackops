FROM node:alpine
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . /usr/src/app
RUN apk add --no-cache --virtual .build-deps alpine-sdk python && \
    npm install && \
    apk del .build-deps
EXPOSE 9000
CMD [ "node", "main.js" ]