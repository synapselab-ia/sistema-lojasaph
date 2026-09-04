\set ON_ERROR_STOP on

-- Prior suites leave demo water at 90 units in Tabatinga, average cost 2.18,
-- with the original August batch at 85 and the later CI batch at 5.
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

select * from public.dispatch_stock_transfer(
  '50000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000400',
  '00000000-0000-4000-8000-000000000120',
  '00000000-0000-4000-8000-000000000121',
  20.000,
  null,
  'CI transfer dispatch'
);

select * from public.dispatch_stock_transfer(
  '50000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000400',
  '00000000-0000-4000-8000-000000000120',
  '00000000-0000-4000-8000-000000000121',
  20.000,
  null,
  'CI transfer dispatch'
);

do $$
begin
  begin
    perform public.dispatch_stock_transfer(
      '50000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      '00000000-0000-4000-8000-000000000121',
      19.000,
      null,
      'CI transfer dispatch'
    );
    raise exception 'dispatch idempotency conflict unexpectedly succeeded';
  exception when unique_violation then null;
  end;
end;
$$;

reset role;

do $$
declare
  transfer_item uuid;
begin
  if (select quantity_on_hand from public.inventory_balances where organization_id = '00000000-0000-4000-8000-000000000001' and stock_item_id = '00000000-0000-4000-8000-000000000400' and stock_location_id = '00000000-0000-4000-8000-000000000120') <> 70.000 then
    raise exception 'dispatch produced wrong source balance';
  end if;

  if exists (
    select 1 from public.inventory_balances
    where organization_id = '00000000-0000-4000-8000-000000000001'
      and stock_item_id = '00000000-0000-4000-8000-000000000400'
      and stock_location_id = '00000000-0000-4000-8000-000000000121'
      and quantity_on_hand <> 0
  ) then
    raise exception 'dispatch credited destination before receive';
  end if;

  if (select status from public.stock_transfers where id = '50000000-0000-4000-8000-000000000001') <> 'dispatched' then
    raise exception 'dispatch did not set transfer status';
  end if;

  if (select count(*) from public.stock_movements where id = '50000000-0000-4000-8000-000000000001' and movement_type = 'transfer_out') <> 1 then
    raise exception 'dispatch movement duplicated or missing';
  end if;

  select id into transfer_item
  from public.stock_transfer_items
  where transfer_id = '50000000-0000-4000-8000-000000000001';

  if (select count(*) from public.stock_transfer_batch_allocations where transfer_item_id = transfer_item) <> 1 then
    raise exception 'dispatch should use one FEFO batch for 20 units';
  end if;

  if (select allocation_order from public.stock_transfer_batch_allocations where transfer_item_id = transfer_item) <> 1 then
    raise exception 'dispatch did not preserve allocation order';
  end if;

  if (select source_batch_id from public.stock_transfer_batch_allocations where transfer_item_id = transfer_item) <> '00000000-0000-4000-8000-000000000610'::uuid then
    raise exception 'dispatch did not use FEFO source batch';
  end if;

  if (select remaining_quantity from public.inventory_batches where id = '00000000-0000-4000-8000-000000000610') <> 65.000 then
    raise exception 'dispatch did not decrement FEFO source batch';
  end if;

  if (select unit_cost_snapshot from public.stock_transfer_batch_allocations where transfer_item_id = transfer_item) <> 2.10 then
    raise exception 'dispatch lost physical batch cost snapshot';
  end if;

  if (select unit_cost_snapshot from public.stock_transfer_items where id = transfer_item) <> 2.10 then
    raise exception 'transfer line did not use physical batch cost snapshot';
  end if;

  if (select cost_basis from public.stock_transfer_items where id = transfer_item) <> 'layer_allocation' then
    raise exception 'transfer line did not identify layer allocation cost basis';
  end if;
end;
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  begin
    perform public.dispatch_stock_transfer(
      '50000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      '00000000-0000-4000-8000-000000000120',
      1.000,
      null,
      'same location must fail'
    );
    raise exception 'same-location dispatch unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.dispatch_stock_transfer(
      '50000000-0000-4000-8000-000000000003',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      '00000000-0000-4000-8000-000000000121',
      999.000,
      null,
      'insufficient dispatch must fail'
    );
    raise exception 'insufficient dispatch unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

