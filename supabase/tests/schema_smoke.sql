\set ON_ERROR_STOP on

-- Test users used only by the ephemeral CI database.
insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000001', 'inventory@example.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'outsider@example.invalid')
on conflict (id) do nothing;

insert into public.organization_memberships (
  id, organization_id, user_id, role, active
)
values (
  '10000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'inventory',
  true
)
on conflict do nothing;

-- Cross-organization FKs must reject invalid hierarchy links.
insert into public.organizations (id, name)
values ('20000000-0000-4000-8000-000000000001', 'Outra Organização Demo')
on conflict (id) do nothing;

insert into public.businesses (id, organization_id, name, code)
values (
  '20000000-0000-4000-8000-000000000010',
  '20000000-0000-4000-8000-000000000001',
  'Outro Negócio',
  'outro'
)
on conflict (id) do nothing;

do $$
begin
  begin
    insert into public.units (organization_id, business_id, name, code)
    values (
      '00000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000010',
      'Unidade Inválida',
      'cross-org-invalid'
    );
    raise exception 'cross-organization unit insert unexpectedly succeeded';
  exception
    when foreign_key_violation then null;
  end;
end;
$$;

-- Quantities/costs cannot enter impossible negative states.
do $$
begin
  begin
    insert into public.inventory_balances (
      organization_id, stock_item_id, stock_location_id, quantity_on_hand, average_cost
    ) values (
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000121',
      -1,
      2.10
    );
    raise exception 'negative inventory balance unexpectedly succeeded';
  exception
    when check_violation then null;
  end;
end;
$$;

-- Transfer source and destination cannot be equal.
do $$
begin
  begin
    insert into public.stock_transfers (
      organization_id, source_location_id, destination_location_id, status
    ) values (
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000120',
      '00000000-0000-4000-8000-000000000120',
      'draft'
    );
    raise exception 'same-location transfer unexpectedly succeeded';
  exception
    when check_violation then null;
  end;
end;
$$;

-- RLS: an inventory member can see only its Organization.
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
declare
  visible_organizations integer;
begin
  select count(*) into visible_organizations from public.organizations;
  if visible_organizations <> 1 then
    raise exception 'expected 1 visible organization for member, got %', visible_organizations;
  end if;
end;
$$;

-- Inventory role may maintain catalog data in its Organization.
insert into public.stock_items (
  id, organization_id, category_id, base_unit_id, name, internal_code, item_type
) values (
  '10000000-0000-4000-8000-000000000100',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000302',
  '00000000-0000-4000-8000-000000000200',
  'Item criado via RLS',
  'RLS-DEMO-ITEM',
  'supply'
);

-- Critical ledger writes have no direct authenticated privilege/policy.
do $$
begin
  begin
    insert into public.stock_movements (
      organization_id, movement_type, destination_location_id
    ) values (
      '00000000-0000-4000-8000-000000000001',
      'entry',
      '00000000-0000-4000-8000-000000000120'
    );
    raise exception 'direct authenticated ledger write unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;

-- An authenticated user with no membership sees no Organizations.
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
declare
  visible_organizations integer;
begin
  select count(*) into visible_organizations from public.organizations;
  if visible_organizations <> 0 then
    raise exception 'expected 0 visible organizations for outsider, got %', visible_organizations;
  end if;
end;
$$;

reset role;

-- Anonymous role receives no operational table privileges.
set role anon;
do $$
begin
  begin
    perform count(*) from public.organizations;
    raise exception 'anonymous organization read unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select 'schema smoke tests passed' as result;
