\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email)
values
  ('62000000-0000-4000-8000-000000000001', 'minimum-inventory@example.invalid'),
  ('62000000-0000-4000-8000-000000000002', 'minimum-viewer@example.invalid'),
  ('62000000-0000-4000-8000-000000000003', 'minimum-other@example.invalid')
on conflict (id) do nothing;

insert into public.organizations (id, name)
values
  ('62000000-0000-4000-8000-000000000010', 'Minimum Org A'),
  ('62000000-0000-4000-8000-000000000011', 'Minimum Org B');

insert into public.businesses (id, organization_id, name, code)
values
  ('62000000-0000-4000-8000-000000000020', '62000000-0000-4000-8000-000000000010', 'Business A', 'MIN-A'),
  ('62000000-0000-4000-8000-000000000021', '62000000-0000-4000-8000-000000000011', 'Business B', 'MIN-B');

insert into public.units (id, organization_id, business_id, name, code)
values
  ('62000000-0000-4000-8000-000000000030', '62000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000020', 'Unit A', 'MIN-UA'),
  ('62000000-0000-4000-8000-000000000031', '62000000-0000-4000-8000-000000000011', '62000000-0000-4000-8000-000000000021', 'Unit B', 'MIN-UB');

insert into public.sectors (id, organization_id, unit_id, name, code)
values
  ('62000000-0000-4000-8000-000000000040', '62000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000030', 'Sector A1', 'MIN-SA1'),
  ('62000000-0000-4000-8000-000000000041', '62000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000030', 'Sector A2', 'MIN-SA2'),
  ('62000000-0000-4000-8000-000000000042', '62000000-0000-4000-8000-000000000011', '62000000-0000-4000-8000-000000000031', 'Sector B', 'MIN-SB');

insert into public.stock_locations (id, organization_id, unit_id, sector_id, name, code)
values
  ('62000000-0000-4000-8000-000000000050', '62000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000030', '62000000-0000-4000-8000-000000000040', 'Location A1', 'MIN-LA1'),
  ('62000000-0000-4000-8000-000000000051', '62000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000030', '62000000-0000-4000-8000-000000000041', 'Location A2', 'MIN-LA2'),
  ('62000000-0000-4000-8000-000000000052', '62000000-0000-4000-8000-000000000011', '62000000-0000-4000-8000-000000000031', '62000000-0000-4000-8000-000000000042', 'Location B', 'MIN-LB');

insert into public.units_of_measure (id, organization_id, code, name)
values
  ('62000000-0000-4000-8000-000000000060', '62000000-0000-4000-8000-000000000010', 'un', 'Unit'),
  ('62000000-0000-4000-8000-000000000061', '62000000-0000-4000-8000-000000000011', 'un', 'Unit');

insert into public.item_categories (id, organization_id, name, code)
values
  ('62000000-0000-4000-8000-000000000070', '62000000-0000-4000-8000-000000000010', 'Minimum Category A', 'MIN-CA'),
  ('62000000-0000-4000-8000-000000000071', '62000000-0000-4000-8000-000000000011', 'Minimum Category B', 'MIN-CB');

insert into public.stock_items (id, organization_id, category_id, base_unit_id, name, internal_code, item_type)
values
  ('62000000-0000-4000-8000-000000000080', '62000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000070', '62000000-0000-4000-8000-000000000060', 'Minimum Item A', 'MIN-IA', 'supply'),
  ('62000000-0000-4000-8000-000000000081', '62000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000070', '62000000-0000-4000-8000-000000000060', 'Minimum Item A no policy', 'MIN-IA2', 'supply'),
  ('62000000-0000-4000-8000-000000000082', '62000000-0000-4000-8000-000000000011', '62000000-0000-4000-8000-000000000071', '62000000-0000-4000-8000-000000000061', 'Minimum Item B', 'MIN-IB', 'supply');

insert into public.organization_memberships (organization_id, user_id, role, sector_id, active)
values
  ('62000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000001', 'inventory', '62000000-0000-4000-8000-000000000040', true),
  ('62000000-0000-4000-8000-000000000011', '62000000-0000-4000-8000-000000000003', 'inventory', '62000000-0000-4000-8000-000000000042', true);

insert into public.organization_memberships (organization_id, user_id, role, active)
values ('62000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000002', 'viewer', true);

-- Structural contract and direct grants.
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.stock_minimum_policies'::regclass) then
    raise exception 'stock_minimum_policies must have RLS enabled';
  end if;

  if has_table_privilege('anon', 'public.stock_minimum_policies', 'SELECT')
     or has_table_privilege('anon', 'public.stock_minimum_policies', 'INSERT')
     or has_table_privilege('anon', 'public.stock_minimum_policies', 'UPDATE') then
    raise exception 'anon unexpectedly has stock minimum privileges';
  end if;

  if not has_table_privilege('authenticated', 'public.stock_minimum_policies', 'SELECT')
     or not has_table_privilege('authenticated', 'public.stock_minimum_policies', 'INSERT')
     or not has_table_privilege('authenticated', 'public.stock_minimum_policies', 'UPDATE')
     or has_table_privilege('authenticated', 'public.stock_minimum_policies', 'DELETE') then
    raise exception 'authenticated stock minimum grants do not match the intended surface';
  end if;
end;
$$;

