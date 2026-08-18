\set ON_ERROR_STOP on

-- This file runs only against the isolated database created by
-- scripts/verify-backup-restore.sh. It must never target the hosted project.

do $$
begin
  if current_database() = 'lojasaph' then
    raise exception 'backup restore smoke test must not run against source database';
  end if;

  if (select count(*) from public.organizations where id = '00000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'restored demo organization is missing';
  end if;

  if (select count(*) from public.units where organization_id = '00000000-0000-4000-8000-000000000001') <> 3 then
    raise exception 'restored unit fixture count is incorrect';
  end if;

  if (select count(*) from public.stock_items where organization_id = '00000000-0000-4000-8000-000000000001') <> 3 then
    raise exception 'restored stock item fixture count is incorrect';
  end if;

  if (
    select quantity_on_hand
    from public.inventory_balances
    where id = '00000000-0000-4000-8000-000000000600'
  ) <> 100.000 then
    raise exception 'restored inventory balance is incorrect';
  end if;

  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.organizations'::regclass
  ) then
    raise exception 'RLS was not restored on public.organizations';
  end if;

  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.import_batches'::regclass
  ) then
    raise exception 'RLS was not restored on public.import_batches';
  end if;

  if has_table_privilege('anon', 'public.organizations', 'SELECT') then
    raise exception 'anon unexpectedly gained SELECT on public.organizations after restore';
  end if;

  if has_table_privilege('authenticated', 'public.stock_movements', 'INSERT') then
    raise exception 'authenticated unexpectedly gained direct INSERT on stock_movements after restore';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.record_stock_entry(uuid,uuid,uuid,uuid,numeric,numeric,text,date,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated lost record_stock_entry EXECUTE privilege after restore';
  end if;
end;
$$;

begin;

insert into auth.users (id, email)
values ('97000000-0000-4000-8000-000000000001', 'restore-member@example.invalid');

insert into public.organization_memberships (
  id,
  organization_id,
  user_id,
  role,
  active
)
values (
  '97000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000001',
  'viewer',
  true
);

insert into public.organizations (id, name)
values ('97000000-0000-4000-8000-000000000020', 'Restore isolation fixture');

set role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
declare
  visible_organizations integer;
begin
  select count(*) into visible_organizations from public.organizations;
  if visible_organizations <> 1 then
    raise exception 'restored RLS expected 1 visible organization, got %', visible_organizations;
  end if;
end;
$$;

reset role;
rollback;

select 'backup restore tests passed' as result;
