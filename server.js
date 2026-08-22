const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, 'public');
const port = Number(process.env.PORT || 3000);

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.json', 'application/json; charset=utf-8']
]);

function resolveFile(requestPath) {
  const cleanPath = decodeURIComponent(requestPath.split('?')[0]).replace(/^\/+/, '');
  const candidate = cleanPath ? path.join(publicDir, cleanPath) : path.join(publicDir, 'index.html');
  if (candidate.startsWith(publicDir) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }
  const fallback = path.join(publicDir, 'index.html');
  return fallback;
}

http.createServer((req, res) => {
  const filePath = resolveFile(req.url || '/');
  const ext = path.extname(filePath).toLowerCase();
  const type = mimeTypes.get(ext) || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server error');
      return;
    }

    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(data);
  });
}).listen(port, () => {
  console.log(`H&G landing page listening on port ${port}`);
});
