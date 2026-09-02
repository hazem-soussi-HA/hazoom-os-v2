#!/bin/bash
set -e

echo "🚀 HAZOOM OS Deployment Script"
echo "================================"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Installing..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js $(node -v) found"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Health check
echo "🏥 Running health check..."
node health.js

# Start service
echo "🚀 Starting HAZOOM OS..."
if command -v pm2 &> /dev/null; then
    pm2 start server.js --name hazoom-os
    pm2 save
    echo "✅ HAZOOM OS started with PM2"
else
    echo "⚠️  PM2 not found. Starting with node..."
    node server.js &
    echo "✅ HAZOOM OS started (PID: $!)"
fi

echo ""
echo "================================"
echo "✅ HAZOOM OS is running!"
echo "🌐 http://localhost:8888"
echo "🏥 Health: node health.js"
echo "================================"
