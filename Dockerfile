FROM node:18-alpine

# Install ngrok
RUN wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz \
    && tar xvzf ngrok-v3-stable-linux-amd64.tgz -C /usr/local/bin \
    && rm ngrok-v3-stable-linux-amd64.tgz

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Set up ngrok configuration
RUN mkdir -p /root/.ngrok2
RUN echo "authtoken: ${NGROK_TOKEN}\nversion: 2\nregion: ${REGION:-ap}" > /root/.ngrok2/ngrok.yml

# Expose port for dashboard
EXPOSE 3000

# Start script
COPY start.sh /
RUN chmod +x /start.sh

# Start the application
CMD ["/start.sh"]