select * from public.receive_stock_transfer(
  '50000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  8.000
);

select * from public.receive_stock_transfer(
  '50000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  8.000
);

do $$
begin
  begin
    perform public.receive_stock_transfer(
      '50000000-0000-4000-8000-000000000010',
      '00000000-0000-4000-8000-000000000001',
      '50000000-0000-4000-8000-000000000001',
      7.000
    );
    raise exception 'receive idempotency conflict unexpectedly succeeded';
  exception when unique_violation then null;
  end;
end;
$$;

reset role;

do $$
declare
  destination_batch uuid;
begin
  if (select quantity_on_hand from public.inventory_balances where organization_id = '00000000-0000-4000-8000-000000000001' and stock_item_id = '00000000-0000-4000-8000-000000000400' and stock_location_id = '00000000-0000-4000-8000-000000000121') <> 8.000 then
    raise exception 'partial receipt produced wrong destination balance';
  end if;

  if (select average_cost from public.inventory_balances where organization_id = '00000000-0000-4000-8000-000000000001' and stock_item_id = '00000000-0000-4000-8000-000000000400' and stock_location_id = '00000000-0000-4000-8000-000000000121') <> 2.10 then
    raise exception 'partial receipt did not use physical transfer-layer cost';
  end if;

  if (select status from public.stock_transfers where id = '50000000-0000-4000-8000-000000000001') <> 'partially_received' then
    raise exception 'partial receipt produced wrong transfer status';
  end if;

  if (select received_quantity from public.stock_transfer_items where transfer_id = '50000000-0000-4000-8000-000000000001') <> 8.000 then
    raise exception 'partial receipt produced wrong received total';
  end if;

  select destination_batch_id into destination_batch
  from public.stock_transfer_batch_allocations
  where transfer_item_id = (
    select id from public.stock_transfer_items where transfer_id = '50000000-0000-4000-8000-000000000001'
  ) and allocation_order = 1;

  if destination_batch is null then
    raise exception 'partial receipt failed to create destination batch';
  end if;

  if (select original_quantity from public.inventory_batches where id = destination_batch) <> 8.000
    or (select remaining_quantity from public.inventory_batches where id = destination_batch) <> 8.000
  then
    raise exception 'partial receipt created wrong destination batch quantities';
  end if;

  if (select batch_code from public.inventory_batches where id = destination_batch) is distinct from 'AGUA-0826'
    or (select expiration_date from public.inventory_batches where id = destination_batch) is distinct from '2026-08-28'::date
    or (select unit_cost from public.inventory_batches where id = destination_batch) <> 2.10
  then
    raise exception 'partial receipt failed to preserve batch snapshots';
  end if;

  if (select count(*) from public.stock_movements where id = '50000000-0000-4000-8000-000000000010' and movement_type = 'transfer_in') <> 1 then
    raise exception 'partial receipt retry duplicated movement';
  end if;
end;
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  begin
    perform public.receive_stock_transfer(
      '50000000-0000-4000-8000-000000000011',
      '00000000-0000-4000-8000-000000000001',
      '50000000-0000-4000-8000-000000000001',
      13.000
    );
    raise exception 'over-receive unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

select * from public.receive_stock_transfer(
  '50000000-0000-4000-8000-000000000012',
  '00000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  null
);

select * from public.receive_stock_transfer(
  '50000000-0000-4000-8000-000000000012',
  '00000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  null
);

reset role;

do $$
declare
  destination_batch uuid;
