import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { root, publicPages, renderDocument, renderDiscoveryFile, validateSiteUrl, validateFormEndpoint } from './config.mjs';

const index = await readFile(join(root, 'index.html'), 'utf8');
const privacy = await readFile(join(root, 'privacy.html'), 'utf8');
for (const [name, html] of [['index.html', index], ['privacy.html', privacy]]) {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${name}: duplicate IDs`);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `${name}: one main heading`);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1].replaceAll('&amp;', '&');
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  assert(title && title.length <= 60, `${name}: title exceeds the audit's 60-character budget`);
  assert(description && description.length <= 155, `${name}: description exceeds the audit's 155-character budget`);
  assert(!/href="\/?index\.html(?:["#?])/.test(html), `${name}: internal homepage links must use the canonical / route`);
  for (const match of html.matchAll(/<img\b[^>]*>/g)) {
    assert(/\balt="[^"]+"/.test(match[0]) || /\balt=""/.test(match[0]) && /(?:aria-hidden="true"|role="presentation")/.test(match[0]), `${name}: label informative images or explicitly mark them decorative`);
  }
  const socialPath = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  assert(socialPath, `${name}: missing social preview`);
  const social = await readFile(join(root, socialPath));
  assert.equal(social.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const width = social.readUInt32BE(16);
  const height = social.readUInt32BE(20);
  assert(width >= 1200 && height >= 630 && Math.abs(width / height / 1.91 - 1) < 0.05, `${name}: social preview must meet the audit's size and ratio requirements`);
  assert(html.includes(`<meta property="og:image:width" content="${width}">`));
  assert(html.includes(`<meta property="og:image:height" content="${height}">`));
  assert(html.includes(`<meta name="twitter:image" content="${socialPath}">`));
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = match[1];
    if (/^(https?:|mailto:|data:)/.test(url) || url === '#') continue;
    if (url.startsWith('#')) { assert(ids.includes(url.slice(1)), `${name}: missing anchor ${url}`); continue; }
    const [route, anchor] = url.split('#');
    const path = route === '/' ? 'index.html' : route;
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
assert(deployed.includes('content="https://pausen.example/assets/brand/social-preview-wide.png"'));
assert(deployed.includes('method="post" data-delivery="provider"'));
assert(!deployed.includes('noindex, nofollow'));
assert(deployed.includes('id="submit-label">Send message'));
const structuredData = JSON.parse(deployed.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const graph = structuredData['@graph'];
const website = graph.find(item => item['@type'] === 'WebSite');
const application = graph.find(item => item['@type'] === 'SoftwareApplication');
assert.equal(website.name, 'Pausen');
assert.equal(website.url, 'https://pausen.example/');
assert.equal(website.alternateName.at(-1), new URL(website.url).hostname);
assert.equal(application.url, website.url);
assert.equal(application.downloadUrl, 'https://pausen.example/downloads/Pausen-1.10.2.apk');
assert.equal(application.identifier, 'com.sleepguardian.app');
assert(!JSON.stringify(structuredData).includes('https://pausenapk.vercel.app'), 'Structured data must use the configured canonical origin');
const entityIds = new Set(graph.map(item => item['@id']));
for (const match of JSON.stringify(structuredData).matchAll(/"@id":"([^"]+)"/g)) {
  assert(entityIds.has(match[1]), `Structured data has a dangling entity reference: ${match[1]}`);
}
const visibleText = index.split('<body>')[1].replace(/<[^>]*>/g, ' ').replaceAll('&amp;', '&').replace(/\s+/g, ' ');
for (const question of graph.find(item => item['@type'] === 'FAQPage').mainEntity) {
  assert(visibleText.includes(question.name), `FAQ question is missing from the visible page: ${question.name}`);
  assert(visibleText.includes(question.acceptedAnswer.text), `FAQ answer differs from the visible page: ${question.name}`);
}
for (const html of [index, privacy]) {
  assert.equal([...html.matchAll(/<link rel="icon"/g)].length, 1, 'Declare one primary favicon');
  assert(html.includes('<link rel="describedby" href="/llms.txt" type="text/plain">'), 'Link to the public app guide');
  const pngIcon = html.match(/<link rel="icon" href="([^"]+)" type="image\/png" sizes="(\d+)x(\d+)">/);
  assert(pngIcon, 'Each page must declare a PNG favicon');
  assert.equal(pngIcon[1], '/assets/brand/favicon-black-96x96.png', 'Keep the same stable favicon URL across the site');
  const png = await readFile(join(root, pngIcon[1]));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'The declared favicon must be a PNG');
  assert.equal(png.readUInt32BE(16), Number(pngIcon[2]));
  assert.equal(png.readUInt32BE(20), Number(pngIcon[3]));
  assert.equal(pngIcon[2], pngIcon[3], 'The search favicon must be square');
  assert(Number(pngIcon[2]) > 48, 'Use a favicon larger than 48 pixels');
}
const publicConfig = { siteUrl: 'https://pausen.example', preview: false };
const guide = renderDiscoveryFile(await readFile(join(root, 'llms.txt'), 'utf8'), 'llms.txt', publicConfig);
const links = [...guide.matchAll(/^- \[[^\]]+\]\((https:\/\/[^)]+)\)/gm)].map(match => new URL(match[1]));
assert(links.some(link => link.href === website.url), 'The guide must link to the canonical homepage');
assert(links.some(link => link.href === application.downloadUrl), 'The guide must link to the same signed APK as the app metadata');
assert(!guide.includes('https://pausenapk.vercel.app'), 'The guide must follow the configured origin');
for (const link of links.filter(link => link.origin === publicConfig.siteUrl)) {
  const path = join(root, link.pathname === '/' ? 'index.html' : link.pathname);
  assert((await stat(path)).isFile(), `Missing llms.txt target: ${link.pathname}`);
  if (link.hash) assert((await readFile(path, 'utf8')).includes(`id="${link.hash.slice(1)}"`), `Missing llms.txt anchor: ${link.hash}`);
}
const robotsSource = await readFile(join(root, 'robots.txt'), 'utf8');
const sitemapSource = await readFile(join(root, 'sitemap.xml'), 'utf8');
const sitemap = renderDiscoveryFile(sitemapSource, 'sitemap.xml', publicConfig);
assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]),
  publicPages.map(page => new URL(page === 'index.html' ? '/' : page, website.url).href));
