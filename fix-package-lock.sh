#!/bin/bash

# Fix package-lock.json issues for Docker deployment

set -e

echo "🔧 Fixing package-lock.json for Docker deployment..."

# Check if package-lock.json exists
if [ ! -f "package-lock.json" ]; then
    echo "❌ package-lock.json not found!"
    echo "🔄 Generating new package-lock.json..."
    
    # Remove node_modules if it exists
    if [ -d "node_modules" ]; then
        echo "🗑️ Removing existing node_modules..."
        rm -rf node_modules
    fi
    
    # Generate new package-lock.json
    npm install
    
    echo "✅ New package-lock.json generated"
else
    echo "✅ package-lock.json exists"
    
    # Verify package-lock.json is valid
    if npm ci --dry-run > /dev/null 2>&1; then
        echo "✅ package-lock.json is valid"
    else
        echo "⚠️ package-lock.json appears to be corrupted"
        echo "🔄 Regenerating package-lock.json..."
        
        # Backup existing file
        cp package-lock.json package-lock.json.backup
        
        # Remove and regenerate
        rm -f package-lock.json
        rm -rf node_modules
        npm install
        
        echo "✅ package-lock.json regenerated"
        echo "📁 Backup saved as package-lock.json.backup"
    fi
fi

echo "🎉 Package lock file is ready for Docker deployment!"