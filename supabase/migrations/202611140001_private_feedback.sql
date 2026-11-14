-- Apply once in Pausen (toufdniikzwrycrpfuoo), as the project database owner.
-- Contains no passwords. The website role stays NOLOGIN until separately provisioned.
begin;

create role pausen_feedback_owner nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
create role pausen_feedback_writer nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
grant pausen_feedback_owner to postgres;
create schema pausen_private authorization pausen_feedback_owner;
revoke all on schema pausen_private from public, anon, authenticated, service_role;

set local role pausen_feedback_owner;
alter default privileges in schema pausen_private revoke all on tables from public;
alter default privileges in schema pausen_private revoke all on sequences from public;
alter default privileges in schema pausen_private revoke execute on functions from public;

create table pausen_private.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (char_length(email) between 3 and 254),
  message text not null check (char_length(message) between 1 and 2000)
);
create table pausen_private.feedback_limits (
  bucket text primary key,
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0)
);
alter table pausen_private.feedback enable row level security;
alter table pausen_private.feedback_limits enable row level security;
revoke all on all tables in schema pausen_private from public, anon, authenticated, service_role, pausen_feedback_writer;
revoke all on all sequences in schema pausen_private from public, anon, authenticated, service_role, pausen_feedback_writer;

-- The definer owns only this schema; the caller cannot read either table.
-- Atomic UPSERTs lock the counters across all server instances, including concurrent requests.
create function pausen_private.submit_feedback(p_name text, p_email text, p_message text, p_client_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
declare
  updated_count integer;
begin
  if p_name is null or char_length(btrim(p_name)) not between 1 and 80
     or p_email is null or char_length(p_email) > 254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or p_message is null or char_length(btrim(p_message)) not between 1 and 2000
     or p_client_key is null or p_client_key !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid feedback';
  end if;

  insert into pausen_private.feedback_limits as limits (bucket, window_start, attempts)
    values ('global', now(), 1)
    on conflict (bucket) do update set
      attempts = case when limits.window_start <= now() - interval '24 hours' then 1 else limits.attempts + 1 end,
      window_start = case when limits.window_start <= now() - interval '24 hours' then now() else limits.window_start end
    where limits.window_start <= now() - interval '24 hours' or limits.attempts < 500
    returning attempts into updated_count;
  if not found then return false; end if;

  delete from pausen_private.feedback_limits where bucket <> 'global' and window_start <= now() - interval '24 hours';
  insert into pausen_private.feedback_limits as limits (bucket, window_start, attempts)
    values (p_client_key, now(), 1)
    on conflict (bucket) do update set
      attempts = case when limits.window_start <= now() - interval '1 hour' then 1 else limits.attempts + 1 end,
      window_start = case when limits.window_start <= now() - interval '1 hour' then now() else limits.window_start end
    where limits.window_start <= now() - interval '1 hour' or limits.attempts < 5
    returning attempts into updated_count;
  -- Roll back the global counter when this individual submission is rate limited.
  if not found then raise exception using errcode = 'P4290', message = 'Rate limited'; end if;

  insert into pausen_private.feedback (name, email, message) values (btrim(p_name), btrim(p_email), btrim(p_message));
  return true;
exception when sqlstate 'P4290' then
  return false;
end;
$$;
revoke all on function pausen_private.submit_feedback(text, text, text, text) from public, anon, authenticated, service_role;
grant usage on schema pausen_private to pausen_feedback_writer;
grant execute on function pausen_private.submit_feedback(text, text, text, text) to pausen_feedback_writer;
reset role;
commit;
