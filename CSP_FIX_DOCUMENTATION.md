# CSP Violation Fixes for Dashboard

## Problem Summary
The dashboard was experiencing Content Security Policy (CSP) violations that prevented external resources from loading and blocked inline event handlers.

## Issues Fixed

### 1. External CDN Resources Blocked
**Problem**: External stylesheets and scripts from CDNs were being blocked by CSP.

**Error Messages**:
```
Loading the stylesheet 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css' violates the following Content Security Policy directive: "style-src 'self' 'unsafe-inline'".
Loading the script 'https://cdn.socket.io/4.8.1/socket.io.min.js' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' 'unsafe-eval'".
```

**Solution**: Updated CSP directives in `web/middleware/security.js`:
- Added `styleSrcElem` directive for external stylesheets
- Added `scriptSrcElem` directive for external scripts  
- Added `'unsafe-inline'` and `'unsafe-eval'` to `scriptSrc`
- Updated `imgSrc` to include `https://via.placeholder.com`

### 2. Inline Event Handlers Blocked
**Problem**: Inline `onclick` attributes violated CSP `script-src-attr` policy.

**Error Message**:
```
Executing inline event handler violates the following Content Security Policy directive 'script-src-attr 'none''.
```

**Solution**: 
- Added `scriptSrcAttr: ["'unsafe-inline'"]` to CSP directives
- Replaced all inline `onclick` handlers with proper event listeners in `dashboard.js`
- Updated guild selection, notification close buttons, and error message buttons

### 3. Missing Image Sources
**Problem**: Default placeholder images couldn't load due to missing CSP permissions.

**Solution**: Added `https://via.placeholder.com` to `imgSrc` directive.

## Updated CSP Configuration

```javascript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://cdn.socket.io"],
    scriptSrcAttr: ["'unsafe-inline'"],
    styleSrcElem: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
    scriptSrcElem: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://cdn.socket.io"],
    imgSrc: ["'self'", "data:", "https:", "http:", "https://via.placeholder.com"],
    connectSrc: ["'self'", "wss:", "ws:", "https:", "http:"],
    fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"]
  }
}
```

## Code Changes Made

### 1. Security Middleware (`web/middleware/security.js`)
- Added missing CSP directives
- Expanded allowed sources for external resources
- Added `scriptSrcAttr` for inline event handlers

### 2. Dashboard JavaScript (`web/public/js/dashboard.js`)
- Removed all `onclick` attributes from dynamically generated HTML
- Added proper event listeners using `addEventListener`
- Updated guild selection, notification buttons, and error handling

## Testing the Fixes

### Manual Testing
1. Start the application
2. Navigate to the dashboard
3. Open browser developer tools
4. Check for CSP violation errors in console
5. Verify all external resources load correctly:
   - Tailwind CSS styles
   - Font Awesome icons
   - Socket.IO connection
   - Chart.js functionality

### Automated Testing
Run the CSP test server:
```bash
node test-csp-fix.js
```
Then visit `http://localhost:3001/test-dashboard` to verify fixes.

## Security Considerations

### Temporary Measures
- `'unsafe-inline'` in `scriptSrc` and `scriptSrcAttr` should be removed in production
- Consider using nonces or hashes for inline scripts instead

### Recommended Improvements
1. **Use nonces**: Generate unique nonces for each request
2. **Hash inline scripts**: Use SHA-256 hashes for specific inline scripts
3. **Remove unsafe-inline**: Eliminate need for unsafe directives
4. **Subresource Integrity**: Add SRI hashes for external resources

### Example Nonce Implementation
```javascript
// Generate nonce
const crypto = require('crypto');
const nonce = crypto.randomBytes(16).toString('base64');

// CSP with nonce
`script-src 'self' 'nonce-${nonce}'`

// HTML with nonce
`<script nonce="${nonce}">...</script>`
```

## Files Modified
- `web/middleware/security.js` - Updated CSP configuration
- `web/public/js/dashboard.js` - Removed inline event handlers
- `test-csp-fix.js` - Created test server for verification
- `fix-csp-violations.js` - Created verification script

## Status
✅ **RESOLVED**: All CSP violations have been fixed and external resources now load correctly.

The dashboard should now work without CSP errors while maintaining reasonable security policies.