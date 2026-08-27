\set ON_ERROR_STOP on

insert into auth.users (id, email)
values
  ('30000000-0000-4000-8000-000000000001', 'viewer@example.invalid'),
  ('30000000-0000-4000-8000-000000000002', 'purchases@example.invalid'),
  ('30000000-0000-4000-8000-000000000003', 'other-org@example.invalid')
on conflict (id) do nothing;

insert into public.organization_memberships (organization_id, user_id, role, active)
values
  ('00000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'viewer', true),
  ('00000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'purchases', true),
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 'manager', true)
on conflict do nothing;

-- Viewer can read its Organization, but cannot mutate catalog or invoke stock-entry RPC.
set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  if (select count(*) from public.organizations) <> 1 then
    raise exception 'viewer should see exactly its Organization';
  end if;

  begin
    insert into public.stock_items (
      organization_id, base_unit_id, name, internal_code, item_type
    ) values (
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000200',
      'Viewer must not create this',
      'VIEWER-DENIED',
      'supply'
    );
    raise exception 'viewer unexpectedly wrote catalog';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.record_stock_entry(
      '30000000-0000-4000-8000-000000000901',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      1,
      1,
      null,
      null,
      'viewer denied'
    );
    raise exception 'viewer unexpectedly invoked stock entry';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- Purchases can maintain suppliers, but not catalog or stock ledger commands.
set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

insert into public.suppliers (organization_id, trade_name, tax_id)
values ('00000000-0000-4000-8000-000000000001', 'Fornecedor criado por Compras', 'CI-PURCHASES');

do $$
begin
  begin
    insert into public.stock_items (
      organization_id, base_unit_id, name, internal_code, item_type
    ) values (
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000200',
      'Purchases must not create this',
      'PURCHASES-DENIED',
      'supply'
    );
    raise exception 'purchases unexpectedly wrote catalog';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.record_stock_entry(
      '30000000-0000-4000-8000-000000000902',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      1,
      1,
      null,
      null,
      'purchases denied'
    );
    raise exception 'purchases unexpectedly invoked stock entry';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- A member of another Organization cannot see the seeded Organization or its stock items.
set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
declare
  visible_org uuid;
  visible_seed_items integer;
begin
  select id into visible_org from public.organizations;
  if visible_org <> '20000000-0000-4000-8000-000000000001'::uuid then
    raise exception 'cross-organization member saw the wrong Organization: %', visible_org;
  end if;

  select count(*) into visible_seed_items
  from public.stock_items
  where organization_id = '00000000-0000-4000-8000-000000000001';
  if visible_seed_items <> 0 then
    raise exception 'cross-organization member saw seeded stock items';
  end if;
end;
$$;
reset role;

select 'auth runtime role tests passed' as result;

\ir stock_minimum_policies.sql
