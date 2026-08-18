\set ON_ERROR_STOP on

-- Purchase-specific users and one second supplier mapping used only by CI/demo tests.
insert into auth.users (id, email)
values
  ('70000000-0000-4000-8000-000000000001', 'purchases@example.invalid'),
  ('70000000-0000-4000-8000-000000000002', 'purchase-inventory@example.invalid'),
  ('70000000-0000-4000-8000-000000000003', 'purchase-viewer@example.invalid'),
  ('70000000-0000-4000-8000-000000000004', 'purchase-other-org@example.invalid')
on conflict (id) do nothing;

insert into public.organization_memberships (organization_id, user_id, role, active)
values
  ('00000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'purchases', true),
  ('00000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000002', 'inventory', true),
  ('00000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000003', 'viewer', true)
on conflict do nothing;

insert into public.organizations (id, name)
values ('70000000-0000-4000-8000-000000000100', 'Outra Organização Compras CI')
on conflict (id) do nothing;

insert into public.organization_memberships (organization_id, user_id, role, active)
values ('70000000-0000-4000-8000-000000000100', '70000000-0000-4000-8000-000000000004', 'purchases', true)
on conflict do nothing;

insert into public.supplier_items (
  id, organization_id, supplier_id, stock_item_id, purchase_unit, active
)
values (
  '70000000-0000-4000-8000-000000000200',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000500',
  '00000000-0000-4000-8000-000000000402',
  'pct',
  true
)
on conflict (id) do nothing;

-- Baseline is dynamic so this suite remains valid if earlier stock suites are replayed first.
create temporary table purchase_test_baseline as
select
  balance.stock_item_id,
  balance.quantity_on_hand,
  balance.average_cost
from public.inventory_balances balance
where balance.organization_id = '00000000-0000-4000-8000-000000000001'
  and balance.stock_location_id = '00000000-0000-4000-8000-000000000120'
  and balance.stock_item_id in (
    '00000000-0000-4000-8000-000000000400',
    '00000000-0000-4000-8000-000000000402'
  );

-- Direct writes remain forbidden to authenticated clients.
set role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  begin
    insert into public.purchase_orders (
      organization_id, supplier_id, stock_location_id, status
    ) values (
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000500',
      '00000000-0000-4000-8000-000000000120',
      'draft'
    );
    raise exception 'authenticated direct purchase order write unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

-- Null item payload is invalid and must not create a draft.
do $$
begin
  begin
    perform public.create_purchase_order(
      '71000000-0000-4000-8000-000000000090',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000500',
      '00000000-0000-4000-8000-000000000120',
      null,
      'null items denied',
      null
    );
    raise exception 'null purchase order items unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

-- Create a two-line draft order. Quantities are base-stock-unit quantities in Fase 10 v1.
select * from public.create_purchase_order(
  '71000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000500',
  '00000000-0000-4000-8000-000000000120',
  '2026-08-25',
  'Pedido principal CI',
  jsonb_build_array(
    jsonb_build_object(
      'supplier_item_id', '00000000-0000-4000-8000-000000000520',
      'quantity', 20.000,
      'unit_price', 2.50
    ),
    jsonb_build_object(
      'supplier_item_id', '70000000-0000-4000-8000-000000000200',
      'quantity', 10.000,
      'unit_price', 18.00
    )
  )
);

-- Identical create retry is idempotent.
select * from public.create_purchase_order(
  '71000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000500',
  '00000000-0000-4000-8000-000000000120',
  '2026-08-25',
  'Pedido principal CI',
  jsonb_build_array(
    jsonb_build_object('supplier_item_id', '70000000-0000-4000-8000-000000000200', 'quantity', 10.000, 'unit_price', 18.00),
    jsonb_build_object('supplier_item_id', '00000000-0000-4000-8000-000000000520', 'quantity', 20.000, 'unit_price', 2.50)
  )
);

-- Same command/order id with a changed price conflicts.
do $$
begin
  begin
    perform public.create_purchase_order(
      '71000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000500',
      '00000000-0000-4000-8000-000000000120',
      '2026-08-25',
      'Pedido principal CI',
      jsonb_build_array(
        jsonb_build_object('supplier_item_id', '00000000-0000-4000-8000-000000000520', 'quantity', 20.000, 'unit_price', 2.60),
        jsonb_build_object('supplier_item_id', '70000000-0000-4000-8000-000000000200', 'quantity', 10.000, 'unit_price', 18.00)
      )
    );
    raise exception 'purchase order create idempotency conflict unexpectedly succeeded';
  exception
    when unique_violation then null;
  end;
end;
$$;

-- Inventory can receive later, but cannot create/issue/cancel purchase orders.
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  begin
    perform public.create_purchase_order(
      '71000000-0000-4000-8000-000000000099',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000500',
      '00000000-0000-4000-8000-000000000120',
      null,
      'inventory denied',
      jsonb_build_array(jsonb_build_object('supplier_item_id', '00000000-0000-4000-8000-000000000520', 'quantity', 1.000, 'unit_price', 2.50))
    );
    raise exception 'inventory role unexpectedly created purchase order';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

-- Purchases role issues the draft; retry must not duplicate supplier price history.
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

select * from public.issue_purchase_order(
  '71000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001'
);
select * from public.issue_purchase_order(
  '71000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001'
);

reset role;

do $$
begin
  if (select status from public.purchase_orders where id='71000000-0000-4000-8000-000000000001') <> 'ordered' then
    raise exception 'purchase order was not issued';
  end if;
  if (select count(*) from public.supplier_prices where source='purchase_order' and supplier_item_id in ('00000000-0000-4000-8000-000000000520','70000000-0000-4000-8000-000000000200')) <> 2 then
    raise exception 'purchase issue retry duplicated or missed supplier price history';
  end if;
end;
$$;

-- Null receipt payload is invalid while the order is receivable.
do $$
begin
  begin
    perform public.receive_purchase_order(
      '71000000-0000-4000-8000-000000000091',
      '00000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000001',
      null,
      'null receipt items denied'
    );
    raise exception 'null purchase receipt items unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

-- Inventory role performs the first partial receipt with two items.
set role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

select * from public.receive_purchase_order(
  '71000000-0000-4000-8000-000000000020',
  '00000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001',
  jsonb_build_array(
    jsonb_build_object(
      'purchase_order_item_id', (
        select id from public.purchase_order_items
        where purchase_order_id='71000000-0000-4000-8000-000000000001'
          and supplier_item_id='00000000-0000-4000-8000-000000000520'
      ),
      'quantity', 10.000,
      'batch_code', 'PO-WATER-1',
      'expiration_date', '2026-09-30'
    ),
    jsonb_build_object(
      'purchase_order_item_id', (
        select id from public.purchase_order_items
        where purchase_order_id='71000000-0000-4000-8000-000000000001'
          and supplier_item_id='70000000-0000-4000-8000-000000000200'
      ),
      'quantity', 4.000
    )
  ),
  'Primeiro recebimento CI'
);

-- Identical receipt retry is idempotent.
select * from public.receive_purchase_order(
  '71000000-0000-4000-8000-000000000020',
  '00000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001',
  jsonb_build_array(
    jsonb_build_object(
      'purchase_order_item_id', (
        select id from public.purchase_order_items where purchase_order_id='71000000-0000-4000-8000-000000000001' and supplier_item_id='70000000-0000-4000-8000-000000000200'
      ), 'quantity', 4.000
    ),
    jsonb_build_object(
      'purchase_order_item_id', (
        select id from public.purchase_order_items where purchase_order_id='71000000-0000-4000-8000-000000000001' and supplier_item_id='00000000-0000-4000-8000-000000000520'
      ), 'quantity', 10.000, 'batch_code', 'PO-WATER-1', 'expiration_date', '2026-09-30'
    )
  ),
  'Primeiro recebimento CI'
);

reset role;

do $$
declare
  water_item uuid;
  coal_item uuid;
  water_baseline numeric(18,3);
  coal_baseline numeric(18,3);
  expected_water_cost numeric(18,2);
  expected_coal_cost numeric(18,2);
begin
  select id into water_item from public.purchase_order_items where purchase_order_id='71000000-0000-4000-8000-000000000001' and supplier_item_id='00000000-0000-4000-8000-000000000520';
  select id into coal_item from public.purchase_order_items where purchase_order_id='71000000-0000-4000-8000-000000000001' and supplier_item_id='70000000-0000-4000-8000-000000000200';
  select quantity_on_hand into water_baseline from purchase_test_baseline where stock_item_id='00000000-0000-4000-8000-000000000400';
  select quantity_on_hand into coal_baseline from purchase_test_baseline where stock_item_id='00000000-0000-4000-8000-000000000402';
  select private.replenishment_average_cost(quantity_on_hand, average_cost, 10.000, 2.50) into expected_water_cost from purchase_test_baseline where stock_item_id='00000000-0000-4000-8000-000000000400';
  select private.replenishment_average_cost(quantity_on_hand, average_cost, 4.000, 18.00) into expected_coal_cost from purchase_test_baseline where stock_item_id='00000000-0000-4000-8000-000000000402';

  if (select status from public.purchase_orders where id='71000000-0000-4000-8000-000000000001') <> 'partially_received' then raise exception 'first purchase receipt did not leave order partial'; end if;
  if (select received_quantity from public.purchase_order_items where id=water_item) <> 10.000 then raise exception 'water partial receipt quantity mismatch'; end if;
  if (select received_quantity from public.purchase_order_items where id=coal_item) <> 4.000 then raise exception 'coal partial receipt quantity mismatch'; end if;
  if (select quantity_on_hand from public.inventory_balances where organization_id='00000000-0000-4000-8000-000000000001' and stock_location_id='00000000-0000-4000-8000-000000000120' and stock_item_id='00000000-0000-4000-8000-000000000400') <> water_baseline + 10 then raise exception 'water stock not incremented by purchase receipt'; end if;
  if (select average_cost from public.inventory_balances where organization_id='00000000-0000-4000-8000-000000000001' and stock_location_id='00000000-0000-4000-8000-000000000120' and stock_item_id='00000000-0000-4000-8000-000000000400') <> expected_water_cost then raise exception 'water average cost mismatch after purchase receipt'; end if;
  if (select quantity_on_hand from public.inventory_balances where organization_id='00000000-0000-4000-8000-000000000001' and stock_location_id='00000000-0000-4000-8000-000000000120' and stock_item_id='00000000-0000-4000-8000-000000000402') <> coal_baseline + 4 then raise exception 'coal stock not incremented by purchase receipt'; end if;
  if (select average_cost from public.inventory_balances where organization_id='00000000-0000-4000-8000-000000000001' and stock_location_id='00000000-0000-4000-8000-000000000120' and stock_item_id='00000000-0000-4000-8000-000000000402') <> expected_coal_cost then raise exception 'coal average cost mismatch after purchase receipt'; end if;
  if (select count(*) from public.purchase_receipt_items where purchase_receipt_id='71000000-0000-4000-8000-000000000020') <> 2 then raise exception 'receipt retry duplicated receipt items'; end if;
  if (select count(*) from public.stock_movements where reference_type='purchase_receipt' and reference_id='71000000-0000-4000-8000-000000000020') <> 2 then raise exception 'receipt retry duplicated stock movements'; end if;
  if (select count(*) from public.inventory_batches where source_reference_id='71000000-0000-4000-8000-000000000020' and batch_code='PO-WATER-1' and expiration_date='2026-09-30') <> 1 then raise exception 'tracked purchase receipt did not create expected batch'; end if;
end;
$$;

-- Over-receive is blocked and leaves no receipt row.
set role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
declare water_item uuid;
begin
  select id into water_item from public.purchase_order_items where purchase_order_id='71000000-0000-4000-8000-000000000001' and supplier_item_id='00000000-0000-4000-8000-000000000520';
  begin
    perform public.receive_purchase_order(
      '71000000-0000-4000-8000-000000000021',
      '00000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000001',
      jsonb_build_array(jsonb_build_object('purchase_order_item_id', water_item, 'quantity', 11.000, 'batch_code', 'PO-WATER-OVER')),
      'over receive denied'
    );
    raise exception 'purchase over-receive unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;
end;
$$;

-- Multi-line atomic rollback: valid existing line first, invalid ffffffff item second.
do $$
declare water_item uuid; before_received numeric(18,3); before_balance numeric(18,3);
begin
  select id,received_quantity into water_item,before_received from public.purchase_order_items where purchase_order_id='71000000-0000-4000-8000-000000000001' and supplier_item_id='00000000-0000-4000-8000-000000000520';
  select quantity_on_hand into before_balance from public.inventory_balances where organization_id='00000000-0000-4000-8000-000000000001' and stock_location_id='00000000-0000-4000-8000-000000000120' and stock_item_id='00000000-0000-4000-8000-000000000400';
  begin
    perform public.receive_purchase_order(
      '71000000-0000-4000-8000-000000000022',
      '00000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000001',
      jsonb_build_array(
        jsonb_build_object('purchase_order_item_id', water_item, 'quantity', 1.000, 'batch_code', 'ATOMIC-ROLLBACK'),
        jsonb_build_object('purchase_order_item_id', 'ffffffff-ffff-4fff-8fff-ffffffffffff', 'quantity', 1.000)
      ),
      'atomic rollback test'
    );
    raise exception 'invalid multi-line purchase receipt unexpectedly succeeded';
  exception
    when foreign_key_violation then null;
  end;
  if (select received_quantity from public.purchase_order_items where id=water_item) <> before_received then raise exception 'failed multi-line receipt leaked order item quantity'; end if;
  if (select quantity_on_hand from public.inventory_balances where organization_id='00000000-0000-4000-8000-000000000001' and stock_location_id='00000000-0000-4000-8000-000000000120' and stock_item_id='00000000-0000-4000-8000-000000000400') <> before_balance then raise exception 'failed multi-line receipt leaked stock change'; end if;
  if exists(select 1 from public.purchase_receipts where id='71000000-0000-4000-8000-000000000022') then raise exception 'failed multi-line receipt leaked receipt header'; end if;
  if exists(select 1 from public.stock_movements where reference_type='purchase_receipt' and reference_id='71000000-0000-4000-8000-000000000022') then raise exception 'failed multi-line receipt leaked stock movement'; end if;
end;
$$;

-- Receive all remaining quantities and close the main order.
select * from public.receive_purchase_order(
  '71000000-0000-4000-8000-000000000023',
  '00000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001',
  jsonb_build_array(
    jsonb_build_object(
      'purchase_order_item_id', (select id from public.purchase_order_items where purchase_order_id='71000000-0000-4000-8000-000000000001' and supplier_item_id='00000000-0000-4000-8000-000000000520'),
      'quantity', 10.000,
      'batch_code', 'PO-WATER-2',
      'expiration_date', '2026-10-31'
    ),
    jsonb_build_object(
      'purchase_order_item_id', (select id from public.purchase_order_items where purchase_order_id='71000000-0000-4000-8000-000000000001' and supplier_item_id='70000000-0000-4000-8000-000000000200'),
      'quantity', 6.000
    )
  ),
  'Recebimento final CI'
);

reset role;

do $$
begin
  if (select status from public.purchase_orders where id='71000000-0000-4000-8000-000000000001') <> 'received' then raise exception 'main purchase order did not close as received'; end if;
  if exists(select 1 from public.purchase_order_items where purchase_order_id='71000000-0000-4000-8000-000000000001' and received_quantity<>ordered_quantity) then raise exception 'main purchase order still has pending quantity'; end if;
  if (select count(*) from public.stock_movements where reference_type='purchase_receipt' and reference_id in ('71000000-0000-4000-8000-000000000020','71000000-0000-4000-8000-000000000023')) <> 4 then raise exception 'main order should have four receipt stock movements'; end if;
end;
$$;

-- Received orders are immutable to cancellation.
set role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  begin
    perform public.cancel_purchase_order(
      '71000000-0000-4000-8000-000000000030',
      '00000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000001',
      'received immutable'
    );
    raise exception 'received purchase order unexpectedly cancelled';
  exception
    when invalid_parameter_value then null;
  end;
end;
$$;

-- Draft cancellation.
select * from public.create_purchase_order(
  '71000000-0000-4000-8000-000000000040',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000500',
  '00000000-0000-4000-8000-000000000120',
  null,
  'draft cancel',
  jsonb_build_array(jsonb_build_object('supplier_item_id','70000000-0000-4000-8000-000000000200','quantity',1.000,'unit_price',19.00))
);
select * from public.cancel_purchase_order(
  '71000000-0000-4000-8000-000000000041',
  '00000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000040',
  'cancel draft'
);
select * from public.cancel_purchase_order(
  '71000000-0000-4000-8000-000000000041',
  '00000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000040',
  'cancel draft'
);

-- Same cancel command with a different reason is an idempotency conflict.
do $$
begin
  begin
    perform public.cancel_purchase_order(
      '71000000-0000-4000-8000-000000000041',
      '00000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000040',
      'different cancel reason'
    );
    raise exception 'cancel idempotency conflict unexpectedly succeeded';
  exception when unique_violation then null;
  end;
end;
$$;

-- Partial order may be cancelled; already received stock is retained.
select * from public.create_purchase_order(
  '71000000-0000-4000-8000-000000000050',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000500',
  '00000000-0000-4000-8000-000000000120',
  null,
  'partial cancel',
  jsonb_build_array(jsonb_build_object('supplier_item_id','70000000-0000-4000-8000-000000000200','quantity',2.000,'unit_price',20.00))
);
select * from public.issue_purchase_order('71000000-0000-4000-8000-000000000051','00000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000050');

reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
select * from public.receive_purchase_order(
  '71000000-0000-4000-8000-000000000052',
  '00000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000050',
  jsonb_build_array(jsonb_build_object('purchase_order_item_id',(select id from public.purchase_order_items where purchase_order_id='71000000-0000-4000-8000-000000000050'),'quantity',1.000)),
  'one of two received'
);

reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
select * from public.cancel_purchase_order('71000000-0000-4000-8000-000000000053','00000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000050','supplier cancelled remainder');

reset role;

do $$
begin
  if (select status from public.purchase_orders where id='71000000-0000-4000-8000-000000000040') <> 'cancelled' then raise exception 'draft purchase order did not cancel'; end if;
  if (select status from public.purchase_orders where id='71000000-0000-4000-8000-000000000050') <> 'cancelled' then raise exception 'partially received purchase order did not cancel'; end if;
  if (select received_quantity from public.purchase_order_items where purchase_order_id='71000000-0000-4000-8000-000000000050') <> 1.000 then raise exception 'partial cancel lost already received quantity'; end if;
end;
$$;

-- Viewer and other-Organization purchases user are denied against Organization 1.
set role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000003', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
do $$
begin
  begin
    perform public.create_purchase_order(
      '71000000-0000-4000-8000-000000000060','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000500','00000000-0000-4000-8000-000000000120',null,'viewer denied',jsonb_build_array(jsonb_build_object('supplier_item_id','00000000-0000-4000-8000-000000000520','quantity',1.000,'unit_price',2.50))
    );
    raise exception 'viewer purchase create unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-4000-8000-000000000004', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
do $$
begin
  begin
    perform public.create_purchase_order(
      '71000000-0000-4000-8000-000000000061','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000500','00000000-0000-4000-8000-000000000120',null,'cross org denied',jsonb_build_array(jsonb_build_object('supplier_item_id','00000000-0000-4000-8000-000000000520','quantity',1.000,'unit_price',2.50))
    );
    raise exception 'cross-Organization purchase create unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- Anonymous callers have no command execution.
set role anon;
do $$
begin
  begin
    perform public.create_purchase_order(
      '71000000-0000-4000-8000-000000000062','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000500','00000000-0000-4000-8000-000000000120',null,'anon denied',jsonb_build_array(jsonb_build_object('supplier_item_id','00000000-0000-4000-8000-000000000520','quantity',1.000,'unit_price',2.50))
    );
    raise exception 'anonymous purchase create unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select 'purchase order lifecycle tests passed' as result;
