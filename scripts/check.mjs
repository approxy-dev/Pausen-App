import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { root, renderDocument, validateSiteUrl, validateFormEndpoint } from './config.mjs';

const index = await readFile(join(root, 'index.html'), 'utf8');
const privacy = await readFile(join(root, 'privacy.html'), 'utf8');
for (const [name, html] of [['index.html', index], ['privacy.html', privacy]]) {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${name}: duplicate IDs`);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `${name}: one main heading`);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = match[1];
    if (/^(https?:|mailto:|data:)/.test(url) || url === '#') continue;
    if (url.startsWith('#')) { assert(ids.includes(url.slice(1)), `${name}: missing anchor ${url}`); continue; }
    const [path, anchor] = url.split('#');
    assert((await stat(join(root, path))).isFile(), `${name}: missing ${path}`);
    if (anchor && path.endsWith('.html')) assert((await readFile(join(root, path), 'utf8')).includes(`id="${anchor}"`), `${name}: missing ${url}`);
  }
}
const apk = await readFile(join(root, 'downloads/Pausen-1.10.2.apk'));
const hash = createHash('sha256').update(apk).digest('hex');
assert.equal(hash, '05d24758639b4f58b31db3fafffef73840f8e5d8c7408d07618b8c3e3a5cf038', 'Signed APK checksum changed');
assert((await readFile(join(root, 'downloads/SHA256SUMS.txt'), 'utf8')).includes(hash));
assert(index.includes(hash));
const initialFiles = ['index.html', 'styles.css', 'script.js', 'assets/brand/pausen-mark.svg', 'assets/fonts/familjen-grotesk-latin.ttf'];
let transferred = 0;
let raw = 0;
for (const file of initialFiles) {
  const bytes = await readFile(join(root, file));
  raw += bytes.length;
  transferred += gzipSync(bytes).length;
}
assert(transferred < 45 * 1024, `Initial gzip payload is ${transferred} bytes; budget is 45 KiB`);
const local = renderDocument(index, 'index.html', { siteUrl: '', formEndpoint: '', preview: false });
assert(local.includes('noindex, nofollow'));
assert(local.includes('data-delivery="email"'));
const deployed = renderDocument(index, 'index.html', { siteUrl: 'https://pausen.example', formEndpoint: 'https://formspree.io/f/test', preview: false });
assert(deployed.includes('rel="canonical" href="https://pausen.example/"'));
assert(deployed.includes('content="https://pausen.example/assets/brand/social-preview.png"'));
assert(deployed.includes('method="post" data-delivery="provider"'));
assert(!deployed.includes('noindex, nofollow'));
assert(deployed.includes('id="submit-label">Send message'));
const providerPrivacy = renderDocument(privacy, 'privacy.html', { siteUrl: 'https://pausen.example', formEndpoint: 'https://formspree.io/f/test' });
assert(providerPrivacy.includes('configured form provider'));
assert(!providerPrivacy.includes('It does not send a message automatically'));
assert.throws(() => validateSiteUrl('https://site.example/not-the-root'));
assert.throws(() => validateFormEndpoint('javascript:alert(1)'));
console.log(`PASS: page links and anchors, APK integrity, deployment metadata, contact modes, and URL validation.\nInitial page assets: ${(raw / 1024).toFixed(1)} KiB raw / ${(transferred / 1024).toFixed(1)} KiB gzip (45 KiB transfer budget).\nAPK: ${apk.length} bytes; SHA-256 verified.`);
