import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

const maxBodyBytes = 32 * 1024;
const messages = {
  saved: 'Thank you. Your feedback has been saved privately for Approxy-dev.',
  invalid: 'Please enter a name, a valid email address, and a message of up to 2,000 characters.',
  unavailable: 'Feedback is temporarily unavailable. Your message has not been confirmed. Please email approxydev@gmail.com instead.',
  limited: 'Too many messages have been submitted. Please try again later or email approxydev@gmail.com.',
  forbidden: 'Please submit feedback from the Pausen website.',
  method: 'This endpoint only accepts feedback submissions.',
  size: 'This message is too large. Please shorten it and try again.',
  type: 'Use the feedback form to send your message.'
};

function reply(request, status, code, extra = {}) {
  const headers = {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    ...extra
  };
  if ((request.headers.get('accept') || '').includes('text/html')) {
    headers['Content-Type'] = 'text/html; charset=utf-8';
    return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pausen feedback</title><h1>Pausen feedback</h1><p>${messages[code]}</p><p><a href="/#contact">Return to Pausen</a></p></html>`, { status, headers });
  }
  return Response.json(status === 201 ? { ok: true, message: messages[code] } : { error: { code, message: messages[code] } }, { status, headers });
}

async function readBody(request) {
  if (Number(request.headers.get('content-length')) > maxBodyBytes) throw new RangeError('size');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid');
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBodyBytes) { await reader.cancel(); throw new RangeError('size'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}

function validate(values) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return null;
  if (Object.keys(values).some(key => !['name', 'email', 'message', '_gotcha'].includes(key))) return null;
  if (['_gotcha', 'name', 'email', 'message'].some(key => key in values && typeof values[key] !== 'string')) return null;
  if (values._gotcha?.trim()) return { spam: true };
  if (['name', 'email', 'message'].some(key => typeof values[key] !== 'string')) return null;
  const name = values.name.trim();
  const email = values.email.trim();
  const message = values.message.trim();
  const controls = /[\u0000-\u001f\u007f]/;
  if (!name || [...name].length > 80 || controls.test(name)
      || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || controls.test(email)
      || !message || [...message].length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message)) return null;
  return { name, email, message };
}

export function createFeedbackHandler({ config, save, now = () => new Date(), clientAddress = request => request.headers.get('x-vercel-forwarded-for') }) {
  return async request => {
    if (request.method !== 'POST') return reply(request, 405, 'method', { Allow: 'POST' });
    if (!config.enabled) return reply(request, 503, 'unavailable', { 'Retry-After': '300' });
    const site = request.headers.get('sec-fetch-site');
    if (request.headers.get('origin') !== config.origin || (site && site !== 'same-origin')) return reply(request, 403, 'forbidden');
    const contentType = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!['application/json', 'application/x-www-form-urlencoded'].includes(contentType)) return reply(request, 415, 'type');
    let data;
    try {
      const text = await readBody(request);
      if (contentType === 'application/json') data = JSON.parse(text);
      else {
        const params = new URLSearchParams(text);
        const keys = [...params.keys()];
        if (new Set(keys).size !== keys.length) return reply(request, 400, 'invalid');
        data = Object.fromEntries(params);
      }
    } catch (error) { return reply(request, error instanceof RangeError ? 413 : 400, error instanceof RangeError ? 'size' : 'invalid'); }
    const values = validate(data);
    if (!values) return reply(request, 400, 'invalid');
    if (values.spam) return reply(request, 201, 'saved');
    const address = clientAddress(request)?.trim();
    if (!address || !isIP(address)) return reply(request, 503, 'unavailable');
    // A daily HMAC prevents storing the visitor's IP or an enumerable plain hash.
    const normalized = isIP(address) === 6 ? new URL(`http://[${address}]/`).hostname : address;
    const clientKey = createHmac('sha256', config.rateLimitSecret).update(`${now().toISOString().slice(0, 10)}|${normalized}`).digest('hex');
    try {
      const accepted = await save({ ...values, clientKey });
      return accepted ? reply(request, 201, 'saved') : reply(request, 429, 'limited', { 'Retry-After': '3600' });
    } catch {
      // Do not log driver errors: they can contain SQL parameters and credentials.
      return reply(request, 503, 'unavailable', { 'Retry-After': '300' });
    }
  };
}
