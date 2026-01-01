#!/usr/bin/env node

/**
 * Test if security middleware is working correctly
 */

const express = require('express');
const { securityHeaders } = require('./web/middleware/security');

const app = express();
const PORT = 3002;

// Apply our security middleware
app.use(securityHeaders());

// Test route that shows CSP headers
app.get('/test-csp', (req, res) => {
  // Get the CSP header that was set
  const cspHeader = res.getHeader('Content-Security-Policy');
  
  res.json({
    success: true,
    cspHeader: cspHeader,
    timestamp: new Date().toISOString(),
    message: 'Security middleware test'
  });
});

// Test route with HTML that loads external resources
app.get('/test-html', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>CSP Test</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
</head>
<body>
    <h1>CSP Test Page</h1>
    <p>Check browser console for CSP violations</p>
    <script>
        console.log('Inline script executed');
        if (typeof io !== 'undefined') {
            console.log('Socket.IO loaded successfully');
        } else {
            console.error('Socket.IO failed to load');
        }
    </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log(`Security middleware test server running on http://localhost:${PORT}`);
  console.log('Test endpoints:');
  console.log(`  - CSP headers: http://localhost:${PORT}/test-csp`);
  console.log(`  - HTML test: http://localhost:${PORT}/test-html`);
  console.log('');
  console.log('Expected CSP header should include:');
  console.log('  - script-src-elem with cdn.socket.io');
  console.log('  - style-src-elem with cdn.jsdelivr.net');
  console.log('  - script-src-attr with unsafe-inline');
});