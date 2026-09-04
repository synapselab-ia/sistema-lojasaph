\set ON_ERROR_STOP on

do $$
begin
  if to_regprocedure('public.record_stock_withdrawal(uuid,uuid,uuid,uuid,numeric,uuid,text)') is not null then
    raise exception 'legacy withdrawal signature still exists in public';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.record_stock_withdrawal(uuid,uuid,uuid,uuid,uuid,numeric,uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated cannot execute sector-aware withdrawal';
  end if;
  if has_function_privilege(
    'anon',
    'public.record_stock_withdrawal(uuid,uuid,uuid,uuid,uuid,numeric,uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'anon unexpectedly executes sector-aware withdrawal';
  end if;
end;
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  begin
    perform public.record_stock_withdrawal(
      '40000000-0000-4000-8000-000000000009',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      null,
      1.000,
      null,
      'missing sector denied'
    );
    raise exception 'withdrawal without sector unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

select * from public.record_stock_withdrawal(
  '40000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000400',
  '00000000-0000-4000-8000-000000000120',
  '00000000-0000-4000-8000-000000000110',
  15.000,
  null,
  'CI FEFO withdrawal'
);

select * from public.record_stock_withdrawal(
  '40000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000400',
  '00000000-0000-4000-8000-000000000120',
  '00000000-0000-4000-8000-000000000110',
  15.000,
  null,
  'CI FEFO withdrawal'
);

do $$
begin
  begin
    perform public.record_stock_withdrawal(
      '40000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      '00000000-0000-4000-8000-000000000110',
      14.000,
      null,
      'CI FEFO withdrawal'
    );
    raise exception 'idempotency conflict unexpectedly succeeded';
  exception when unique_violation then null;
  end;

  begin
    perform public.record_stock_withdrawal(
      '40000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      '00000000-0000-4000-8000-000000000111',
      15.000,
      null,
      'CI FEFO withdrawal'
    );
    raise exception 'sector idempotency conflict unexpectedly succeeded';
  exception when unique_violation then null;
  end;
end;
$$;

reset role;

do $$
begin
  if (select count(*) from public.stock_movements where id = '40000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'withdrawal retry duplicated movement';
  end if;
  if (select sector_id from public.stock_movements where id = '40000000-0000-4000-8000-000000000001') <> '00000000-0000-4000-8000-000000000110' then
    raise exception 'withdrawal did not persist sector';
  end if;
  if (select count(*) from public.audit_logs where entity_id = '40000000-0000-4000-8000-000000000001' and action = 'stock_withdrawal.recorded') <> 1 then
    raise exception 'withdrawal retry duplicated or missed audit';
  end if;
  if (select after_data ->> 'sector_id' from public.audit_logs where entity_id = '40000000-0000-4000-8000-000000000001' and action = 'stock_withdrawal.recorded') <> '00000000-0000-4000-8000-000000000110' then
    raise exception 'withdrawal audit did not persist sector';
  end if;
  if (select quantity_on_hand from public.inventory_balances where organization_id = '00000000-0000-4000-8000-000000000001' and stock_item_id = '00000000-0000-4000-8000-000000000400' and stock_location_id = '00000000-0000-4000-8000-000000000120') <> 95.000 then
    raise exception 'FEFO withdrawal produced wrong balance';
  end if;
  if (select average_cost from public.inventory_balances where organization_id = '00000000-0000-4000-8000-000000000001' and stock_item_id = '00000000-0000-4000-8000-000000000400' and stock_location_id = '00000000-0000-4000-8000-000000000120') <> 2.18 then
    raise exception 'withdrawal changed average cost unexpectedly';
  end if;
  if (select unit_cost_snapshot from public.stock_movement_items where movement_id = '40000000-0000-4000-8000-000000000001') <> 2.10 then
    raise exception 'FEFO withdrawal did not use earliest physical layer cost 2.10';
  end if;
  if (select cost_basis from public.stock_movement_items where movement_id = '40000000-0000-4000-8000-000000000001') <> 'layer_allocation' then
    raise exception 'FEFO withdrawal did not persist layer cost basis';
  end if;
  if (select coalesce(sum(allocation.total_cost_snapshot),0) from public.stock_movement_batch_allocations allocation join public.stock_movement_items item on item.id=allocation.movement_item_id where item.movement_id='40000000-0000-4000-8000-000000000001') <> 31.50 then
    raise exception 'FEFO withdrawal total physical-layer cost mismatch';
  end if;
  if (select remaining_quantity from public.inventory_batches where id = '00000000-0000-4000-8000-000000000610') <> 85.000 then
    raise exception 'FEFO did not consume the earliest batch first';
  end if;
  if (select remaining_quantity from public.inventory_batches where source_reference_id = '10000000-0000-4000-8000-000000000900') <> 10.000 then
    raise exception 'FEFO consumed later batch before earlier batch';
  end if;
end;
$$;

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
    '00000000-0000-4000-8000-000000000110',
    5.000,
    preferred,
    'CI preferred-batch withdrawal'
  );
end;
$$;

do $$
begin
  begin
    perform public.record_stock_withdrawal(
      '40000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      '00000000-0000-4000-8000-000000000110',
      999.000,
      null,
      'must fail'
    );
    raise exception 'insufficient tracked stock unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

reset role;

do $$
begin
  if (select quantity_on_hand from public.inventory_balances where organization_id = '00000000-0000-4000-8000-000000000001' and stock_item_id = '00000000-0000-4000-8000-000000000400' and stock_location_id = '00000000-0000-4000-8000-000000000120') <> 90.000 then
    raise exception 'preferred withdrawal or failed command produced wrong balance';
  end if;
  if (select unit_cost_snapshot from public.stock_movement_items where movement_id = '40000000-0000-4000-8000-000000000002') <> 3.00 then
    raise exception 'preferred withdrawal did not use selected physical layer cost 3.00';
  end if;
  if (select coalesce(sum(allocation.total_cost_snapshot),0) from public.stock_movement_batch_allocations allocation join public.stock_movement_items item on item.id=allocation.movement_item_id where item.movement_id='40000000-0000-4000-8000-000000000002') <> 15.00 then
    raise exception 'preferred withdrawal total physical-layer cost mismatch';
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

begin;
insert into public.organizations(id,name) values ('49000000-0000-4000-8000-000000000001','Withdrawal cross-org CI');
insert into public.businesses(id,organization_id,name,code) values ('49000000-0000-4000-8000-000000000010','49000000-0000-4000-8000-000000000001','Withdrawal business CI','WD-X');
insert into public.units(id,organization_id,business_id,name,code) values ('49000000-0000-4000-8000-000000000100','49000000-0000-4000-8000-000000000001','49000000-0000-4000-8000-000000000010','Withdrawal unit CI','WD-X-U');
insert into public.sectors(id,organization_id,unit_id,name,code,status) values ('49000000-0000-4000-8000-000000000110','49000000-0000-4000-8000-000000000001','49000000-0000-4000-8000-000000000100','Withdrawal sector CI','WD-X-S','active');
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
do $$
begin
  begin
    perform public.record_stock_withdrawal(
      '40000000-0000-4000-8000-000000000010',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      '49000000-0000-4000-8000-000000000110',
      1.000,
      null,
      'cross-org sector denied'
    );
    raise exception 'cross-Organization sector unexpectedly succeeded';
  exception when foreign_key_violation then null;
  end;
end;
$$;
reset role;
rollback;

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
      '00000000-0000-4000-8000-000000000110',
      1.000,
      null,
      'viewer denied'
    );
    raise exception 'viewer withdrawal unexpectedly succeeded';
  exception when insufficient_privilege then null;
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
    perform public.record_stock_withdrawal(
      '40000000-0000-4000-8000-000000000005',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      '00000000-0000-4000-8000-000000000110',
      1.000,
      null,
      'cross-org denied'
    );
    raise exception 'cross-Organization withdrawal unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

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
      '00000000-0000-4000-8000-000000000110',
      21.000,
      null,
      'negative denied by default'
    );
    raise exception 'negative stock unexpectedly succeeded without configuration';
  exception when invalid_parameter_value then null;
  end;
