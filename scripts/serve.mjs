// Servidor local da cena: publica index.html, src/ e public/.
import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.glb': 'model/gltf-binary', '.wasm': 'application/wasm',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.wasm']);

function isPublic(pathname) {
  if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(p => p.startsWith('.'))) return false;
  return pathname === '/index.html' ||
    ((pathname.startsWith('/src/') || pathname.startsWith('/public/')) && Object.hasOwn(MIME, path.extname(pathname)));
}

function isLocalRequest(req) {
  try {
    const host = new URL(`http://${req.headers.host}`);
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(host.hostname)) return false;
    return !req.headers.origin || req.headers.origin === host.origin;
  } catch { return false; }
}

export async function startServer(port = 5173, tentativas = 8, { root = ROOT } = {}) {
  const base = await realpath(root);
  const server = http.createServer(async (req, res) => {
    const send = (status, body) => res.writeHead(status, {
      'content-type': 'text/plain; charset=utf-8', 'x-content-type-options': 'nosniff',
    }).end(body);
    if (!isLocalRequest(req)) { send(403, 'Origem não permitida.'); return; }
    if (!['GET', 'HEAD'].includes(req.method)) { send(405, 'Método não permitido.'); return; }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { send(400, 'URL inválida.'); return; }
    if (pathname.endsWith('/')) pathname += 'index.html';
    if (!isPublic(pathname)) { send(404, 'Arquivo não encontrado.'); return; }
    try {
      const file = await realpath(path.resolve(base, `.${pathname}`));
      const rel = path.relative(base, file);
      // O destino real de um link também precisa pertencer às pastas públicas.
      if (rel === '..' || rel.startsWith(`..${path.sep}`) || !isPublic(`/${rel.split(path.sep).join('/')}`)) {
        send(404, 'Arquivo não encontrado.'); return;
      }
      if (!(await stat(file)).isFile()) { send(404, 'Arquivo não encontrado.'); return; }
      const ext = path.extname(file);
      const headers = {
        'content-type': MIME[ext], 'cache-control': 'no-store',
        'x-content-type-options': 'nosniff', 'vary': 'Accept-Encoding',
      };
      if (req.method === 'HEAD') { res.writeHead(200, headers).end(); return; }
      const body = await readFile(file);
      if ((req.headers['accept-encoding'] || '').includes('gzip') && COMPRESSIBLE.has(ext) && body.length > 512) {
        const compressed = await new Promise((accept, reject) => zlib.gzip(body, { level: 9 }, (error, data) => error ? reject(error) : accept(data)));
        res.writeHead(200, { ...headers, 'content-encoding': 'gzip', 'content-length': compressed.length }).end(compressed);
      } else {
        res.writeHead(200, { ...headers, 'content-length': body.length }).end(body);
      }
    } catch { send(404, 'Arquivo não encontrado.'); }
  });
  for (let attempt = 0; ; attempt += 1) {
    try {
      await new Promise((accept, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', () => { server.off('error', reject); accept(); });
      });
      break;
    } catch (error) {
      if (error.code !== 'EADDRINUSE' || attempt >= tentativas || port === 0) throw error;
      port += 1;
    }
  }
  return {
    server, url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise(done => { server.close(done); server.closeAllConnections(); }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const instance = await startServer(Number(process.argv[2] || 5173));
  console.log(`Cena disponível em ${instance.url}`);
}
