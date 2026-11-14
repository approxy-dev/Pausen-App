import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeedbackHandler } from '../server/feedback-handler.mjs';
import { getFeedbackConfig, feedbackProjectRef } from '../server/feedback-config.mjs';
import { createFeedbackStore } from '../server/feedback-store.mjs';

const origin = 'https://pausenapk.vercel.app';
const valid = { name: 'A reader', email: 'reader@example.com', message: 'Please add another bedtime option.', _gotcha: '' };
const config = { enabled: true, origin, rateLimitSecret: 'a'.repeat(64) };
function request(body = valid, headers = {}, method = 'POST') {
  return new Request(`${origin}/api/feedback`, {
    method,
    headers: { origin, 'content-type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.1', ...headers },
    ...(!['GET', 'HEAD'].includes(method) ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {})
  });
}

test('saves validated feedback without returning submitted data or raw IP', async () => {
  let saved;
  const handler = createFeedbackHandler({ config, save: async data => { saved = data; return true; } });
  const result = await handler(request({ ...valid, name: ' A reader ', message: '<script>alert(1)</script>' }));
  assert.equal(result.status, 201);
  assert.deepEqual(Object.keys(await result.json()).sort(), ['message', 'ok']);
  assert.equal(saved.name, 'A reader');
  assert.equal(saved.message, '<script>alert(1)</script>');
  assert.match(saved.clientKey, /^[a-f0-9]{64}$/);
  assert(!JSON.stringify(saved).includes('192.0.2.1'));
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(result.headers.get('access-control-allow-origin'), null);
});

test('IP identifiers rotate daily and equivalent IPv6 addresses share a bucket', async () => {
  const keys = [];
  const save = async data => { keys.push(data.clientKey); return true; };
  const firstDay = createFeedbackHandler({ config, save, now: () => new Date('2026-11-14T12:00:00Z') });
  const nextDay = createFeedbackHandler({ config, save, now: () => new Date('2026-11-15T12:00:00Z') });
  await firstDay(request(valid, { 'x-vercel-forwarded-for': '2001:db8::1' }));
  await firstDay(request(valid, { 'x-vercel-forwarded-for': '2001:0db8:0000:0000:0000:0000:0000:0001' }));
  await nextDay(request(valid, { 'x-vercel-forwarded-for': '2001:db8::1' }));
  assert.equal(keys[0], keys[1]);
  assert.notEqual(keys[0], keys[2]);
});

test('GET and cross-origin requests never reach storage', async () => {
  const handler = createFeedbackHandler({ config, save: () => assert.fail('Unexpected database call') });
  const get = await handler(request(valid, {}, 'GET'));
  assert.equal(get.status, 405);
  assert.equal(get.headers.get('allow'), 'POST');
  for (const headers of [{ origin: 'https://attacker.example' }, { origin: 'null' }, { origin: '' }, { 'sec-fetch-site': 'cross-site' }]) {
    assert.equal((await handler(request(valid, headers))).status, 403);
  }
});

test('rejects malformed, oversized and invalid input before storage', async () => {
  const handler = createFeedbackHandler({ config, save: () => assert.fail('Unexpected database call') });
  for (const body of ['{', [], null, {}, { ...valid, email: 'invalid' }, { ...valid, name: ' ' },
    { ...valid, message: 'a'.repeat(2001) }, { ...valid, name: 'a'.repeat(81) }, { ...valid, _gotcha: [] },
    { ...valid, name: 'x\nHeader: y' }, { ...valid, message: 'hello\u0000there' }, { ...valid, admin: true }]) {
    assert.equal((await handler(request(body))).status, 400);
  }
  assert.equal((await handler(request(valid, { 'content-type': 'text/plain' }))).status, 415);
  assert.equal((await handler(request('a'.repeat(32769)))).status, 413);
  assert.equal((await handler(request(valid, { 'content-length': '32769' }))).status, 413);
  assert.equal((await handler(request(valid, { 'x-vercel-forwarded-for': 'invalid' }))).status, 503);
  assert.equal((await handler(request(valid, { 'x-vercel-forwarded-for': '' }))).status, 503);
});

test('honeypot submissions are discarded and do not reveal the filter', async () => {
  const handler = createFeedbackHandler({ config, save: () => assert.fail('Spam must not be stored') });
  assert.equal((await handler(request({ ...valid, _gotcha: 'https://spam.example' }))).status, 201);
});

