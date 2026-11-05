// Optional local launcher. The game itself has no build step or package dependencies.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = fs.realpathSync(__dirname);
const port = Number(process.env.WATA_PORT || 8765);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
};
const server = http.createServer((req, res) => {
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (!file.startsWith(root + path.sep) || name.split('/').some(p => p.startsWith('.')) || !fs.existsSync(file) || !fs.statSync(file).isFile() || !fs.realpathSync(file).startsWith(root + path.sep)) {
      res.writeHead(404); return res.end('Not found');
    }
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    fs.createReadStream(file).on('error', () => { res.destroy(); }).pipe(res);
  } catch {
    res.writeHead(400); res.end('Invalid request');
  }
});
server.on('error', e => {
  console.error(e.code === 'EADDRINUSE' ? `Port ${port} is already in use. Try opening http://127.0.0.1:${port}/ or choose WATA_PORT.` : e.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`WATA SPO is ready: http://127.0.0.1:${port}/`);
  console.log('Keep this window open while playing. Press Ctrl+C to stop.');
});
