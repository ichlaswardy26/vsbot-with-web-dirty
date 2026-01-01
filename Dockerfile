# Villain Seraphyx Discord Bot
# Node.js 20 LTS Debian for better compatibility with canvas

FROM node:20-bullseye-slim

WORKDIR /app

# Install system dependencies for canvas and sharp
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    python3 \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package*.json ./

# Set NODE_ENV to production to skip devDependencies
ENV NODE_ENV=production

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user for security
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs botuser && \
    chown -R botuser:nodejs /app

USER botuser

# Expose ports for web dashboard and webhook
EXPOSE 3000 3001

# Health check using our custom script
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=3 \
    CMD node docker-health-check.js

CMD ["npm", "start"]
