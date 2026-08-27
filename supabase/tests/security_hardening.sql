\set ON_ERROR_STOP on

-- Security regression suite for Issue #54 and Issue #123.
-- This suite validates both RLS policy shape and the independent object-grant layer.

do $$
declare
  offenders text;
begin
  select string_agg(format('%I', c.relname), ', ' order by c.relname)
    into offenders
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and not c.relrowsecurity;

  if offenders is not null then
    raise exception 'public tables without RLS: %', offenders;
  end if;
end;
$$;

do $$
declare
  offenders text;
begin
  select string_agg(format('%I.%I', tablename, policyname), ', ' order by tablename, policyname)
    into offenders
  from pg_policies
  where schemaname = 'public'
    and roles && array['anon'::name, 'public'::name];

  if offenders is not null then
    raise exception 'policies exposed to anon/PUBLIC: %', offenders;
  end if;
end;
$$;

do $$
declare
  offenders text;
begin
  select string_agg(format('%I.%I', tablename, policyname), ', ' order by tablename, policyname)
    into offenders
  from pg_policies
  where schemaname = 'public'
    and (
      lower(regexp_replace(coalesce(qual, ''), '\s+', '', 'g')) in ('true', '(true)')
      or lower(regexp_replace(coalesce(with_check, ''), '\s+', '', 'g')) in ('true', '(true)')
      or lower(coalesce(qual, '') || ' ' || coalesce(with_check, '')) like '%auth.role(%'
      or lower(coalesce(qual, '') || ' ' || coalesce(with_check, '')) like '%user_metadata%'
      or lower(coalesce(qual, '') || ' ' || coalesce(with_check, '')) like '%raw_user_meta_data%'
    );

  if offenders is not null then
    raise exception 'unsafe public RLS policies: %', offenders;
  end if;
end;
$$;

-- anon must have no relation privileges in the exposed app schema.
do $$
declare
  offenders text;
begin
  select string_agg(format('%I', c.relname), ', ' order by c.relname)
    into offenders
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p', 'v', 'm')
    and (
      has_table_privilege('anon', c.oid, 'SELECT')
      or has_table_privilege('anon', c.oid, 'INSERT')
      or has_table_privilege('anon', c.oid, 'UPDATE')
      or has_table_privilege('anon', c.oid, 'DELETE')
      or has_table_privilege('anon', c.oid, 'TRUNCATE')
      or has_table_privilege('anon', c.oid, 'REFERENCES')
      or has_table_privilege('anon', c.oid, 'TRIGGER')
    );

  if offenders is not null then
    raise exception 'anon relation privileges remain in public: %', offenders;
  end if;
end;
$$;

-- authenticated table privileges must be exactly backed by explicit policies.
do $$
declare
  relation_row record;
  policy_exists boolean;
begin
  for relation_row in
    select c.oid, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
    order by c.relname
  loop
    select exists (
      select 1 from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = relation_row.relname
        and p.cmd in ('SELECT', 'ALL')
        and ('authenticated'::name = any(p.roles) or 'public'::name = any(p.roles))
    ) into policy_exists;
    if has_table_privilege('authenticated', relation_row.oid, 'SELECT') <> policy_exists then
      raise exception 'SELECT grant/policy mismatch on public.%', relation_row.relname;
    end if;

    select exists (
      select 1 from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = relation_row.relname
        and p.cmd in ('INSERT', 'ALL')
        and ('authenticated'::name = any(p.roles) or 'public'::name = any(p.roles))
    ) into policy_exists;
    if has_table_privilege('authenticated', relation_row.oid, 'INSERT') <> policy_exists then
      raise exception 'INSERT grant/policy mismatch on public.%', relation_row.relname;
    end if;

    select exists (
      select 1 from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = relation_row.relname
        and p.cmd in ('UPDATE', 'ALL')
        and ('authenticated'::name = any(p.roles) or 'public'::name = any(p.roles))
    ) into policy_exists;
    if has_table_privilege('authenticated', relation_row.oid, 'UPDATE') <> policy_exists then
      raise exception 'UPDATE grant/policy mismatch on public.%', relation_row.relname;
    end if;

    if has_table_privilege('authenticated', relation_row.oid, 'DELETE')
       or has_table_privilege('authenticated', relation_row.oid, 'TRUNCATE')
       or has_table_privilege('authenticated', relation_row.oid, 'REFERENCES')
       or has_table_privilege('authenticated', relation_row.oid, 'TRIGGER')
       or has_table_privilege('authenticated', relation_row.oid, 'MAINTAIN') then
      raise exception 'administrative/direct delete privilege remains on public.%', relation_row.relname;
    end if;
  end loop;
