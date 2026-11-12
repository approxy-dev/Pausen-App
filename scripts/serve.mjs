import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, resolve, sep, extname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { root, getConfig, renderDocument } from './config.mjs';

const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.apk': 'application/vnd.android.package-archive' };
const files = new Set(['index.html', 'privacy.html', 'styles.css', 'script.js', 'robots.txt', 'sitemap.xml']);
const security = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Cache-Control': 'no-store' };
createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    if ((!files.has(relative) && !relative.startsWith('assets/') && !relative.startsWith('downloads/')) || relative.includes('\\') || relative.split('/').some(part => part.startsWith('.'))) {
      response.writeHead(404, security); response.end('Not found'); return;
    }
    const path = resolve(join(root, relative));
    if (!path.startsWith(resolve(root) + sep)) { response.writeHead(404, security); response.end('Not found'); return; }
    const info = await stat(path);
    if (!info.isFile()) { response.writeHead(404, security); response.end('Not found'); return; }
    const extension = extname(path);
    const headers = { ...security, 'Content-Type': mime[extension] || 'application/octet-stream' };
    if (extension === '.apk') {
      headers['Content-Disposition'] = 'attachment; filename="Pausen-1.10.2.apk"';
      headers['Content-Length'] = info.size;
      response.writeHead(200, headers);
      if (request.method === 'HEAD') response.end(); else createReadStream(path).pipe(response);
      return;
    }
    let body = await readFile(path);
    if (extension === '.html') body = Buffer.from(renderDocument(body.toString(), relative, await getConfig()));
    if (/\bgzip\b/.test(request.headers['accept-encoding'] || '')) {
      body = gzipSync(body);
      headers['Content-Encoding'] = 'gzip';
      headers.Vary = 'Accept-Encoding';
    }
    headers['Content-Length'] = body.length;
    response.writeHead(200, headers);
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500, security);
    response.end(error.code === 'ENOENT' ? 'Not found' : 'Unable to serve this page. Check the local configuration.');
    if (error.code !== 'ENOENT') console.error(error.message);
  }
}).listen(port, '127.0.0.1', () => console.log(`Pausen preview: http://127.0.0.1:${port}\nSource edits appear on refresh. Ctrl+C stops the server.`));
