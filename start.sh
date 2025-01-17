#!/bin/sh

# Start ngrok in the background
ngrok http 3000 &

# Start the Node.js application
npm start 