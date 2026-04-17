const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Use PORT from environment (Railway), or 8000 for local
const PORT = process.env.PORT || 8000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

const KEYS_FILE = path.join(__dirname, 'license_keys.json');

// ===== KEY MANAGEMENT FUNCTIONS =====
function loadKeys() {
  try {
    if (fs.existsSync(KEYS_FILE)) {
      const data = fs.readFileSync(KEYS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('⚠️ Could not load keys file');
  }
  return [];
}

function saveKeys(keys) {
  try {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), 'utf-8');
  } catch (error) {
    console.error('❌ Error saving keys:', error);
  }
}

function generateKey(username, expiryDays = 365, maxUses = null) {
  const segments = [];
  for (let i = 0; i < 3; i++) {
    segments.push(Math.random().toString(36).substr(2, 5).toUpperCase());
  }
  
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + (expiryDays * 24 * 60 * 60 * 1000));
  const expiryString = expiresAt.toISOString().split('T')[0];
  
  return {
    keyId: 'KEY-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    key: `STX-${segments.join('-')}-${expiryString}`,
    username: username,
    createdBy: 'web_dashboard',
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    active: true,
    uses: 0,
    maxUses: maxUses,
    usageHistory: []
  };
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // ===== API ENDPOINTS =====
    
    // GET /api/keys - Get all license keys
    if (pathname === '/api/keys' && req.method === 'GET') {
        const keys = loadKeys();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(keys));
        return;
    }
    
    // POST /api/genkey - Generate new key
    if (pathname === '/api/genkey' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { username, expiryDays, maxUses } = JSON.parse(body);
                const keys = loadKeys();
                const newKey = generateKey(username, expiryDays || 365, maxUses);
                keys.push(newKey);
                saveKeys(keys);
                
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, key: newKey }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
        return;
    }
    
    // POST /api/revokekey - Revoke a key
    if (pathname === '/api/revokekey' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { keyId } = JSON.parse(body);
                let keys = loadKeys();
                keys = keys.map(k => k.keyId === keyId ? { ...k, active: false } : k);
                saveKeys(keys);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Key revoked' }));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
        return;
    }
    
    // GET /api/stats - Get statistics
    if (pathname === '/api/stats' && req.method === 'GET') {
        const keys = loadKeys();
        const stats = {
            totalKeys: keys.length,
            activeKeys: keys.filter(k => k.active && new Date(k.expiresAt) > new Date()).length,
            expiredKeys: keys.filter(k => new Date(k.expiresAt) <= new Date()).length,
            revokedKeys: keys.filter(k => !k.active).length
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats));
        return;
    }
    
    // ===== STATIC FILES =====
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    
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
