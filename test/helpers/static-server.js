// Minimal static file server for the browser tests.
//
// Serves the repo under /m106-websites/, the way GitHub Pages serves it, so
// a link or import that starts with "/" breaks here as it would there.

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

export const BASE_PATH = '/m106-websites/';
const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
};

/** Start the server on a free port. Resolves to { url, close() }. */
export function startServer() {
  const server = http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (!pathname.startsWith(BASE_PATH)) return send(res, 404, 'Not found');

    let file = path.join(REPO_ROOT, decodeURIComponent(pathname.slice(BASE_PATH.length)));
    if (!file.startsWith(REPO_ROOT)) return send(res, 403, 'Forbidden');

    try {
      const stat = await fs.stat(file);
      if (stat.isDirectory()) {
        if (!pathname.endsWith('/')) {
          res.writeHead(301, { Location: pathname + '/' });
          return res.end();
        }
        file = path.join(file, 'index.html');
      }
      const body = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      send(res, 404, 'Not found');
    }
  });

  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}${BASE_PATH}`,
        close: () => new Promise(done => server.close(done)),
      });
    });
  });
}

function send(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain' });
  res.end(text);
}
