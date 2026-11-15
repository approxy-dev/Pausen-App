import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { getFeedbackConfig } from '../server/feedback-config.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const publicPages = ['index.html', 'privacy.html'];
export const publicFiles = ['styles.css', 'script.js', 'google9f3fb088d8fefe90.html', 'site.webmanifest', 'favicon.ico', 'favicon-48x48.png', 'apple-touch-icon.png'];
export const discoveryFiles = ['llms.txt', 'robots.txt', 'sitemap.xml'];
export const publicDirectories = ['assets', 'downloads', '.well-known'];
const sourceOrigin = 'https://pausenapk.vercel.app';
const sourceHostname = new URL(sourceOrigin).hostname;
export function validateSiteUrl(value) {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('The public site URL must be an HTTPS origin, without a path, query, or credentials.');
  }
  return url.origin;
}
export function validateFormEndpoint(value) {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw new Error('The form endpoint must be an HTTPS URL without credentials or a fragment.');
  }
  return url.href;
}
export async function getConfig() {
  const stored = JSON.parse(await readFile(new URL('../site.config.json', import.meta.url), 'utf8'));
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const feedbackEnabled = getFeedbackConfig().enabled;
  if (feedbackEnabled && (process.env.FORM_ENDPOINT || stored.formEndpoint)) {
    throw new Error('Choose Supabase feedback or an external form endpoint, not both.');
  }
  return {
    siteUrl: validateSiteUrl(process.env.SITE_URL || stored.siteUrl || (vercelHost ? `https://${vercelHost}` : '')),
    formEndpoint: validateFormEndpoint(process.env.FORM_ENDPOINT || stored.formEndpoint || ''),
    preview: process.env.VERCEL_ENV === 'preview',
    feedbackEnabled
  };
}
export const escapeHtml = value => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
export function renderDiscoveryFile(source, file, { siteUrl, preview }) {
  if (preview || !siteUrl) {
    if (file === 'robots.txt') return 'User-agent: *\nDisallow: /\n';
    if (file === 'sitemap.xml') return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>\n';
  }
  if (!siteUrl) return source;
  const origin = file === 'sitemap.xml' ? escapeHtml(siteUrl) : siteUrl;
  return source.replaceAll(`${sourceOrigin}/`, () => `${origin}/`);
}
export function renderDocument(html, page, config) {
  const meta = [];
  if (config.siteUrl) {
    const url = `${config.siteUrl}/${page === 'index.html' ? '' : page}`;
    meta.push(`<link rel="canonical" href="${escapeHtml(url)}">`, `<meta property="og:url" content="${escapeHtml(url)}">`);
    html = html.replaceAll('content="assets/brand/social-preview-wide.png"', `content="${escapeHtml(config.siteUrl)}/assets/brand/social-preview-wide.png"`);
    html = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (_, open, json, close) => {
      const hostname = new URL(config.siteUrl).hostname;
      const data = JSON.parse(json, (key, value) => {
        if (value === sourceHostname) return hostname;
        if (typeof value === 'string' && (value === sourceOrigin || value.startsWith(`${sourceOrigin}/`))) {
          return config.siteUrl + value.slice(sourceOrigin.length);
        }
        return value;
      });
      return `${open}\n  ${JSON.stringify(data, null, 2).replaceAll('<', '\\u003c')}\n  ${close}`;
    });
  }
  if (!config.siteUrl || config.preview) meta.push('<meta name="robots" content="noindex, nofollow">');
  html = html.replace('<!-- deployment-meta -->', meta.join('\n  '));
  if (config.feedbackEnabled && !config.preview) {
    html = html.replace('action="mailto:approxydev@gmail.com" method="get" data-delivery="email"', 'action="/api/feedback" method="post" data-delivery="private"')
      .replace('id="submit-label">Open email draft', 'id="submit-label">Send feedback')
      .replace('Opens your email app.<br>You review the draft before sending.', 'Sent privately to Approxy-dev.<br>Please share only what’s needed.')
      .replace(/<p id="website-contact-policy">[\s\S]*?<\/p>/, '<p id="website-contact-policy">When you submit feedback, your name, email address, and message are sent over HTTPS through Vercel and stored in our private Supabase database so Approxy-dev can read and respond. Messages are not published on the website or GitHub. The submission service can add messages but cannot read stored feedback. Short-lived keyed identifiers derived from your IP address help limit abuse; the feedback database does not store your raw IP address. Vercel and Supabase also process technical request information to operate their services. Feedback is kept until it is no longer needed for support, or you request deletion. You can use the direct email link instead.</p>');
  } else if (config.formEndpoint) {
    html = html.replace('action="mailto:approxydev@gmail.com" method="get" data-delivery="email"', `action="${escapeHtml(config.formEndpoint)}" method="post" data-delivery="provider"`)
      .replace('id="submit-label">Open email draft', 'id="submit-label">Send message')
      .replace('Opens your email app.<br>You review the draft before sending.', 'Sends through our form provider.<br>Please share only what’s needed.')
      .replace(/<p id="website-contact-policy">[\s\S]*?<\/p>/, '<p id="website-contact-policy">The feedback form submits your name, email address, and message to our configured form provider, which forwards them to approxydev@gmail.com. The provider processes that information to deliver the message and prevent spam. You can use the direct email link instead.</p>');
  }
  return html;
}
