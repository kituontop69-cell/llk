const http = require('http');
const fs = require('fs');
const path = require('path');

// Use PORT from environment (Railway), or 8000 for local
const PORT = process.env.PORT || 8000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

const server = http.createServer((req, res) => {
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
    const url = HOST === '0.0.0.0' ? `https://your-railway-url.railway.app` : `http://localhost:${PORT}`;
    console.log(`
    ╔════════════════════════════════════════╗
    ║  🚀 STREAMER X CLOUD SERVER RUNNING   ║
    ╠════════════════════════════════════════╣
    ║  📱 URL: ${url}
    ║  🔗 Port: ${PORT}
    ║  💻 Host: ${HOST}
    ║                                        ║
    ║  📄 Login: ${url}/
    ║  ⚙️  Admin: ${url}/admin.html
    ║                                        ║
    ║  Press Ctrl+C to stop server           ║
    ╚════════════════════════════════════════╝
    `);
});

process.on('SIGINT', () => {
    console.log('\n✓ Server stopped');
    process.exit();
});
