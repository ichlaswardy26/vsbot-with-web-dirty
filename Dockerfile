# Villain Seraphyx Discord Bot
# Node.js 20 LTS Alpine for smaller image size

FROM node:20-alpine

WORKDIR /app

# Install system dependencies for canvas and sharp
RUN apk add --no-cache \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    python3 \
    make \
    g++

# Copy package files first for better caching
COPY package*.json ./

# Set NODE_ENV to production to skip devDependencies
ENV NODE_ENV=production

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S botuser -u 1001 && \
    chown -R botuser:nodejs /app

USER botuser

# Expose ports for web dashboard and webhook
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))" || exit 0

CMD ["npm", "start"]