end;
$$;
reset role;

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
  '00000000-0000-4000-8000-000000000110',
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
  if (select cost_basis from public.stock_movement_items where movement_id='40000000-0000-4000-8000-000000000007') <> 'mixed_estimate' then
    raise exception 'negative withdrawal did not expose mixed estimated cost basis';
  end if;
  if (select after_data->>'cost_warning' from public.audit_logs where entity_id='40000000-0000-4000-8000-000000000007' and action='stock_withdrawal.recorded') <> 'negative_stock_estimate' then
    raise exception 'negative withdrawal did not audit estimated cost warning';
  end if;
  if (select (after_data->>'negative_estimated_quantity')::numeric from public.audit_logs where entity_id='40000000-0000-4000-8000-000000000007' and action='stock_withdrawal.recorded') <> 5.000 then
    raise exception 'negative withdrawal estimated quantity mismatch';
  end if;

  begin
    update public.stock_locations
    set allow_negative_stock = false
    where id = '00000000-0000-4000-8000-000000000120'
      and organization_id = '00000000-0000-4000-8000-000000000001';
    raise exception 'negative-stock policy was disabled with negative balance present';
  exception when check_violation then null;
  end;
end;
$$;

set role anon;
do $$
begin
  begin
    perform public.record_stock_withdrawal(
      '40000000-0000-4000-8000-000000000008',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      '00000000-0000-4000-8000-000000000110',
      1.000,
      null,
      'anon denied'
    );
    raise exception 'anonymous withdrawal unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select 'stock withdrawal tests passed' as result;
