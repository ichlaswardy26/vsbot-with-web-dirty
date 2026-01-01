#!/bin/bash

echo "🔄 Restarting server with CSP fixes..."

# Kill any existing processes
echo "Stopping existing processes..."
pkill -f "node.*server" || true
pkill -f "node.*start" || true
pkill -f "node.*index" || true

# Wait a moment for processes to stop
sleep 2

echo "✅ Processes stopped"

# Clear any cached modules (if using nodemon or similar)
if command -v npm &> /dev/null; then
    echo "Clearing npm cache..."
    npm cache clean --force 2>/dev/null || true
fi

# Start the server
echo "🚀 Starting server with updated CSP configuration..."

# Check if we have a start script
if [ -f "start.js" ]; then
    echo "Using start.js..."
    node start.js
elif [ -f "index.js" ]; then
    echo "Using index.js..."
    node index.js
elif [ -f "package.json" ]; then
    echo "Using npm start..."
    npm start
else
    echo "❌ No start script found. Please start the server manually."
    echo "Try one of these commands:"
    echo "  node start.js"
    echo "  node index.js"
    echo "  npm start"
fi