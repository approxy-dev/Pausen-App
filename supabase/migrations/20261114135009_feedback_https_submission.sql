begin;

-- Only a SHA-256 digest of a random 256-bit write credential is stored here.
set local role pausen_feedback_owner;
create table pausen_private.feedback_write_credential (
  singleton boolean primary key default true check (singleton),
  token_hash bytea not null check (octet_length(token_hash) = 32)
);
alter table pausen_private.feedback_write_credential enable row level security;
revoke all on pausen_private.feedback_write_credential from public, anon, authenticated, service_role;
grant select (token_hash) on pausen_private.feedback_write_credential to pausen_feedback_writer;
create policy writer_verifies_credential on pausen_private.feedback_write_credential
  for select to pausen_feedback_writer using (true);
reset role;

-- The exposed RPC runs as its caller. Its protected helper runs as the existing
-- writer, which can verify the credential and submit but cannot read feedback.
create schema pausen_gateway;
revoke all on schema pausen_gateway from public, anon, authenticated, service_role;
grant usage on schema pausen_gateway to anon, pausen_feedback_writer;
grant pausen_feedback_writer to postgres;
grant create on schema pausen_gateway to pausen_feedback_writer;
create function pausen_gateway.submit_feedback(p_name text, p_email text, p_message text, p_client_key text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare
  token text := nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-pausen-submission-key';
begin
  if token is null or token !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = 'PT403', message = 'Submission credential required';
  end if;
  if not exists (select 1 from pausen_private.feedback_write_credential where token_hash = sha256(convert_to(token,'UTF8'))) then
    raise exception using errcode = 'PT403', message = 'Submission credential required';
  end if;
  return pausen_private.submit_feedback(p_name,p_email,p_message,p_client_key);
end;
$$;
alter function pausen_gateway.submit_feedback(text,text,text,text) owner to pausen_feedback_writer;
revoke create on schema pausen_gateway from pausen_feedback_writer;
revoke all on function pausen_gateway.submit_feedback(text,text,text,text) from public, anon, authenticated, service_role;
grant execute on function pausen_gateway.submit_feedback(text,text,text,text) to anon;

create function public.pausen_submit_feedback(p_name text, p_email text, p_message text, p_client_key text)
returns boolean language sql volatile security invoker set search_path = '' as $$
  select pausen_gateway.submit_feedback(p_name,p_email,p_message,p_client_key);
$$;
revoke all on function public.pausen_submit_feedback(text,text,text,text) from public, anon, authenticated, service_role;
grant execute on function public.pausen_submit_feedback(text,text,text,text) to anon;
notify pgrst, 'reload schema';
commit;
