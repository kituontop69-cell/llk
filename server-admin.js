const http = require('http');
const fs = require('fs');
const path = require('path');

// Admin Server - Serves admin.html
const PORT = process.env.ADMIN_PORT || 3001;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
const KEYS_FILE = path.join(__dirname, 'license_keys.json');

const server = http.createServer((req, res) => {
    // API endpoint for getting license keys with statistics
    if (req.url === '/api/keys') {
        try {
            if (fs.existsSync(KEYS_FILE)) {
                const data = fs.readFileSync(KEYS_FILE, 'utf-8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data);
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify([]));
            }
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to read keys' }));
        }
        return;
    }
    
    // Route all requests to admin.html for single page app
    let filePath;
    
    if (req.url === '/' || req.url === '/admin') {
        filePath = path.join(__dirname, 'admin.html');
    } else if (req.url === '/login' || req.url === '/admin-login') {
        filePath = path.join(__dirname, 'admin-login.html');
    } else {
        filePath = path.join(__dirname, req.url);
    }
    
    const ext = path.extname(filePath);
    let contentType = 'text/html';
    
    if (ext === '.js') contentType = 'application/javascript';
    if (ext === '.css') contentType = 'text/css';
    if (ext === '.json') contentType = 'application/json';
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: '+err.code+' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, HOST, () => {
    console.log(`
    ╔════════════════════════════════════════╗
    ║  🔐 ADMIN SERVER RUNNING               ║
    ╠════════════════════════════════════════╣
    ║  🔑 Port: ${PORT}
    ║  💻 Host: ${HOST}
    ║  📊 Pages: admin.html, admin-login.html║
    ║                                        ║
    ║  Local: http://localhost:${PORT}
    ║  Railway: https://[admin-url].railway.app ║
    ║                                        ║
    ║  Press Ctrl+C to stop server           ║
    ╚════════════════════════════════════════╝
    `);
});