end;
$$;

-- Public views must preserve underlying RLS and remain unavailable to anon.
do $$
declare
  invoker_enabled boolean;
begin
  select coalesce('security_invoker=true' = any(c.reloptions), false)
    into invoker_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'payable_installment_summary'
    and c.relkind = 'v';

  if not coalesce(invoker_enabled, false) then
    raise exception 'payable_installment_summary must use security_invoker=true';
  end if;

  if has_table_privilege('anon', 'public.payable_installment_summary', 'SELECT') then
    raise exception 'anon unexpectedly has SELECT on payable_installment_summary';
  end if;

  if not has_table_privilege('authenticated', 'public.payable_installment_summary', 'SELECT') then
    raise exception 'authenticated lost SELECT on payable_installment_summary';
  end if;
end;
$$;

-- No SECURITY DEFINER function in public may be callable by anon (including via PUBLIC).
do $$
declare
  offenders text;
begin
  select string_agg(p.oid::regprocedure::text, ', ' order by p.oid::regprocedure::text)
    into offenders
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and has_function_privilege('anon', p.oid, 'EXECUTE');

  if offenders is not null then
    raise exception 'anon can execute public SECURITY DEFINER functions: %', offenders;
  end if;

  if has_function_privilege('anon', 'public.set_updated_at()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.set_updated_at()', 'EXECUTE')
     or has_function_privilege('service_role', 'public.set_updated_at()', 'EXECUTE') then
    raise exception 'set_updated_at remains directly executable by an API role';
  end if;
end;
$$;

-- Private authorization helpers must not depend on PostgreSQL's historical
-- PUBLIC function EXECUTE default. Inspect direct ACLs because anon lacks
-- private-schema USAGE and an effective-privilege check alone would hide this gap.
do $$
declare
  offenders text;
  helper regprocedure;
begin
  select string_agg(p.oid::regprocedure::text, ', ' order by p.oid::regprocedure::text)
    into offenders
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
  where n.nspname = 'private'
    and acl.grantee = 0
    and acl.privilege_type = 'EXECUTE';

  if offenders is not null then
    raise exception 'private functions retain PUBLIC EXECUTE ACLs: %', offenders;
  end if;

  if has_schema_privilege('anon', 'private', 'USAGE') then
    raise exception 'anon unexpectedly has USAGE on private schema';
  end if;

  if not has_schema_privilege('authenticated', 'private', 'USAGE') then
    raise exception 'authenticated lost private schema USAGE required by RLS helpers';
  end if;

  foreach helper in array array[
    'private.can_read_business(uuid,uuid)'::regprocedure,
    'private.can_read_cash_session(uuid,uuid)'::regprocedure,
    'private.can_read_inventory_count(uuid,uuid)'::regprocedure,
    'private.can_read_payable_document(uuid,uuid)'::regprocedure,
    'private.can_read_purchase_order(uuid,uuid)'::regprocedure,
    'private.can_read_sector(uuid,uuid)'::regprocedure,
    'private.can_read_stock_location(uuid,uuid)'::regprocedure,
    'private.can_read_stock_movement(uuid,uuid)'::regprocedure,
    'private.can_read_transfer(uuid,uuid)'::regprocedure,
    'private.can_read_unit(uuid,uuid)'::regprocedure,
    'private.has_business_role(uuid,uuid,text[])'::regprocedure,
    'private.has_cash_register_role(uuid,uuid,text[])'::regprocedure,
    'private.has_org_wide_role(uuid,text[])'::regprocedure,
    'private.has_sector_role(uuid,uuid,text[])'::regprocedure,
    'private.has_stock_location_role(uuid,uuid,text[])'::regprocedure,
    'private.has_target_scope_role(uuid,uuid,uuid,text[])'::regprocedure,
    'private.has_unit_role(uuid,uuid,text[])'::regprocedure
  ]
  loop
    if not has_function_privilege('authenticated', helper, 'EXECUTE') then
      raise exception 'authenticated lost EXECUTE on RLS helper %', helper;
    end if;
  end loop;

  if has_function_privilege('authenticated', 'private.validate_membership_scope_hierarchy()', 'EXECUTE') then
    raise exception 'trigger-only private.validate_membership_scope_hierarchy remains API-executable';
  end if;
