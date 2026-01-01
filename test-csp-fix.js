#!/usr/bin/env node

/**
 * Test script to verify CSP fixes for dashboard
 */

const express = require('express');
const path = require('path');
const { securityHeaders } = require('./web/middleware/security');

const app = express();
const PORT = 3001;

// Apply security middleware
app.use(securityHeaders());

// Serve static files
app.use('/js', express.static(path.join(__dirname, 'web/public/js')));
app.use('/css', express.static(path.join(__dirname, 'web/public/css')));

// Test route for dashboard
app.get('/test-dashboard', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSP Test - Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="bg-gray-100">
    <div class="container mx-auto p-8">
        <h1 class="text-3xl font-bold mb-4">CSP Test Dashboard</h1>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white p-6 rounded-lg shadow">
                <h2 class="text-xl font-semibold mb-4">External Resources Test</h2>
                <div class="space-y-2">
                    <div class="flex items-center">
                        <i class="fas fa-check text-green-500 mr-2"></i>
                        <span>Tailwind CSS loaded</span>
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-check text-green-500 mr-2"></i>
                        <span>Font Awesome loaded</span>
                    </div>
                    <div class="flex items-center" id="socket-status">
                        <i class="fas fa-spinner fa-spin text-yellow-500 mr-2"></i>
                        <span>Socket.IO loading...</span>
                    </div>
                    <div class="flex items-center" id="chart-status">
                        <i class="fas fa-spinner fa-spin text-yellow-500 mr-2"></i>
                        <span>Chart.js loading...</span>
                    </div>
                </div>
            </div>
            
            <div class="bg-white p-6 rounded-lg shadow">
                <h2 class="text-xl font-semibold mb-4">Interactive Elements Test</h2>
                <div class="space-y-3">
                    <button id="test-btn" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                        Test Button (Event Listener)
                    </button>
                    <div id="test-result" class="text-gray-600"></div>
                    
                    <div class="mt-4">
                        <canvas id="test-chart" width="300" height="150"></canvas>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="mt-8 bg-white p-6 rounded-lg shadow">
            <h2 class="text-xl font-semibold mb-4">Console Output</h2>
            <div id="console-output" class="bg-gray-100 p-4 rounded font-mono text-sm max-h-64 overflow-y-auto"></div>
        </div>
    </div>

    <script>
        // Test Socket.IO
        if (typeof io !== 'undefined') {
            document.getElementById('socket-status').innerHTML = '<i class="fas fa-check text-green-500 mr-2"></i><span>Socket.IO loaded successfully</span>';
            console.log('✓ Socket.IO loaded successfully');
        } else {
            document.getElementById('socket-status').innerHTML = '<i class="fas fa-times text-red-500 mr-2"></i><span>Socket.IO failed to load</span>';
            console.error('✗ Socket.IO failed to load');
        }
        
        // Test Chart.js
        if (typeof Chart !== 'undefined') {
            document.getElementById('chart-status').innerHTML = '<i class="fas fa-check text-green-500 mr-2"></i><span>Chart.js loaded successfully</span>';
            console.log('✓ Chart.js loaded successfully');
            
            // Create test chart
            const ctx = document.getElementById('test-chart');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
                    datasets: [{
                        label: 'Test Data',
                        data: [12, 19, 3, 5, 2],
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'CSP Test Chart'
                        }
                    }
                }
            });
        } else {
            document.getElementById('chart-status').innerHTML = '<i class="fas fa-times text-red-500 mr-2"></i><span>Chart.js failed to load</span>';
            console.error('✗ Chart.js failed to load');
        }
        
        // Test event listeners (no inline handlers)
        document.getElementById('test-btn').addEventListener('click', function() {
            document.getElementById('test-result').innerHTML = '<i class="fas fa-check text-green-500 mr-2"></i>Event listener working correctly!';
            console.log('✓ Event listener working correctly');
        });
        
        // Capture console output
        const consoleOutput = document.getElementById('console-output');
        const originalLog = console.log;
        const originalError = console.error;
        
        console.log = function(...args) {
            originalLog.apply(console, args);
            consoleOutput.innerHTML += '<div class="text-green-600">' + args.join(' ') + '</div>';
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        };
        
        console.error = function(...args) {
            originalError.apply(console, args);
            consoleOutput.innerHTML += '<div class="text-red-600">' + args.join(' ') + '</div>';
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        };
        
        console.log('CSP Test initialized');
    </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log(`CSP test server running at http://localhost:${PORT}`);
  console.log(`Visit http://localhost:${PORT}/test-dashboard to test CSP fixes`);
  console.log('Check browser console for any CSP violations');
});