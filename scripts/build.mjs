import { copyFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { root, getConfig, renderDocument, escapeHtml } from './config.mjs';

const config = await getConfig();
const output = join(root, 'dist');
await mkdir(output, { recursive: true });
for (const page of ['index.html', 'privacy.html']) {
  await writeFile(join(output, page), renderDocument(await readFile(join(root, page), 'utf8'), page, config));
}
for (const file of ['styles.css', 'script.js', 'google9f3fb088d8fefe90.html', 'llms.txt', 'site.webmanifest']) {
  try {
    await copyFile(join(root, file), join(output, file));
  } catch {}
}
for (const directory of ['assets', 'downloads', '.well-known']) {
  try {
    await cp(join(root, directory), join(output, directory), { recursive: true });
  } catch {}
}
const today = new Date().toISOString().split('T')[0];
const pages = [
  { path: '', priority: '1.0', changefreq: 'weekly' },
  { path: 'privacy.html', priority: '0.8', changefreq: 'monthly' }
];
const urls = config.siteUrl ? pages.map(p => `  <url>\n    <loc>${escapeHtml(`${config.siteUrl}/${p.path}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`).join('\n') : '';
await writeFile(join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
await writeFile(join(output, 'robots.txt'), config.preview ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n${config.siteUrl ? `Sitemap: ${config.siteUrl}/sitemap.xml\n` : ''}`);
console.log(`Built static site in ${output}`);
console.log(config.siteUrl ? `Public URLs: ${config.siteUrl}` : 'No public URL yet. Local output is noindex; Vercel supplies its deployment domain automatically.');
console.log(config.formEndpoint ? 'Contact delivery: configured form provider.' : 'Contact delivery: email draft (no message is automatically sent).');