test('rate limits and database failures produce useful errors without leaking details', async () => {
  const limited = createFeedbackHandler({ config, save: async () => false });
  const result = await limited(request());
  assert.equal(result.status, 429);
  assert.equal(result.headers.get('retry-after'), '3600');
  const failed = createFeedbackHandler({ config, save: async () => { throw new Error('password=secret reader@example.com'); } });
  const failure = await failed(request());
  assert.equal(failure.status, 503);
  const text = await failure.text();
  assert(!text.includes('password=secret') && !text.includes('reader@example.com'));
});

test('plain HTML form works without JavaScript and never reflects submitted text', async () => {
  let calls = 0;
  const handler = createFeedbackHandler({ config, save: async () => { calls++; return true; } });
  const result = await handler(request(new URLSearchParams({ ...valid, message: '<script>secret</script>' }).toString(), {
    'content-type': 'application/x-www-form-urlencoded', accept: 'text/html'
  }));
  assert.equal(result.status, 201);
  assert.equal(calls, 1);
  const html = await result.text();
  assert(html.includes('saved privately') && !html.includes('<script>'));
  assert.equal((await handler(request('name=one&name=two&email=x%40example.com&message=hello', {
    'content-type': 'application/x-www-form-urlencoded'
  }))).status, 400);
});

test('feature stays unavailable until explicitly enabled; previews never write', async () => {
  assert.deepEqual(getFeedbackConfig({}), { enabled: false });
  assert.deepEqual(getFeedbackConfig({ FEEDBACK_ENABLED: 'true', VERCEL_ENV: 'preview' }), { enabled: false });
  const handler = createFeedbackHandler({ config: { enabled: false }, save: () => assert.fail('Disabled') });
  assert.equal((await handler(request())).status, 503);
});

test('configuration pins the HTTPS project and refuses an admin key or weak server credentials', () => {
  const env = {
    FEEDBACK_ENABLED: 'true', FEEDBACK_RATE_LIMIT_SECRET: 'c'.repeat(64),
    FEEDBACK_PUBLISHABLE_KEY: 'sb_publishable_' + 'x'.repeat(24), FEEDBACK_SUBMISSION_KEY: 'd'.repeat(64)
  };
  const result = getFeedbackConfig(env);
  assert.equal(result.origin, origin);
  assert.equal(result.submissionUrl, `https://${feedbackProjectRef}.supabase.co/rest/v1/rpc/pausen_submit_feedback`);
  assert.throws(() => getFeedbackConfig({ ...env, FEEDBACK_RATE_LIMIT_SECRET: 'short' }));
  assert.throws(() => getFeedbackConfig({ ...env, FEEDBACK_PUBLISHABLE_KEY: 'sb_secret_' + 'x'.repeat(24) }));
  assert.throws(() => getFeedbackConfig({ ...env, FEEDBACK_SUBMISSION_KEY: '' }));
  assert.throws(() => getFeedbackConfig({ ...env, FEEDBACK_SUBMISSION_KEY: env.FEEDBACK_RATE_LIMIT_SECRET }));
  assert.throws(() => getFeedbackConfig({ ...env, SITE_URL: 'http://pausenapk.vercel.app' }));
});

test('storage distinguishes a rate limit from an unconfirmed submission', async () => {
  const config = { submissionUrl:'https://pausen.example/rest/v1/rpc/pausen_submit_feedback', publishableKey:'public-test', submissionKey:'test-secret' };
  const validRow = { ...valid, clientKey:'a'.repeat(64) };
  for (const accepted of [true,false]) {
    const store = createFeedbackStore(config, async (url, options) => {
      assert.equal(url, config.submissionUrl);
      assert.equal(options.headers['x-pausen-submission-key'],config.submissionKey);
      assert.equal(options.redirect,'error');
      assert.deepEqual(JSON.parse(options.body), { p_name:valid.name, p_email:valid.email, p_message:valid.message, p_client_key:validRow.clientKey });
      return Response.json(accepted);
    });
    assert.equal(await store.save(validRow),accepted);
  }
  for (const response of [Response.json({}, {status:403}), Response.json(null)]) {
    await assert.rejects(createFeedbackStore(config, async () => response).save(validRow));
  }
});
