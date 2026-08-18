\set ON_ERROR_STOP on

-- stock_transfer.sql leaves demo water at 70 units in Tabatinga:
-- original August batch = 65 at physical cost 2.10; later CI batch = 5 at physical cost 3.00.
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
declare
  preferred_batch uuid;
begin
  select id into preferred_batch
  from public.inventory_batches
  where organization_id = '00000000-0000-4000-8000-000000000001'
    and stock_item_id = '00000000-0000-4000-8000-000000000400'
    and stock_location_id = '00000000-0000-4000-8000-000000000120'
    and source_reference_id = '10000000-0000-4000-8000-000000000900';

  perform public.dispatch_stock_transfer(
    '51000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000400',
    '00000000-0000-4000-8000-000000000120',
    '00000000-0000-4000-8000-000000000122',
    10.000,
    preferred_batch,
    'CI preferred multi-batch transfer'
  );
end;
$$;

reset role;

do $$
declare
  transfer_item uuid;
  preferred_batch uuid;
begin
  select id into transfer_item
  from public.stock_transfer_items
  where transfer_id = '51000000-0000-4000-8000-000000000001';

  select id into preferred_batch
  from public.inventory_batches
  where organization_id = '00000000-0000-4000-8000-000000000001'
    and stock_item_id = '00000000-0000-4000-8000-000000000400'
    and stock_location_id = '00000000-0000-4000-8000-000000000120'
    and source_reference_id = '10000000-0000-4000-8000-000000000900';

  if (select count(*) from public.stock_transfer_batch_allocations where transfer_item_id = transfer_item) <> 2 then
    raise exception 'multi-batch dispatch should create exactly two allocations';
  end if;

  if (select source_batch_id from public.stock_transfer_batch_allocations where transfer_item_id = transfer_item and allocation_order = 1) <> preferred_batch then
    raise exception 'preferred batch was not allocation order 1';
  end if;

  if (select quantity from public.stock_transfer_batch_allocations where transfer_item_id = transfer_item and allocation_order = 1) <> 5.000 then
    raise exception 'preferred batch allocation should consume its full 5 units';
  end if;

  if (select source_batch_id from public.stock_transfer_batch_allocations where transfer_item_id = transfer_item and allocation_order = 2) <> '00000000-0000-4000-8000-000000000610'::uuid then
    raise exception 'FEFO remainder was not allocation order 2';
  end if;

  if (select quantity from public.stock_transfer_batch_allocations where transfer_item_id = transfer_item and allocation_order = 2) <> 5.000 then
    raise exception 'FEFO remainder allocation should be 5 units';
  end if;
end;
$$;

-- Receive 6 units: 5 must come from allocation order 1 and 1 from order 2.
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

select * from public.receive_stock_transfer(
  '51000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000001',
  6.000
);

reset role;

do $$
declare
  transfer_item uuid;
  first_destination_batch uuid;
  second_destination_batch uuid;
begin
  select id into transfer_item
  from public.stock_transfer_items
  where transfer_id = '51000000-0000-4000-8000-000000000001';

  if (select received_quantity from public.stock_transfer_batch_allocations where transfer_item_id = transfer_item and allocation_order = 1) <> 5.000 then
    raise exception 'partial receipt did not fully consume allocation order 1';
  end if;

  if (select received_quantity from public.stock_transfer_batch_allocations where transfer_item_id = transfer_item and allocation_order = 2) <> 1.000 then
    raise exception 'partial receipt did not continue into allocation order 2';
  end if;

  select destination_batch_id into first_destination_batch
  from public.stock_transfer_batch_allocations
  where transfer_item_id = transfer_item and allocation_order = 1;

  select destination_batch_id into second_destination_batch
  from public.stock_transfer_batch_allocations
  where transfer_item_id = transfer_item and allocation_order = 2;

  if first_destination_batch is null or second_destination_batch is null then
    raise exception 'partial multi-batch receipt did not materialize both destination batches';
  end if;

  if (select unit_cost from public.inventory_batches where id = first_destination_batch) <> 3.00 then
    raise exception 'preferred destination batch lost physical cost 3.00';
  end if;

  if (select unit_cost from public.inventory_batches where id = second_destination_batch) <> 2.10 then
    raise exception 'FEFO destination batch lost physical cost 2.10';
  end if;

  if (select original_quantity from public.inventory_batches where id = first_destination_batch) <> 5.000 then
    raise exception 'preferred destination batch quantity mismatch';
  end if;

  if (select original_quantity from public.inventory_batches where id = second_destination_batch) <> 1.000 then
    raise exception 'second destination batch partial quantity mismatch';
  end if;

  if (select quantity_on_hand from public.inventory_balances where organization_id = '00000000-0000-4000-8000-000000000001' and stock_item_id = '00000000-0000-4000-8000-000000000400' and stock_location_id = '00000000-0000-4000-8000-000000000122') <> 6.000 then
    raise exception 'multi-batch partial receipt destination balance mismatch';
  end if;

  if (select average_cost from public.inventory_balances where organization_id = '00000000-0000-4000-8000-000000000001' and stock_item_id = '00000000-0000-4000-8000-000000000400' and stock_location_id = '00000000-0000-4000-8000-000000000122') <> 2.18 then
    raise exception 'destination balance should use transfer line average cost snapshot';
  end if;
end;
$$;

-- Receive the final 4 units; they must extend destination batch for allocation order 2.
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

select * from public.receive_stock_transfer(
  '51000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000001',
  null
);

reset role;

do $$
declare
  transfer_item uuid;
  second_destination_batch uuid;
begin
  select id into transfer_item
  from public.stock_transfer_items
  where transfer_id = '51000000-0000-4000-8000-000000000001';

  if (select status from public.stock_transfers where id = '51000000-0000-4000-8000-000000000001') <> 'received' then
    raise exception 'multi-batch transfer did not close after final receipt';
  end if;

  if (select received_quantity from public.stock_transfer_batch_allocations where transfer_item_id = transfer_item and allocation_order = 2) <> 5.000 then
    raise exception 'final receipt did not finish allocation order 2';
  end if;

  select destination_batch_id into second_destination_batch
  from public.stock_transfer_batch_allocations
  where transfer_item_id = transfer_item and allocation_order = 2;

  if (select original_quantity from public.inventory_batches where id = second_destination_batch) <> 5.000
    or (select remaining_quantity from public.inventory_batches where id = second_destination_batch) <> 5.000
  then
    raise exception 'final receipt did not extend second destination batch to 5 units';
  end if;

  if (select quantity_on_hand from public.inventory_balances where organization_id = '00000000-0000-4000-8000-000000000001' and stock_item_id = '00000000-0000-4000-8000-000000000400' and stock_location_id = '00000000-0000-4000-8000-000000000122') <> 10.000 then
    raise exception 'completed multi-batch transfer destination balance mismatch';
  end if;
end;
$$;

select 'stock transfer multi-batch tests passed' as result;
