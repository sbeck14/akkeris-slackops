FROM node:latest

# Install fonts for charts
# RUN apk add --no-cache --update \
#     libmount ttf-dejavu ttf-droid ttf-freefont ttf-liberation ttf-ubuntu-font-family fontconfig

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . /usr/src/app

# Install build depedencies for charts
# RUN apk add --no-cache \
#     build-base python g++ cairo-dev jpeg-dev pango-dev bash imagemagick && \
RUN npm install

EXPOSE 9000
CMD [ "node", "main.js" ]