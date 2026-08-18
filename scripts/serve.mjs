// Servidor estático mínimo, sem dependência. Serve a raiz do projeto com gzip
// nos arquivos de texto e MIME correto para .glb e .wasm — sem isso o número
// de bytes transferidos que o HUD mostra não seria o real.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.md', '.svg', '.wasm']);

// `tentativas` existe para o caso comum de já haver um `npm run serve` no ar:
// em vez de estourar EADDRINUSE, a medição sobe na próxima porta livre.
export function startServer(port = 5173, tentativas = 8) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }

    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404, { 'content-type': 'text/plain' }).end('404'); return; }
      const ext = path.extname(file).toLowerCase();
      const headers = {
        'content-type': MIME[ext] || 'application/octet-stream',
        'cache-control': 'no-store',            // medição sempre com cache frio
        'access-control-allow-origin': '*',
      };
      const accepts = (req.headers['accept-encoding'] || '').includes('gzip');
      if (accepts && COMPRESSIBLE.has(ext) && buf.length > 512) {
        const gz = zlib.gzipSync(buf, { level: 9 });
        headers['content-encoding'] = 'gzip';
        headers['content-length'] = gz.length;
        res.writeHead(200, headers).end(gz);
      } else {
        headers['content-length'] = buf.length;
        res.writeHead(200, headers).end(buf);
      }
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE' && tentativas > 0) {
        startServer(port + 1, tentativas - 1).then(resolve, reject);
      } else {
        reject(err);
      }
    });
    server.listen(port, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2] || 5173);
  const s = await startServer(port);
  console.log(`servindo ${ROOT} em ${s.url}`);
}