end;
$$;

-- Membership self-visibility must cache auth.uid() once per statement. This
-- preserves authorization semantics while avoiding per-row Auth re-evaluation.
do $$
declare
  policy_qual text;
  normalized_qual text;
begin
  select qual
    into policy_qual
  from pg_policies
  where schemaname = 'public'
    and tablename = 'organization_memberships'
    and policyname = 'memberships_visible_to_self_or_admin';

  if policy_qual is null then
    raise exception 'memberships_visible_to_self_or_admin policy is missing';
  end if;

  normalized_qual := lower(regexp_replace(policy_qual, '\s+', ' ', 'g'));

  if normalized_qual like '%user_id = auth.uid()%' then
    raise exception 'membership self policy reintroduced per-row auth.uid() evaluation';
  end if;

  if normalized_qual not like '%select auth.uid()%' then
    raise exception 'membership self policy must wrap auth.uid() in SELECT for initPlan caching: %', policy_qual;
  end if;
end;
$$;

-- Probe postgres default privileges after the hardening migration. The bootstrap
-- intentionally emulates legacy hosted Supabase defaults, so these objects must
-- still be born closed after the migration resets the defaults.
create table public._security_default_privilege_probe (
  id bigint generated always as identity primary key
);

create function public._security_default_privilege_probe_fn()
returns integer
language sql
as $$ select 1 $$;

do $$
declare
  role_name text;
  sequence_name text;
begin
  foreach role_name in array array['anon', 'authenticated', 'service_role']
  loop
    if has_table_privilege(role_name, 'public._security_default_privilege_probe', 'SELECT')
       or has_table_privilege(role_name, 'public._security_default_privilege_probe', 'INSERT')
       or has_table_privilege(role_name, 'public._security_default_privilege_probe', 'UPDATE')
       or has_table_privilege(role_name, 'public._security_default_privilege_probe', 'DELETE') then
      raise exception 'default table privileges leaked to %', role_name;
    end if;

    if has_function_privilege(role_name, 'public._security_default_privilege_probe_fn()', 'EXECUTE') then
      raise exception 'default function EXECUTE leaked to %', role_name;
    end if;
  end loop;

  sequence_name := pg_get_serial_sequence('public._security_default_privilege_probe', 'id');
  if sequence_name is null then
    raise exception 'default privilege probe identity sequence not found';
  end if;

  foreach role_name in array array['anon', 'authenticated', 'service_role']
  loop
    if has_sequence_privilege(role_name, sequence_name, 'USAGE')
       or has_sequence_privilege(role_name, sequence_name, 'SELECT')
       or has_sequence_privilege(role_name, sequence_name, 'UPDATE') then
      raise exception 'default sequence privileges leaked to %', role_name;
    end if;
  end loop;
end;
$$;

drop function public._security_default_privilege_probe_fn();
drop table public._security_default_privilege_probe;

select 'RLS and grant hardening tests passed' as result;