begin
  if (select quantity_on_hand from public.inventory_balances where organization_id = '00000000-0000-4000-8000-000000000001' and stock_item_id = '00000000-0000-4000-8000-000000000400' and stock_location_id = '00000000-0000-4000-8000-000000000121') <> 20.000 then
    raise exception 'completed receipt produced wrong destination balance';
  end if;

  if (select average_cost from public.inventory_balances where organization_id = '00000000-0000-4000-8000-000000000001' and stock_item_id = '00000000-0000-4000-8000-000000000400' and stock_location_id = '00000000-0000-4000-8000-000000000121') <> 2.10 then
    raise exception 'completed receipt lost physical transfer-layer cost';
  end if;

  if (select status from public.stock_transfers where id = '50000000-0000-4000-8000-000000000001') <> 'received' then
    raise exception 'completed receipt did not close transfer';
  end if;

  if (select received_quantity from public.stock_transfer_items where transfer_id = '50000000-0000-4000-8000-000000000001') <> 20.000 then
    raise exception 'completed receipt produced wrong received total';
  end if;

  select destination_batch_id into destination_batch
  from public.stock_transfer_batch_allocations
  where transfer_item_id = (
    select id from public.stock_transfer_items where transfer_id = '50000000-0000-4000-8000-000000000001'
  ) and allocation_order = 1;

  if (select original_quantity from public.inventory_batches where id = destination_batch) <> 20.000
    or (select remaining_quantity from public.inventory_batches where id = destination_batch) <> 20.000
  then
    raise exception 'completed receipt failed to extend destination batch';
  end if;

  if (select quantity_on_hand from public.inventory_balances where organization_id = '00000000-0000-4000-8000-000000000001' and stock_item_id = '00000000-0000-4000-8000-000000000400' and stock_location_id = '00000000-0000-4000-8000-000000000120') <> 70.000 then
    raise exception 'receive incorrectly changed source balance';
  end if;
end;
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  begin
    perform public.receive_stock_transfer(
      '50000000-0000-4000-8000-000000000013',
      '00000000-0000-4000-8000-000000000001',
      '50000000-0000-4000-8000-000000000001',
      1.000
    );
    raise exception 'completed transfer unexpectedly received more stock';
  exception when invalid_parameter_value then null;
  end;
end;
$$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  begin
    perform public.dispatch_stock_transfer(
      '50000000-0000-4000-8000-000000000020',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      '00000000-0000-4000-8000-000000000121',
      1.000,
      null,
      'viewer denied'
    );
    raise exception 'viewer dispatch unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.receive_stock_transfer(
      '50000000-0000-4000-8000-000000000021',
      '00000000-0000-4000-8000-000000000001',
      '50000000-0000-4000-8000-000000000001',
      1.000
    );
    raise exception 'viewer receive unexpectedly succeeded';
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
    perform public.dispatch_stock_transfer(
      '50000000-0000-4000-8000-000000000022',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      '00000000-0000-4000-8000-000000000121',
      1.000,
      null,
      'cross-org denied'
    );
    raise exception 'cross-Organization dispatch unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

select * from public.record_stock_entry(
  '50000000-0000-4000-8000-000000000030',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000402',
  '00000000-0000-4000-8000-000000000120',
  5.000,
  25.00,
  null,
  null,
  'offset negative balance'
);

select * from public.record_stock_entry(
  '50000000-0000-4000-8000-000000000031',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000402',
  '00000000-0000-4000-8000-000000000120',
  2.000,
  30.00,
  null,
  null,
  'rebuild positive balance'
);

reset role;

do $$
begin
  if (select quantity_on_hand from public.inventory_balances where organization_id = '00000000-0000-4000-8000-000000000001' and stock_item_id = '00000000-0000-4000-8000-000000000402' and stock_location_id = '00000000-0000-4000-8000-000000000120') <> 2.000 then
    raise exception 'negative replenishment regression produced wrong quantity';
  end if;

  if (select average_cost from public.inventory_balances where organization_id = '00000000-0000-4000-8000-000000000001' and stock_item_id = '00000000-0000-4000-8000-000000000402' and stock_location_id = '00000000-0000-4000-8000-000000000120') <> 30.00 then
    raise exception 'negative replenishment regression produced wrong average cost';
  end if;
end;
$$;

set role anon;
do $$
begin
  begin
    perform public.dispatch_stock_transfer(
      '50000000-0000-4000-8000-000000000040',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000400',
      '00000000-0000-4000-8000-000000000120',
      '00000000-0000-4000-8000-000000000121',
      1.000,
      null,
      'anon denied'
    );
    raise exception 'anonymous dispatch unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select 'stock transfer tests passed' as result;
