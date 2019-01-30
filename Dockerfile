FROM node:alpine

USER root

ARG NPMPROXY

# Set proxy for npm
RUN npm config set proxy=${NPMPROXY}
RUN npm config set https-proxy=${NPMPROXY}
RUN npm config set strict-ssl=false

# Install pm2
RUN npm install pm2 -g 

# Install pm2 log rotate and configure it
RUN pm2 install pm2-logrotate
RUN pm2 set pm2-logrotate:max_size 10M
RUN pm2 set pm2-logrotate:retain 10
RUN pm2 set pm2-logrotate:compress true
RUN pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
RUN pm2 set pm2-logrotate:rotateModule true
RUN pm2 set pm2-logrotate:workerInterval 30
RUN pm2 set pm2-logrotate:rotateInterval '0 0 * * *'

# Create app client directory
WORKDIR /usr/src/app

# Install client app dependencies
COPY app/client ./client
COPY app/ecosystem.config.js ./ecosystem.config.js
COPY app/package.json ./package.json
COPY app/server ./server
COPY app/gulpfile.js ./gulpfile.js
COPY app/node_modules/tar ./node_modules/tar

# Install dependencies
RUN npm install
RUN npm run build
RUN npm prune --production

# Remove proxy config for npm, it is useless now
RUN npm config rm proxy
RUN npm config rm https-proxy

# Set envrionment variables
ENV PORT 3000

# Expose app port
EXPOSE ${PORT}

# Monitor app with pm2
CMD ["pm2-runtime", "--json", "start", "ecosystem.config.js", "--env", "production"]
