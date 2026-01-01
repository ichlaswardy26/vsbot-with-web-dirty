#!/bin/bash

echo "🐳 Docker CSP Fix - Restart Container"
echo "====================================="

# Function to check if docker-compose is available
check_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
        echo "docker compose"
    else
        echo "none"
    fi
}

# Function to find the correct docker-compose file
find_compose_file() {
    local files=("docker-compose.yml" "docker-compose.prod.yml" "docker-compose.ssl.yml")
    
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            echo "$file"
            return
        fi
    done
    
    echo ""
}

echo "1️⃣  Checking Docker setup..."

# Check Docker availability
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

# Check Docker Compose
COMPOSE_CMD=$(check_docker_compose)
if [ "$COMPOSE_CMD" = "none" ]; then
    echo "❌ Docker Compose not found."
    echo "Using direct docker commands instead..."
    USE_COMPOSE=false
else
    echo "✅ Found: $COMPOSE_CMD"
    USE_COMPOSE=true
fi

# Find compose file
if [ "$USE_COMPOSE" = true ]; then
    COMPOSE_FILE=$(find_compose_file)
    if [ -n "$COMPOSE_FILE" ]; then
        echo "✅ Found compose file: $COMPOSE_FILE"
    else
        echo "⚠️  No docker-compose.yml found, using direct docker commands"
        USE_COMPOSE=false
    fi
fi

echo ""
echo "2️⃣  Stopping current containers..."

if [ "$USE_COMPOSE" = true ]; then
    # Using Docker Compose
    if [ -n "$COMPOSE_FILE" ]; then
        $COMPOSE_CMD -f "$COMPOSE_FILE" down
    else
        $COMPOSE_CMD down
    fi
    echo "✅ Containers stopped via Docker Compose"
else
    # Using direct Docker commands
    echo "Finding running containers..."
    CONTAINERS=$(docker ps --format "table {{.Names}}\t{{.Image}}" | grep -E "(bot|web|dashboard|seraphyx)" | awk '{print $1}' | tail -n +2)
    
    if [ -n "$CONTAINERS" ]; then
        echo "Stopping containers: $CONTAINERS"
        echo "$CONTAINERS" | xargs docker stop
        echo "✅ Containers stopped"
    else
        echo "⚠️  No matching containers found running"
    fi
fi

echo ""
echo "3️⃣  Rebuilding with CSP fixes..."

if [ "$USE_COMPOSE" = true ]; then
    # Rebuild and start with Docker Compose
    if [ -n "$COMPOSE_FILE" ]; then
        echo "Rebuilding with: $COMPOSE_CMD -f $COMPOSE_FILE build --no-cache"
        $COMPOSE_CMD -f "$COMPOSE_FILE" build --no-cache
        
        echo "Starting containers..."
        $COMPOSE_CMD -f "$COMPOSE_FILE" up -d
    else
        $COMPOSE_CMD build --no-cache
        $COMPOSE_CMD up -d
    fi
    echo "✅ Containers rebuilt and started"
else
    # Manual Docker build
    echo "Building new image..."
    docker build -t seraphyx-bot --no-cache .
    
    echo "Starting new container..."
    docker run -d --name seraphyx-bot-new \
        -p 3000:3000 -p 3001:3001 \
        --env-file .env \
        seraphyx-bot
    
    echo "✅ New container started"
fi

echo ""
echo "4️⃣  Waiting for services to start..."
sleep 10

# Test if the service is responding
echo "Testing service health..."
for i in {1..6}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Service is responding!"
        break
    elif [ $i -eq 6 ]; then
        echo "⚠️  Service may still be starting up..."
    else
        echo "Waiting... (attempt $i/6)"
        sleep 5
    fi
done

echo ""
echo "5️⃣  Verifying CSP configuration..."

# Test CSP headers
CSP_RESPONSE=$(curl -s -I http://localhost:3001/dashboard 2>/dev/null | grep -i "content-security-policy" || echo "")

if [ -n "$CSP_RESPONSE" ]; then
    echo "✅ CSP header found:"
    echo "   $CSP_RESPONSE"
    
    # Check for key CSP directives
    if echo "$CSP_RESPONSE" | grep -q "style-src-elem"; then
        echo "✅ style-src-elem directive present"
    else
        echo "❌ style-src-elem directive missing"
    fi
    
    if echo "$CSP_RESPONSE" | grep -q "script-src-elem"; then
        echo "✅ script-src-elem directive present"
    else
        echo "❌ script-src-elem directive missing"
    fi
    
    if echo "$CSP_RESPONSE" | grep -q "cdn.jsdelivr.net"; then
        echo "✅ CDN domains allowed"
    else
        echo "❌ CDN domains not found in CSP"
    fi
else
    echo "⚠️  Could not retrieve CSP header (service may still be starting)"
fi

echo ""
echo "6️⃣  Container Status"
echo "==================="

if [ "$USE_COMPOSE" = true ]; then
    $COMPOSE_CMD ps
else
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
fi

echo ""
echo "✨ Docker restart complete!"
echo ""
echo "🌐 Dashboard URL: http://your-vps-ip:3001/dashboard"
echo "🔍 Health Check: http://your-vps-ip:3001/health"
echo ""
echo "📋 Next steps:"
echo "1. Clear browser cache (Ctrl+Shift+R)"
echo "2. Visit your dashboard"
echo "3. Check browser console for CSP violations"
echo "4. Verify external resources load properly"
echo ""
echo "🆘 If issues persist:"
echo "   • Check container logs: docker logs <container-name>"
echo "   • Verify all environment variables are set"
echo "   • Ensure ports 3000 and 3001 are accessible"

# Show container logs for debugging
echo ""
echo "📋 Recent container logs:"
echo "========================"
if [ "$USE_COMPOSE" = true ]; then
    $COMPOSE_CMD logs --tail=20
else
    LATEST_CONTAINER=$(docker ps --format "{{.Names}}" | head -1)
    if [ -n "$LATEST_CONTAINER" ]; then
        docker logs --tail=20 "$LATEST_CONTAINER"
    fi
fi