-- Cross-Organization references fail closed at the FK layer.
do $$
begin
  begin
    insert into public.stock_minimum_policies (
      organization_id, stock_item_id, stock_location_id, minimum_quantity
    ) values (
      '62000000-0000-4000-8000-000000000010',
      '62000000-0000-4000-8000-000000000080',
      '62000000-0000-4000-8000-000000000052',
      1
    );
    raise exception 'cross-organization stock minimum unexpectedly succeeded';
  exception
    when foreign_key_violation then null;
  end;
end;
$$;

-- Negative values are invalid, while zero is accepted.
do $$
begin
  begin
    insert into public.stock_minimum_policies (
      organization_id, stock_item_id, stock_location_id, minimum_quantity
    ) values (
      '62000000-0000-4000-8000-000000000010',
      '62000000-0000-4000-8000-000000000080',
      '62000000-0000-4000-8000-000000000050',
      -0.001
    );
    raise exception 'negative stock minimum unexpectedly succeeded';
  exception
    when check_violation then null;
  end;
end;
$$;

-- Sector-scoped inventory can maintain only its visible stock location.
set role authenticated;
select set_config('request.jwt.claim.sub', '62000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

insert into public.stock_minimum_policies (
  organization_id, stock_item_id, stock_location_id, minimum_quantity
) values (
  '62000000-0000-4000-8000-000000000010',
  '62000000-0000-4000-8000-000000000080',
  '62000000-0000-4000-8000-000000000050',
  0
);

update public.stock_minimum_policies
set minimum_quantity = 5
where organization_id = '62000000-0000-4000-8000-000000000010'
  and stock_item_id = '62000000-0000-4000-8000-000000000080'
  and stock_location_id = '62000000-0000-4000-8000-000000000050';

do $$
begin
  if (select count(*) from public.stock_minimum_policies) <> 1 then
    raise exception 'sector-scoped inventory should see exactly one stock minimum policy';
  end if;

  begin
    insert into public.stock_minimum_policies (
      organization_id, stock_item_id, stock_location_id, minimum_quantity
    ) values (
      '62000000-0000-4000-8000-000000000010',
      '62000000-0000-4000-8000-000000000080',
      '62000000-0000-4000-8000-000000000051',
      3
    );
    raise exception 'sector-scoped inventory unexpectedly wrote another Sector';
  exception
    when insufficient_privilege then null;
  end;

  begin
    delete from public.stock_minimum_policies
    where stock_location_id = '62000000-0000-4000-8000-000000000050';
    raise exception 'authenticated unexpectedly deleted stock minimum policy';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- Current-state derivation uses the authoritative balance and strict inequality.
insert into public.inventory_balances (
  organization_id, stock_item_id, stock_location_id, quantity_on_hand, average_cost
) values
  ('62000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000080', '62000000-0000-4000-8000-000000000050', 4, 1),
  ('62000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000081', '62000000-0000-4000-8000-000000000050', 0, 1);

do $$
declare
  below_count integer;
begin
  select count(*) into below_count
  from public.stock_minimum_policies policy
  join public.inventory_balances balance
    on balance.organization_id = policy.organization_id
   and balance.stock_item_id = policy.stock_item_id
   and balance.stock_location_id = policy.stock_location_id
  where policy.active
    and balance.quantity_on_hand < policy.minimum_quantity;
  if below_count <> 1 then
    raise exception 'expected one balance below minimum, got %', below_count;
  end if;

  update public.inventory_balances
  set quantity_on_hand = 5
  where stock_item_id = '62000000-0000-4000-8000-000000000080'
    and stock_location_id = '62000000-0000-4000-8000-000000000050';

  select count(*) into below_count
  from public.stock_minimum_policies policy
  join public.inventory_balances balance
    on balance.organization_id = policy.organization_id
   and balance.stock_item_id = policy.stock_item_id
   and balance.stock_location_id = policy.stock_location_id
  where policy.active
    and balance.quantity_on_hand < policy.minimum_quantity;
  if below_count <> 0 then
    raise exception 'balance equal to minimum must not alert';
  end if;
end;
$$;

-- Viewer can read visible configuration but cannot mutate it. RLS may make an
-- unauthorized UPDATE affect zero rows instead of raising an exception, so
-- assert the affected row count and the persisted value explicitly.
set role authenticated;
select set_config('request.jwt.claim.sub', '62000000-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
declare
  affected integer;
begin
  if (select count(*) from public.stock_minimum_policies) <> 1 then
    raise exception 'organization viewer should read the visible stock minimum policy';
  end if;

  update public.stock_minimum_policies set minimum_quantity = 9;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'viewer unexpectedly updated % stock minimum policy rows', affected;
  end if;

  if (select minimum_quantity from public.stock_minimum_policies limit 1) <> 5 then
    raise exception 'viewer changed the persisted stock minimum value';
  end if;
end;
$$;
reset role;

-- Another Organization cannot see the policy.
set role authenticated;
select set_config('request.jwt.claim.sub', '62000000-0000-4000-8000-000000000003', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  if (select count(*) from public.stock_minimum_policies) <> 0 then
    raise exception 'cross-organization inventory user saw stock minimum policy';
  end if;
end;
$$;
reset role;

-- Trigger audit recorded semantic create/update with the authenticated actor.
do $$
begin
  if (select count(*) from public.audit_logs
      where entity_type = 'stock_minimum_policy'
        and organization_id = '62000000-0000-4000-8000-000000000010'
        and actor_user_id = '62000000-0000-4000-8000-000000000001') < 2 then
    raise exception 'stock minimum configuration audit was not recorded';
  end if;
end;
$$;

rollback;

select 'stock minimum policy tests passed' as result;
