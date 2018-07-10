FROM node:boron

# Create app directory
RUN mkdir -p /usr/src/app
RUN mkdir -p /usr/src/app/Scripts
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

# Bundle app source
COPY . /usr/src/app
COPY ./Scripts /usr/src/app/Scripts

EXPOSE 9306/tcp
EXPOSE 9308/tcp
CMD [ "node", "./Scripts/main.js" ]