assert(renderDiscoveryFile(robotsSource, 'robots.txt', publicConfig).includes(`Sitemap: ${website.url}sitemap.xml`));
const previewConfig = { ...publicConfig, preview: true };
assert(renderDiscoveryFile(robotsSource, 'robots.txt', previewConfig).includes('Disallow: /'));
assert(!renderDiscoveryFile(sitemapSource, 'sitemap.xml', previewConfig).includes('<loc>'));
const preview = renderDocument(index, 'index.html', { siteUrl: 'https://pausen.example', formEndpoint: '', preview: true });
assert(preview.includes('noindex, nofollow'), 'Preview deployments must remain noindex');
const vercel = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'));
assert(vercel.redirects.some(rule => rule.source === '/index.html' && rule.destination === '/' && rule.permanent), 'Production must redirect the duplicate homepage');
const providerPrivacy = renderDocument(privacy, 'privacy.html', { siteUrl: 'https://pausen.example', formEndpoint: 'https://formspree.io/f/test' });
assert(providerPrivacy.includes('configured form provider'));
assert(!providerPrivacy.includes('It does not send a message automatically'));
const privateConfig = { siteUrl: 'https://pausen.example', feedbackEnabled: true };
const privateContact = renderDocument(index, 'index.html', privateConfig);
assert(privateContact.includes('action="/api/feedback" method="post" data-delivery="private"'));
assert(privateContact.includes('id="submit-label">Send feedback'));
const privatePrivacy = renderDocument(privacy, 'privacy.html', privateConfig);
assert(privatePrivacy.includes('private Supabase database'));
assert(!privatePrivacy.includes('It does not send a message automatically'));
assert(renderDocument(index, 'index.html', { ...privateConfig, preview: true }).includes('data-delivery="email"'));
assert.throws(() => validateSiteUrl('https://site.example/not-the-root'));
assert.throws(() => validateFormEndpoint('javascript:alert(1)'));
console.log(`PASS: canonical links and redirect, metadata budgets, social preview dimensions, image alternatives, APK integrity, favicons, linked site/app metadata, visible FAQs, llms.txt links, sitemap and robots rules, preview indexing controls, contact modes, and URL validation.\nInitial page assets: ${(raw / 1024).toFixed(1)} KiB raw / ${(transferred / 1024).toFixed(1)} KiB gzip (45 KiB transfer budget).\nAPK: ${apk.length} bytes; SHA-256 verified.`);
