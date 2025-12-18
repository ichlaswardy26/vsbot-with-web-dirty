# 📚 API Documentation

Complete API reference for Villain Seraphyx Bot Web Dashboard.

## Base URL

```
http://localhost:3001/api
```

## Authentication

All API endpoints (except `/auth/*`) require authentication via Discord OAuth2.

### Headers
```
Cookie: sessionId=<session_token>
X-CSRF-Token: <csrf_token>
```

### Get CSRF Token
```http
GET /api/csrf-token
```

**Response:**
```json
{
  "csrfToken": "abc123..."
}
```

---

## Configuration API

### Get Configuration

```http
GET /api/config/:guildId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "guildId": "123456789",
    "channels": { ... },
    "roles": { ... },
    "features": { ... },
    "colors": { ... },
    "emojis": { ... }
  }
}
```

### Update Configuration

```http
PUT /api/config/:guildId
```

**Body:**
```json
{
  "channels": {
    "welcome": "123456789012345678",
    "goodbye": "123456789012345679"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Configuration updated successfully"
}
```

### Update Configuration Section

```http
PUT /api/config/:guildId/:section
```

**Sections:** `channels`, `roles`, `features`, `appearance`, `language`

**Body:**
```json
{
  "welcome": "123456789012345678"
}
```

### Validate Configuration

```http
POST /api/config/:guildId/validate
```

**Body:**
```json
{
  "channels": { ... },
  "roles": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "errors": [],
    "warnings": [],
    "fieldValidation": { ... }
  }
}
```

### Export Configuration

```http
GET /api/config/:guildId/export
```

**Response:** JSON file download

### Import Configuration

```http
POST /api/config/:guildId/import
```

**Body:** JSON configuration object

**Response:**
```json
{
  "success": true,
  "data": { ... },
  "warnings": []
}
```

---

## Channels API

### Get Guild Channels

```http
GET /api/channels/:guildId
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123456789012345678",
      "name": "general",
      "type": 0,
      "parentId": "123456789012345677"
    }
  ]
}
```

### Get Channel Categories

```http
GET /api/channels/:guildId/categories
```

---

## Roles API

### Get Guild Roles

```http
GET /api/roles/:guildId
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123456789012345678",
      "name": "Admin",
      "color": "#FF0000",
      "position": 10,
      "permissions": "8"
    }
  ]
}
```

---

## Templates API

### List Templates

```http
GET /api/templates
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "default",
      "name": "Default Configuration",
      "description": "Basic bot setup"
    }
  ]
}
```

### Get Template

```http
GET /api/templates/:templateId
```

### Apply Template

```http
POST /api/templates/:guildId/apply/:templateId
```

---

## Audit Logs API

### Get Audit Logs

```http
GET /api/audit-logs?guildId=123&limit=50
```

**Query Parameters:**
- `guildId` - Guild ID (required)
- `userId` - Filter by user
- `eventType` - Filter by event type
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)
- `limit` - Max results (default: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "action": "CONFIG_UPDATE",
      "executorId": "123456789",
      "executorTag": "User#0000",
      "details": { ... },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get Audit Stats

```http
GET /api/audit-stats?guildId=123
```

---

## Health Check

### API Health

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "bot": {
    "status": "ready",
    "guilds": 10
  },
  "websocket": {
    "connections": 5,
    "activeGuilds": 3
  }
}
```

### Discord API Health

```http
GET /api/health/discord
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "connected",
    "isConnected": true,
    "ping": 50
  }
}
```

---

## WebSocket Events

Connect to WebSocket at the same URL as the dashboard.

### Client Events (Emit)

```javascript
// Subscribe to guild updates
socket.emit('subscribe', { guildId: '123456789' });

// Unsubscribe from guild
socket.emit('unsubscribe', { guildId: '123456789' });
```

### Server Events (Listen)

```javascript
// Configuration updated
socket.on('config:updated', (data) => {
  // data: { guildId, section, changes }
});

// Bot status changed
socket.on('bot:status', (data) => {
  // data: { status, guilds, ping }
});

// Real-time stats
socket.on('stats:update', (data) => {
  // data: { commands, users, uptime }
});
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "requestId": "abc123"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | No permission |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/auth/*` | 5 req/min |
| `/api/config/*` | 30 req/min |
| `/api/*` | 60 req/min |

Rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1640000000
```

---

## Examples

### JavaScript (Fetch)

```javascript
// Get configuration
const response = await fetch('/api/config/123456789', {
  headers: {
    'X-CSRF-Token': csrfToken
  },
  credentials: 'include'
});
const data = await response.json();
```

### cURL

```bash
# Get configuration
curl -X GET "http://localhost:3001/api/config/123456789" \
  -H "Cookie: sessionId=abc123" \
  -H "X-CSRF-Token: xyz789"

# Update configuration
curl -X PUT "http://localhost:3001/api/config/123456789" \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionId=abc123" \
  -H "X-CSRF-Token: xyz789" \
  -d '{"channels": {"welcome": "123456789012345678"}}'
```
