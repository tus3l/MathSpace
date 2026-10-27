-- Single active session per account + account status (active / frozen / suspended / banned).
--
-- The existing RPCs (app_login, app_session, ...) are kept untouched. They are only made
-- non-callable from the API, and new overloads that additionally take p_device_id are put in
-- front of them. Every overload validates the session server-side before delegating.
-- Safe to re-run.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists session_guard;
revoke all on schema session_guard from public, anon, authenticated;

create table if not exists session_guard.account_status (
  account_id text primary key,
  status text not null default 'active'
    check (status in ('active', 'frozen', 'suspended', 'banned')),
  reason text check (reason is null or char_length(reason) <= 500),
  updated_by text,
  updated_at timestamptz not null default now()
);

create table if not exists session_guard.account_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  device_id text not null,
  device_label text,
  user_agent text,
  token_hash text not null unique,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'logged_out')),
  revoked_reason text,
  created_at timestamptz not null default now(),
  last_activity timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  revoked_at timestamptz
);
-- The database itself guarantees at most one active session per account.
create unique index if not exists account_sessions_one_active
  on session_guard.account_sessions (account_id) where status = 'active';
create index if not exists account_sessions_account_idx
  on session_guard.account_sessions (account_id, created_at desc);

alter table session_guard.account_status enable row level security;
alter table session_guard.account_sessions enable row level security;
revoke all on all tables in schema session_guard from public, anon, authenticated;

-- Helpers (private schema, not reachable through the API) ---------------------------------

