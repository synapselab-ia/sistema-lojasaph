\set ON_ERROR_STOP on

-- Previous stock suites leave Tabatinga with:
-- water 60 @ 2.18 (tracked, original August batch 60),
-- espetos 50 @ 8.50 (tracked), coal 2 @ 30.00 (untracked).
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

-- Start a physical count and verify snapshot/idempotency.
select * from public.start_inventory_count(
  '60000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000120'
);

select * from public.start_inventory_count(
  '60000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000120'
);

-- Same command id with different location conflicts.
do $$
begin
  begin
    perform public.start_inventory_count(
      '60000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000121'
    );
    raise exception 'inventory start idempotency conflict unexpectedly succeeded';
  exception
    when unique_violation then null;
  end;
end;
$$;

-- A second open count for the same location is forbidden.
do $$
begin
  begin
    perform public.start_inventory_count(
      '60000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000120'
    );
    raise exception 'second open inventory count unexpectedly succeeded';
  exception
    when unique_violation then null;
  end;
end;
$$;

reset role;

do $$
begin
  if (select expected_quantity from public.inventory_count_lines where inventory_count_id='60000000-0000-4000-8000-000000000001' and stock_item_id='00000000-0000-4000-8000-000000000400') <> 60.000 then
    raise exception 'water inventory snapshot quantity mismatch';
  end if;
  if (select expected_average_cost from public.inventory_count_lines where inventory_count_id='60000000-0000-4000-8000-000000000001' and stock_item_id='00000000-0000-4000-8000-000000000400') <> 2.18 then
    raise exception 'water inventory snapshot cost mismatch';
  end if;
  if (select expected_quantity from public.inventory_count_lines where inventory_count_id='60000000-0000-4000-8000-000000000001' and stock_item_id='00000000-0000-4000-8000-000000000402') <> 2.000 then
    raise exception 'coal inventory snapshot quantity mismatch';
  end if;
  if (select expected_average_cost from public.inventory_count_lines where inventory_count_id='60000000-0000-4000-8000-000000000001' and stock_item_id='00000000-0000-4000-8000-000000000402') <> 30.00 then
    raise exception 'coal inventory snapshot cost mismatch';
  end if;
end;
$$;

-- Confirmation is blocked while any line is uncounted.
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  begin
    perform public.confirm_inventory_count(
      '60000000-0000-4000-8000-000000000010',
      '00000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000001'
    );
    raise exception 'incomplete inventory count unexpectedly confirmed';
  exception
    when invalid_parameter_value then null;
  end;
end;
$$;

-- Fill every line with the expected physical quantity first.
do $$
declare
  line record;
begin
  for line in
    select stock_item_id, expected_quantity
    from public.inventory_count_lines
    where inventory_count_id='60000000-0000-4000-8000-000000000001'
      and organization_id='00000000-0000-4000-8000-000000000001'
    order by stock_item_id
  loop
    perform public.set_inventory_count_line(
      gen_random_uuid(),
      '00000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000001',
      line.stock_item_id,
      greatest(line.expected_quantity, 0),
      null
    );
  end loop;
end;
$$;

-- One command is retry-safe, but reusing it with a different payload conflicts.
select * from public.set_inventory_count_line(
  '60000000-0000-4000-8000-000000000020',
  '00000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000400',
  55.000,
  null
);
select * from public.set_inventory_count_line(
  '60000000-0000-4000-8000-000000000020',
  '00000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000400',
  55.000,
  null
);

do $$
begin
  begin
    perform public.set_inventory_count_line(
      '60000000-0000-4000-8000-000000000020',
      '00000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      54.000,
      null
    );
    raise exception 'count line idempotency conflict unexpectedly succeeded';
  exception
    when unique_violation then null;
  end;
end;
$$;

-- Coal is untracked: count 5 instead of 2, with explicit cost 40 for the 3-unit positive adjustment.
select * from public.set_inventory_count_line(
  '60000000-0000-4000-8000-000000000021',
  '00000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000402',
  5.000,
  40.00
);

select * from public.confirm_inventory_count(
  '60000000-0000-4000-8000-000000000030',
  '00000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001'
);

-- Retry same confirmation command: no duplicate movements.
select * from public.confirm_inventory_count(
  '60000000-0000-4000-8000-000000000030',
  '00000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001'
);

reset role;

do $$
begin
  if (select status from public.inventory_counts where id='60000000-0000-4000-8000-000000000001') <> 'confirmed' then
    raise exception 'inventory count did not confirm';
  end if;
  if (select quantity_on_hand from public.inventory_balances where organization_id='00000000-0000-4000-8000-000000000001' and stock_item_id='00000000-0000-4000-8000-000000000400' and stock_location_id='00000000-0000-4000-8000-000000000120') <> 55.000 then
    raise exception 'negative inventory adjustment produced wrong water balance';
  end if;
  if (select average_cost from public.inventory_balances where organization_id='00000000-0000-4000-8000-000000000001' and stock_item_id='00000000-0000-4000-8000-000000000400' and stock_location_id='00000000-0000-4000-8000-000000000120') <> 2.18 then
    raise exception 'negative inventory adjustment changed average cost';
  end if;
  if (select remaining_quantity from public.inventory_batches where id='00000000-0000-4000-8000-000000000610') <> 55.000 then
    raise exception 'negative tracked inventory adjustment did not consume FEFO batch';
  end if;
  if (select quantity_on_hand from public.inventory_balances where organization_id='00000000-0000-4000-8000-000000000001' and stock_item_id='00000000-0000-4000-8000-000000000402' and stock_location_id='00000000-0000-4000-8000-000000000120') <> 5.000 then
    raise exception 'positive inventory adjustment produced wrong coal balance';
  end if;
  if (select average_cost from public.inventory_balances where organization_id='00000000-0000-4000-8000-000000000001' and stock_item_id='00000000-0000-4000-8000-000000000402' and stock_location_id='00000000-0000-4000-8000-000000000120') <> 36.00 then
    raise exception 'positive inventory adjustment produced wrong weighted cost';
  end if;
  if (select count(*) from public.stock_movements where reference_type='inventory_count' and reference_id='60000000-0000-4000-8000-000000000001') <> 2 then
    raise exception 'inventory confirmation should create exactly positive and negative adjustment movements';
  end if;
  if (select count(*) from public.audit_logs where entity_id='60000000-0000-4000-8000-000000000001' and action='inventory_count.confirmed') <> 1 then
    raise exception 'inventory confirmation retry duplicated audit';
  end if;
