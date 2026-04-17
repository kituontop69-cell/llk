const http = require('http');
const fs = require('fs');
const path = require('path');

// Client Server - Serves index.html
const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

const server = http.createServer((req, res) => {
    // Always serve index.html for root
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    
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
    ║  🚀 CLIENT SERVER RUNNING              ║
    ╠════════════════════════════════════════╣
    ║  📱 Port: ${PORT}
    ║  💻 Host: ${HOST}
    ║  📄 Page: index.html (Client Login)    ║
    ║                                        ║
    ║  Local: http://localhost:${PORT}
    ║  Railway: https://[url].railway.app    ║
    ║                                        ║
    ║  Press Ctrl+C to stop server           ║
    ╚════════════════════════════════════════╝
    `);
});