create or replace function session_guard.hash_token(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

create or replace function session_guard.revoke_account(p_account_id text, p_reason text)
returns void
language sql
set search_path = ''
as $$
  update session_guard.account_sessions
     set status = 'revoked', revoked_reason = p_reason, revoked_at = now()
   where account_id = p_account_id and status = 'active';
$$;

-- Freezing / suspending / banning revokes the active session immediately, whatever the source.
create or replace function session_guard.on_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> 'active' then
    perform session_guard.revoke_account(new.account_id, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists account_status_revoke on session_guard.account_status;
create trigger account_status_revoke
  after insert or update of status on session_guard.account_status
  for each row execute function session_guard.on_status_change();

-- Raises when the token is not the account's active session for this device.
-- Read-only on purpose: a raised exception rolls back the whole request transaction.
create or replace function session_guard.require_session(p_token text, p_device_id text)
returns session_guard.account_sessions
language plpgsql
stable
set search_path = ''
as $$
declare
  s session_guard.account_sessions;
  st session_guard.account_status;
begin
  if coalesce(p_token, '') = '' or coalesce(p_device_id, '') = '' then
    raise exception 'not_authenticated';
  end if;

  select * into s from session_guard.account_sessions
   where token_hash = session_guard.hash_token(p_token);
  if not found or s.device_id <> p_device_id then
    raise exception 'not_authenticated';
  end if;

  select * into st from session_guard.account_status where account_id = s.account_id;
  if found and st.status <> 'active' then
    raise exception using message = 'account_' || st.status, detail = coalesce(st.reason, '');
  end if;

  if s.status = 'revoked' and s.revoked_reason = 'replaced' then
    raise exception 'session_replaced';
  end if;
  if s.status <> 'active' or s.expires_at <= now() then
    raise exception 'not_authenticated';
  end if;
  return s;
end;
$$;

-- Lock the original RPCs: only the guarded overloads below may call them -------------------

do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('app_login', 'app_session', 'app_logout', 'app_change_password',
                         'admin_list_accounts', 'admin_create_account',
                         'admin_reset_password', 'admin_delete_account')
       and not ('p_device_id' = any (coalesce(p.proargnames, '{}')))
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end;
$$;

-- Guarded API --------------------------------------------------------------------------------

create or replace function public.app_login(
  p_id text, p_password text, p_device_id text, p_device_label text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
  v_account text;
  v_token text;
  st session_guard.account_status;
begin
  if coalesce(p_device_id, '') !~ '^[A-Za-z0-9-]{16,64}$' then
    raise exception 'invalid_device';
  end if;

  -- Credentials and lockout are verified by the original function.
  select to_jsonb(x) into r from public.app_login(p_id, p_password) x;
  if coalesce((r ->> 'ok')::boolean, false) is not true then
    return r;
  end if;
  v_account := r -> 'account' ->> 'id';
  v_token := r ->> 'token';

  select * into st from session_guard.account_status where account_id = v_account;
  if found and st.status <> 'active' then
    perform public.app_logout(v_token);
    return jsonb_build_object('ok', false, 'error', 'account_' || st.status, 'reason', st.reason);
  end if;

  -- The new device always wins: revoke the previous session, activate this one.
  perform pg_advisory_xact_lock(hashtextextended('session_guard:' || v_account, 0));
  perform session_guard.revoke_account(v_account, 'replaced');
  insert into session_guard.account_sessions (account_id, device_id, device_label, user_agent, token_hash)
  values (
    v_account,
    p_device_id,
    left(nullif(trim(p_device_label), ''), 120),
    left(nullif(current_setting('request.headers', true), '')::json ->> 'user-agent', 300),
    session_guard.hash_token(v_token)
  );
  return r;
end;
$$;

create or replace function public.app_session(p_token text, p_device_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s session_guard.account_sessions;
  a jsonb;
begin
  s := session_guard.require_session(p_token, p_device_id);
  select to_jsonb(x) into a from public.app_session(p_token) x;
  if a is null or a = 'null'::jsonb then
    update session_guard.account_sessions
       set status = 'revoked', revoked_reason = 'invalid', revoked_at = now()
     where id = s.id;
    return null;
  end if;
  update session_guard.account_sessions
     set last_activity = now()
   where id = s.id and last_activity < now() - interval '30 seconds';
  return a;
end;
$$;

create or replace function public.app_logout(p_token text, p_device_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update session_guard.account_sessions
     set status = 'logged_out', revoked_reason = 'logout', revoked_at = now()
   where token_hash = session_guard.hash_token(p_token) and status = 'active';
  perform public.app_logout(p_token);
end;
$$;

create or replace function public.app_change_password(
  p_token text, p_new_password text, p_device_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
begin
  perform session_guard.require_session(p_token, p_device_id);
  select to_jsonb(x) into r from public.app_change_password(p_token, p_new_password) x;
  return r;
end;
$$;

-- The original list function may return json or a set of rows; generate the matching body.
do $$
declare
  v_rows text;
begin
  select case when p.proretset
           then 'select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.admin_list_accounts(p_token) x'
           else 'select coalesce(to_jsonb(x), ''[]''::jsonb) from public.admin_list_accounts(p_token) x'
         end
    into v_rows
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'admin_list_accounts' and p.pronargs = 1;

  if v_rows is null then
    raise exception 'public.admin_list_accounts(p_token) not found';
  end if;

  execute format($f$
    create or replace function public.admin_list_accounts(p_token text, p_device_id text)
    returns jsonb
    language plpgsql
    security definer
    set search_path = ''
    as $body$
    declare
      v_rows jsonb;
    begin
      perform session_guard.require_session(p_token, p_device_id);
      %s into v_rows;
      return (
        select coalesce(jsonb_agg(
                 e.value || jsonb_build_object(
                   'status', coalesce(st.status, 'active'),
                   'statusReason', st.reason,
                   'activeSession', (
                     select jsonb_build_object(
                              'deviceLabel', s.device_label,
                              'createdAt', s.created_at,
                              'lastActivity', s.last_activity)
                       from session_guard.account_sessions s
                      where s.account_id = e.value ->> 'id'
                        and s.status = 'active' and s.expires_at > now()))
                 order by e.ordinality), '[]'::jsonb)
          from jsonb_array_elements(v_rows) with ordinality e
          left join session_guard.account_status st on st.account_id = e.value ->> 'id'
      );
    end;
    $body$;
  $f$, v_rows);
end;
$$;

create or replace function public.admin_create_account(p_token text, p_name text, p_device_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
begin
  perform session_guard.require_session(p_token, p_device_id);
  select to_jsonb(x) into r from public.admin_create_account(p_token, p_name) x;
  -- A recycled ID must never inherit an old status or session.
  delete from session_guard.account_status where account_id = r ->> 'id';
  delete from session_guard.account_sessions where account_id = r ->> 'id';
  return r;
end;
$$;

create or replace function public.admin_reset_password(p_token text, p_id text, p_device_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
begin
  perform session_guard.require_session(p_token, p_device_id);
  select to_jsonb(x) into r from public.admin_reset_password(p_token, p_id) x;
  perform session_guard.revoke_account(p_id, 'password_reset');
  return r;
end;
$$;

create or replace function public.admin_delete_account(p_token text, p_id text, p_device_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform session_guard.require_session(p_token, p_device_id);
  perform public.admin_delete_account(p_token, p_id);
  delete from session_guard.account_sessions where account_id = p_id;
  delete from session_guard.account_status where account_id = p_id;
end;
$$;

create or replace function public.admin_set_account_status(
  p_token text, p_device_id text, p_id text, p_status text, p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s session_guard.account_sessions;
  me jsonb;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  s := session_guard.require_session(p_token, p_device_id);
  select to_jsonb(x) into me from public.app_session(p_token) x;
  if me is null or me ->> 'role' is distinct from 'admin' then
    raise exception 'forbidden';
  end if;
  if p_id = s.account_id then
    raise exception 'cannot_change_self';
  end if;
  if p_status is null or p_status not in ('active', 'frozen', 'suspended', 'banned') then
    raise exception 'invalid_status';
  end if;
  if p_status <> 'active' and v_reason is null then
    raise exception 'reason_required';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(public.admin_list_accounts(p_token, p_device_id)) e
     where e ->> 'id' = p_id
  ) then
    raise exception 'not_found';
  end if;

  insert into session_guard.account_status (account_id, status, reason, updated_by, updated_at)
  values (p_id, p_status, case when p_status = 'active' then null else left(v_reason, 500) end,
          s.account_id, now())
  on conflict (account_id) do update
    set status = excluded.status, reason = excluded.reason,
        updated_by = excluded.updated_by, updated_at = excluded.updated_at;

  return jsonb_build_object('id', p_id, 'status', p_status, 'reason', v_reason);
end;
$$;

-- Only the guarded overloads are callable from the browser.
do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('app_login', 'app_session', 'app_logout', 'app_change_password',
                         'admin_list_accounts', 'admin_create_account',
                         'admin_reset_password', 'admin_delete_account',
                         'admin_set_account_status')
       and 'p_device_id' = any (coalesce(p.proargnames, '{}'))
  loop
    execute format('revoke execute on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