end;
$$;

-- Confirmed counts are immutable.
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  begin
    perform public.set_inventory_count_line(
      '60000000-0000-4000-8000-000000000040',
      '00000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      55.000,
      null
    );
    raise exception 'confirmed inventory count line unexpectedly changed';
  exception
    when invalid_parameter_value then null;
  end;
end;
$$;

-- Location 121: cost is required to create positive untracked stock from zero.
select * from public.start_inventory_count(
  '60000000-0000-4000-8000-000000000100',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000121'
);

do $$
declare
  line record;
begin
  for line in
    select stock_item_id, expected_quantity
    from public.inventory_count_lines
    where inventory_count_id='60000000-0000-4000-8000-000000000100'
      and organization_id='00000000-0000-4000-8000-000000000001'
  loop
    perform public.set_inventory_count_line(
      gen_random_uuid(),
      '00000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000100',
      line.stock_item_id,
      greatest(line.expected_quantity, 0),
      null
    );
  end loop;
end;
$$;

select * from public.set_inventory_count_line(
  '60000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000100',
  '00000000-0000-4000-8000-000000000402',
  1.000,
  null
);

do $$
begin
  begin
    perform public.confirm_inventory_count(
      '60000000-0000-4000-8000-000000000102',
      '00000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000100'
    );
    raise exception 'positive adjustment without cost unexpectedly confirmed';
  exception
    when invalid_parameter_value then null;
  end;
end;
$$;

-- With explicit cost it becomes valid, but tracked positive adjustment remains blocked.
select * from public.set_inventory_count_line(
  '60000000-0000-4000-8000-000000000103',
  '00000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000100',
  '00000000-0000-4000-8000-000000000402',
  1.000,
  25.00
);
select * from public.set_inventory_count_line(
  '60000000-0000-4000-8000-000000000104',
  '00000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000100',
  '00000000-0000-4000-8000-000000000400',
  21.000,
  null
);

do $$
begin
  begin
    perform public.confirm_inventory_count(
      '60000000-0000-4000-8000-000000000105',
      '00000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000100'
    );
    raise exception 'tracked positive adjustment unexpectedly confirmed without lot data';
  exception
    when invalid_parameter_value then null;
  end;
end;
$$;

-- Restore tracked quantity to snapshot and confirm only coal positive adjustment.
select * from public.set_inventory_count_line(
  '60000000-0000-4000-8000-000000000106',
  '00000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000100',
  '00000000-0000-4000-8000-000000000400',
  20.000,
  null
);
select * from public.confirm_inventory_count(
  '60000000-0000-4000-8000-000000000107',
  '00000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000100'
);

-- Location 122: stale detection compares both quantity and average cost snapshot.
select * from public.start_inventory_count(
  '60000000-0000-4000-8000-000000000200',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000122'
);

do $$
declare
  line record;
begin
  for line in
    select stock_item_id, expected_quantity
    from public.inventory_count_lines
    where inventory_count_id='60000000-0000-4000-8000-000000000200'
      and organization_id='00000000-0000-4000-8000-000000000001'
  loop
    perform public.set_inventory_count_line(
      gen_random_uuid(),
      '00000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000200',
      line.stock_item_id,
      greatest(line.expected_quantity, 0),
      null
    );
  end loop;
end;
$$;

-- Mutate stock after snapshot; confirm must reject the entire count as stale.
select * from public.record_stock_entry(
  '60000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000402',
  '00000000-0000-4000-8000-000000000122',
  1.000,
  20.00,
  null,
  null,
  'stale inventory test'
);

do $$
begin
  begin
    perform public.confirm_inventory_count(
      '60000000-0000-4000-8000-000000000202',
      '00000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000200'
    );
    raise exception 'stale inventory count unexpectedly confirmed';
  exception
    when serialization_failure then null;
  end;
end;
$$;

reset role;

do $$
begin
  if (select status from public.inventory_counts where id='60000000-0000-4000-8000-000000000200') <> 'counting' then
    raise exception 'stale count changed status';
  end if;
  if exists (select 1 from public.stock_movements where reference_type='inventory_count' and reference_id='60000000-0000-4000-8000-000000000200') then
    raise exception 'stale count left adjustment movement behind';
  end if;
end;
$$;

-- Viewer and cross-Organization users cannot start seeded-Organization inventories.
set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
do $$
begin
  begin
    perform public.start_inventory_count(
      '60000000-0000-4000-8000-000000000300',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000120'
    );
    raise exception 'viewer inventory start unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
do $$
begin
  begin
    perform public.start_inventory_count(
      '60000000-0000-4000-8000-000000000301',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000120'
    );
    raise exception 'cross-Organization inventory start unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;
reset role;

set role anon;
do $$
begin
  begin
    perform public.start_inventory_count(
      '60000000-0000-4000-8000-000000000302',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000120'
    );
    raise exception 'anonymous inventory start unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select 'persistent inventory count tests passed' as result;
