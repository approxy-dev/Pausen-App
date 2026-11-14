import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

let db;
const clientKey = 'a'.repeat(64);
before(async () => {
  db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  const migrations = new URL('../supabase/migrations/', import.meta.url);
  for (const name of (await readdir(migrations)).filter(name => name.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(name, migrations), 'utf8'));
  }
});
beforeEach(async () => { await db.exec('reset role; truncate pausen_private.feedback, pausen_private.feedback_limits restart identity;'); });
after(async () => { await db?.close(); });

test('the HTTPS path verifies the server credential and cannot expose tables to the API role', async () => {
  const token = 'c'.repeat(64);
  await db.query('insert into pausen_private.feedback_write_credential(token_hash) values (sha256(convert_to($1,\'UTF8\')))', [token]);
  await db.exec('set role anon');
  const viaApi = () => db.query('select public.pausen_submit_feedback($1,$2,$3,$4) as accepted', ['Reader','reader@example.com','Synthetic check',clientKey]);
  const headers = value => db.query("select set_config('request.headers',$1,false)", [JSON.stringify(value)]);
  await headers({});
  await assert.rejects(viaApi(), { code:'PT403' });
  await headers({ 'x-pausen-submission-key':'d'.repeat(64) });
  await assert.rejects(viaApi(), { code:'PT403' });
  await headers({ 'x-pausen-submission-key':token });
  assert.equal((await viaApi()).rows[0].accepted, true);
  await assert.rejects(db.query('select token_hash from pausen_private.feedback_write_credential'), { code:'42501' });
  await assert.rejects(db.query('select message from pausen_private.feedback'), { code:'42501' });
  await db.exec('reset role');
  const { rows } = await db.query('select count(*)::int as count from pausen_private.feedback');
  assert.equal(rows[0].count, 1);
  await db.exec('set role authenticated');
  await assert.rejects(viaApi(), { code:'42501' });
  await db.exec('reset role');
});
async function submit(key = clientKey, message = 'A useful suggestion.') {
  const result = await db.query('select pausen_private.submit_feedback($1, $2, $3, $4) as accepted', ['Reader', 'reader@example.com', message, key]);
  return result.rows[0].accepted;
}

test('public, signed-in and service roles cannot read or invoke the private function', async () => {
  for (const role of ['anon', 'authenticated', 'service_role']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query('select * from pausen_private.feedback'), { code: '42501' });
    await assert.rejects(submit(), { code: '42501' });
    await db.exec('reset role');
  }
  const { rows } = await db.query("select relrowsecurity from pg_class where oid in ('pausen_private.feedback'::regclass, 'pausen_private.feedback_limits'::regclass)");
  assert(rows.every(row => row.relrowsecurity));
});

test('writer can submit but cannot select, modify or bypass the function', async () => {
  await db.exec('set role pausen_feedback_writer');
  assert.equal(await submit(), true);
  for (const query of [
    'select * from pausen_private.feedback',
    'select * from pausen_private.feedback_limits',
    "insert into pausen_private.feedback(name,email,message) values ('X','x@example.com','Direct')",
    "update pausen_private.feedback set message = 'Changed'",
    'delete from pausen_private.feedback',
    'truncate pausen_private.feedback',
    'create table pausen_private.attack(id int)'
  ]) await assert.rejects(db.query(query), { code: '42501' });
  await db.exec('reset role');
  const { rows } = await db.query("select pg_has_role('pausen_feedback_writer', 'pausen_feedback_owner', 'MEMBER') as owner_member");
  assert.equal(rows[0].owner_member, false);
  assert.equal((await db.query('select count(*)::integer as count from pausen_private.feedback')).rows[0].count, 1);
});

test('the sixth submission is refused without inserting another row', async () => {
  await db.exec('set role pausen_feedback_writer');
  for (let i = 0; i < 5; i++) assert.equal(await submit(), true);
  assert.equal(await submit(), false);
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::integer as count from pausen_private.feedback')).rows[0].count, 5);
  assert.equal((await db.query("select attempts from pausen_private.feedback_limits where bucket = 'global'")).rows[0].attempts, 5);
});

test('all callers share the global daily budget, and expired windows recover', async () => {
  await db.exec("insert into pausen_private.feedback_limits values ('global', now(), 500)");
  await db.exec('set role pausen_feedback_writer');
  assert.equal(await submit(), false);
  await db.exec('reset role');
  await db.exec("update pausen_private.feedback_limits set window_start = now() - interval '25 hours'");
  await db.exec('set role pausen_feedback_writer');
  assert.equal(await submit(), true);
  await db.exec('reset role');
  assert.equal((await db.query("select attempts from pausen_private.feedback_limits where bucket = 'global'")).rows[0].attempts, 1);
});

test('invalid values fail in the database too; SQL-looking messages remain plain data', async () => {
  await db.exec('set role pausen_feedback_writer');
  await assert.rejects(submit('bad-key'), { code: '22023' });
  await assert.rejects(submit(clientKey, 'a'.repeat(2001)), { code: '22023' });
  const message = "'); drop table pausen_private.feedback; --";
  assert.equal(await submit(clientKey, message), true);
  await db.exec('reset role');
  assert.equal((await db.query('select message from pausen_private.feedback')).rows[0].message, message);
});

test('expired pseudonymous rate-limit records are cleaned on later submissions', async () => {
  const old = 'b'.repeat(64);
  await db.query("insert into pausen_private.feedback_limits values ($1, now() - interval '25 hours', 1)", [old]);
  await db.exec('set role pausen_feedback_writer');
  assert.equal(await submit(), true);
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::integer as count from pausen_private.feedback_limits where bucket = $1', [old])).rows[0].count, 0);
});
