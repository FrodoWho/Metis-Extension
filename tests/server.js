/**
 * Minimal static file server for the Playwright test page.
 * Serves the tests/ directory on http://localhost:4321/
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 4321;
const ROOT = __dirname;

http.createServer((req, res) => {
  const filePath = path.join(ROOT, req.url === '/' ? 'test-page.html' : req.url);
  try {
    const body = fs.readFileSync(filePath);
    const ext  = path.extname(filePath);
    const type = ext === '.html' ? 'text/html' : ext === '.js' ? 'text/javascript' : 'text/plain';
    res.writeHead(200, { 'Content-Type': type });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(PORT, () => {
  // Signal to Playwright that the server is ready
  console.log(`Test server listening on http://localhost:${PORT}`);
});
