\set ON_ERROR_STOP on

-- Reuse the inventory member and demo stock created by the earlier smoke test.
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

-- FEFO: the original August batch expires before the CI entry batch from September.
select * from public.record_stock_withdrawal(
  '40000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000400',
  '00000000-0000-4000-8000-000000000120',
  15.000,
  null,
  'CI FEFO withdrawal'
);

-- Same command/payload is idempotent.
select * from public.record_stock_withdrawal(
  '40000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000400',
  '00000000-0000-4000-8000-000000000120',
  15.000,
  null,
  'CI FEFO withdrawal'
);

-- Reusing the key with a different semantic payload must fail.
do $$
begin
  begin
    perform public.record_stock_withdrawal(
      '40000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      14.000,
      null,
      'CI FEFO withdrawal'
    );
    raise exception 'idempotency conflict unexpectedly succeeded';
  exception
    when unique_violation then null;
  end;
end;
$$;

reset role;

do $$
begin
  if (select count(*) from public.stock_movements where id = '40000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'withdrawal retry duplicated movement';
  end if;
  if (select count(*) from public.audit_logs where entity_id = '40000000-0000-4000-8000-000000000001' and action = 'stock_withdrawal.recorded') <> 1 then
    raise exception 'withdrawal retry duplicated or missed audit';
  end if;
  if (select quantity_on_hand from public.inventory_balances where organization_id = '00000000-0000-4000-8000-000000000001' and stock_item_id = '00000000-0000-4000-8000-000000000400' and stock_location_id = '00000000-0000-4000-8000-000000000120') <> 95.000 then
    raise exception 'FEFO withdrawal produced wrong balance';
  end if;
  if (select average_cost from public.inventory_balances where organization_id = '00000000-0000-4000-8000-000000000001' and stock_item_id = '00000000-0000-4000-8000-000000000400' and stock_location_id = '00000000-0000-4000-8000-000000000120') <> 2.18 then
    raise exception 'withdrawal changed average cost unexpectedly';
  end if;
  if (select remaining_quantity from public.inventory_batches where id = '00000000-0000-4000-8000-000000000610') <> 85.000 then
    raise exception 'FEFO did not consume the earliest batch first';
  end if;
  if (select remaining_quantity from public.inventory_batches where source_reference_id = '10000000-0000-4000-8000-000000000900') <> 10.000 then
    raise exception 'FEFO consumed later batch before earlier batch';
  end if;
end;
$$;

-- Preferred batch overrides FEFO for the requested quantity.
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
declare
  preferred uuid;
begin
  select id into preferred
  from public.inventory_batches
  where source_reference_id = '10000000-0000-4000-8000-000000000900';

  perform public.record_stock_withdrawal(
    '40000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000400',
    '00000000-0000-4000-8000-000000000120',
    5.000,
    preferred,
    'CI preferred-batch withdrawal'
  );
end;
$$;

-- Insufficient tracked stock must fail atomically.
do $$
begin
  begin
    perform public.record_stock_withdrawal(
      '40000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      999.000,
      null,
      'must fail'
    );
    raise exception 'insufficient tracked stock unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;
end;
$$;

reset role;

do $$
begin
  if (select quantity_on_hand from public.inventory_balances where organization_id = '00000000-0000-4000-8000-000000000001' and stock_item_id = '00000000-0000-4000-8000-000000000400' and stock_location_id = '00000000-0000-4000-8000-000000000120') <> 90.000 then
    raise exception 'preferred withdrawal or failed command produced wrong balance';
  end if;
  if (select remaining_quantity from public.inventory_batches where id = '00000000-0000-4000-8000-000000000610') <> 85.000 then
    raise exception 'preferred batch unexpectedly consumed FEFO batch';
  end if;
  if (select remaining_quantity from public.inventory_batches where source_reference_id = '10000000-0000-4000-8000-000000000900') <> 5.000 then
    raise exception 'preferred batch did not receive requested consumption';
  end if;
  if exists (select 1 from public.stock_movements where id = '40000000-0000-4000-8000-000000000003') then
    raise exception 'failed withdrawal left a movement behind';
  end if;
  if exists (select 1 from public.audit_logs where entity_id = '40000000-0000-4000-8000-000000000003') then
    raise exception 'failed withdrawal left an audit behind';
  end if;
end;
$$;

-- Viewer cannot invoke the withdrawal command.
set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  begin
    perform public.record_stock_withdrawal(
      '40000000-0000-4000-8000-000000000004',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      1.000,
      null,
      'viewer denied'
    );
    raise exception 'viewer withdrawal unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- A manager from another Organization cannot operate on the seeded Organization.
set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  begin
    perform public.record_stock_withdrawal(
      '40000000-0000-4000-8000-000000000005',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      1.000,
      null,
      'cross-org denied'
    );
    raise exception 'cross-Organization withdrawal unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- Negative stock stays forbidden by default for the untracked coal item.
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  begin
    perform public.record_stock_withdrawal(
      '40000000-0000-4000-8000-000000000006',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000402',
      '00000000-0000-4000-8000-000000000120',
      21.000,
      null,
      'negative denied by default'
    );
    raise exception 'negative stock unexpectedly succeeded without configuration';
  exception
    when invalid_parameter_value then null;
  end;
end;
$$;
reset role;

-- Explicit location configuration allows negative stock for untracked items.
update public.stock_locations
set allow_negative_stock = true
where id = '00000000-0000-4000-8000-000000000120'
  and organization_id = '00000000-0000-4000-8000-000000000001';

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

select * from public.record_stock_withdrawal(
  '40000000-0000-4000-8000-000000000007',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000402',
  '00000000-0000-4000-8000-000000000120',
  25.000,
  null,
  'configured negative stock'
);
reset role;

do $$
begin
  if (select quantity_on_hand from public.inventory_balances where organization_id = '00000000-0000-4000-8000-000000000001' and stock_item_id = '00000000-0000-4000-8000-000000000402' and stock_location_id = '00000000-0000-4000-8000-000000000120') <> -5.000 then
    raise exception 'configured negative stock produced wrong balance';
  end if;

  begin
    update public.stock_locations
    set allow_negative_stock = false
    where id = '00000000-0000-4000-8000-000000000120'
      and organization_id = '00000000-0000-4000-8000-000000000001';
    raise exception 'negative-stock policy was disabled with negative balance present';
  exception
    when check_violation then null;
  end;
end;
$$;

-- Anonymous callers still cannot execute the privileged command.
set role anon;
do $$
begin
  begin
    perform public.record_stock_withdrawal(
      '40000000-0000-4000-8000-000000000008',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      1.000,
      null,
      'anon denied'
    );
    raise exception 'anonymous withdrawal unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select 'stock withdrawal tests passed' as result;
