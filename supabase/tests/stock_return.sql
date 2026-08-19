\set ON_ERROR_STOP on

begin;

insert into public.organizations(id,name,timezone,currency)
values
 ('97000000-0000-4000-8000-000000000001','Devoluções CI','America/Sao_Paulo','BRL'),
 ('97000000-0000-4000-8000-000000000002','Outra organização devoluções CI','America/Sao_Paulo','BRL');

insert into public.businesses(id,organization_id,name,code) values
 ('97000000-0000-4000-8000-000000000010','97000000-0000-4000-8000-000000000001','Negócio devoluções CI','return-main'),
 ('97000000-0000-4000-8000-000000000011','97000000-0000-4000-8000-000000000002','Outro negócio devoluções CI','return-other');

insert into public.units(id,organization_id,business_id,name,code) values
 ('97000000-0000-4000-8000-000000000100','97000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000010','Unidade A devoluções CI','RET-A'),
 ('97000000-0000-4000-8000-000000000101','97000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000010','Unidade B devoluções CI','RET-B'),
 ('97000000-0000-4000-8000-000000000102','97000000-0000-4000-8000-000000000002','97000000-0000-4000-8000-000000000011','Outra unidade devoluções CI','RET-X');

insert into public.sectors(id,organization_id,unit_id,name,code,status) values
 ('97000000-0000-4000-8000-000000000110','97000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000100','Setor A devoluções CI','RET-SECTOR-A','active');

insert into public.stock_locations(id,organization_id,unit_id,name,code,location_type,status) values
 ('97000000-0000-4000-8000-000000000120','97000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000100','Estoque A devoluções CI','RET-LOC-A','warehouse','active'),
 ('97000000-0000-4000-8000-000000000121','97000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000101','Estoque B devoluções CI','RET-LOC-B','warehouse','active'),
 ('97000000-0000-4000-8000-000000000122','97000000-0000-4000-8000-000000000002','97000000-0000-4000-8000-000000000102','Outro estoque devoluções CI','RET-LOC-X','warehouse','active');

insert into public.units_of_measure(id,organization_id,code,name,decimal_scale,active)
values ('97000000-0000-4000-8000-000000000300','97000000-0000-4000-8000-000000000001','UN','Unidade',3,true);

insert into public.item_categories(id,organization_id,name,code)
values ('97000000-0000-4000-8000-000000000350','97000000-0000-4000-8000-000000000001','Categoria devoluções CI','return-fixture');

insert into public.stock_items(
  id,organization_id,category_id,base_unit_id,name,item_type,active,track_expiration,track_batch,is_returnable
) values (
  '97000000-0000-4000-8000-000000000400',
  '97000000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000350',
  '97000000-0000-4000-8000-000000000300',
  'Item rastreado devoluções CI',
  'consumable',
  true,
  true,
  true,
  true
);

insert into public.inventory_balances(
  organization_id,stock_item_id,stock_location_id,quantity_on_hand,average_cost
) values (
  '97000000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000400',
  '97000000-0000-4000-8000-000000000120',
  10.000,
  10.00
);

insert into public.inventory_batches(
  id,organization_id,stock_item_id,stock_location_id,batch_code,expiration_date,received_at,
  original_quantity,remaining_quantity,unit_cost,source_type,status
) values (
  '97000000-0000-4000-8000-000000000610',
  '97000000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000400',
  '97000000-0000-4000-8000-000000000120',
  'RET-ORIGINAL',
  '2030-01-01',
  '2026-01-01T00:00:00Z',
  10.000,
  10.000,
  8.00,
  'opening_balance',
  'active'
);

insert into auth.users(id,email) values
 ('97000000-0000-4000-8000-000000000201','return-unit-a@example.invalid'),
 ('97000000-0000-4000-8000-000000000202','return-unit-b@example.invalid'),
 ('97000000-0000-4000-8000-000000000203','return-viewer@example.invalid'),
 ('97000000-0000-4000-8000-000000000204','return-other-org@example.invalid');

insert into public.organization_memberships(organization_id,user_id,role,unit_id,active) values
 ('97000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000201','inventory','97000000-0000-4000-8000-000000000100',true),
 ('97000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000202','inventory','97000000-0000-4000-8000-000000000101',true),
 ('97000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000203','viewer','97000000-0000-4000-8000-000000000100',true),
 ('97000000-0000-4000-8000-000000000002','97000000-0000-4000-8000-000000000204','inventory','97000000-0000-4000-8000-000000000102',true);

do $$
begin
  if has_function_privilege(
    'anon',
    'public.record_stock_return(uuid,uuid,uuid,numeric,text)',
    'EXECUTE'
  ) then
    raise exception 'anon unexpectedly executes stock return';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.record_stock_return(uuid,uuid,uuid,numeric,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated cannot execute stock return';
  end if;
  if to_regclass('public.stock_movements_reversal_org_idx') is null then
    raise exception 'stock return relationship index missing';
  end if;
end
$$;

set role authenticated;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000201',false);
select set_config('request.jwt.claim.role','authenticated',false);

select * from public.record_stock_withdrawal(
  '97000000-0000-4000-8000-000000000701',
  '97000000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000400',
  '97000000-0000-4000-8000-000000000120',
  '97000000-0000-4000-8000-000000000110',
  6.000,
  '97000000-0000-4000-8000-000000000610',
  'Retirada origem da devolução CI'
);

select * from public.record_stock_entry(
  '97000000-0000-4000-8000-000000000702',
  '97000000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000400',
  '97000000-0000-4000-8000-000000000120',
  4.000,
  20.00,
  'RET-LATER',
  '2031-01-01',
  'Entrada posterior para alterar custo médio'
);

select * from public.record_stock_return(
  '97000000-0000-4000-8000-000000000703',
  '97000000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000701',
  2.000,
  'Retorno parcial CI'
);

select * from public.record_stock_return(
  '97000000-0000-4000-8000-000000000703',
  '97000000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000701',
  2.000,
  'Retorno parcial CI'
);

do $$
begin
  begin
    perform public.record_stock_return(
      '97000000-0000-4000-8000-000000000703',
      '97000000-0000-4000-8000-000000000001',
      '97000000-0000-4000-8000-000000000701',
      1.000,
      'Retorno parcial CI'
    );
    raise exception 'return idempotency conflict unexpectedly succeeded';
  exception when unique_violation then null;
  end;
end
$$;

reset role;

do $$
begin
  if (select movement_type from public.stock_movements where id='97000000-0000-4000-8000-000000000701') <> 'withdrawal' then
    raise exception 'original withdrawal was mutated';
  end if;
  if (select sector_id from public.stock_movements where id='97000000-0000-4000-8000-000000000701') <> '97000000-0000-4000-8000-000000000110' then
    raise exception 'original withdrawal lost its sector';
  end if;
  if (select status from public.stock_movements where id='97000000-0000-4000-8000-000000000701') <> 'confirmed' then
    raise exception 'original withdrawal status was mutated';
  end if;
  if (select movement_type from public.stock_movements where id='97000000-0000-4000-8000-000000000703') <> 'return_in' then
    raise exception 'partial return did not create return_in';
  end if;
  if (select reversal_of_movement_id from public.stock_movements where id='97000000-0000-4000-8000-000000000703')
       <> '97000000-0000-4000-8000-000000000701' then
    raise exception 'partial return is not related to original withdrawal';
  end if;
  if (select destination_location_id from public.stock_movements where id='97000000-0000-4000-8000-000000000703')
       <> '97000000-0000-4000-8000-000000000120' then
    raise exception 'return did not restore the withdrawal origin location';
  end if;
  if (select reason_code from public.stock_movements where id='97000000-0000-4000-8000-000000000703') <> 'withdrawal_return' then
    raise exception 'return reason code missing';
  end if;
  if (select unit_cost_snapshot from public.stock_movement_items where movement_id='97000000-0000-4000-8000-000000000703') <> 10.00 then
    raise exception 'return did not preserve withdrawal cost snapshot';
  end if;
  if (select quantity_on_hand from public.inventory_balances
      where organization_id='97000000-0000-4000-8000-000000000001'
        and stock_item_id='97000000-0000-4000-8000-000000000400'
        and stock_location_id='97000000-0000-4000-8000-000000000120') <> 10.000 then
    raise exception 'partial return produced wrong projected balance';
  end if;
  if (select average_cost from public.inventory_balances
      where organization_id='97000000-0000-4000-8000-000000000001'
        and stock_item_id='97000000-0000-4000-8000-000000000400'
        and stock_location_id='97000000-0000-4000-8000-000000000120') <> 14.00 then
    raise exception 'partial return did not blend historical cost into moving average';
  end if;
  if (select remaining_quantity from public.inventory_batches where id='97000000-0000-4000-8000-000000000610') <> 6.000 then
    raise exception 'partial return did not restore original physical batch';
  end if;
  if exists (
    select 1
    from public.stock_movement_batch_allocations allocation
    join public.stock_movement_items item on item.id=allocation.movement_item_id
    where item.movement_id='97000000-0000-4000-8000-000000000703'
      and allocation.batch_id <> '97000000-0000-4000-8000-000000000610'
  ) then
    raise exception 'return fabricated or restored a batch outside withdrawal lineage';
  end if;
  if (select count(*) from public.audit_logs where entity_id='97000000-0000-4000-8000-000000000703' and action='stock_return.recorded') <> 1 then
    raise exception 'return retry duplicated or missed audit';
  end if;
end
$$;

set role authenticated;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000201',false);
select set_config('request.jwt.claim.role','authenticated',false);

select * from public.record_stock_return(
  '97000000-0000-4000-8000-000000000704',
  '97000000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000701',
  4.000,
  'Retorno final CI'
);

do $$
begin
  begin
    perform public.record_stock_return(
      '97000000-0000-4000-8000-000000000705',
      '97000000-0000-4000-8000-000000000001',
      '97000000-0000-4000-8000-000000000701',
      0.001,
      'Over-return denied'
    );
    raise exception 'over-return unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;
end
$$;
reset role;

do $$
begin
  if (select count(*) from public.stock_movements
      where organization_id='97000000-0000-4000-8000-000000000001'
        and movement_type='return_in'
        and reversal_of_movement_id='97000000-0000-4000-8000-000000000701') <> 2 then
    raise exception 'multiple partial returns were not preserved as distinct ledger movements';
  end if;
  if (select coalesce(sum(item.quantity),0)
      from public.stock_movements movement
      join public.stock_movement_items item
        on item.movement_id=movement.id and item.organization_id=movement.organization_id
      where movement.organization_id='97000000-0000-4000-8000-000000000001'
        and movement.movement_type='return_in'
        and movement.status='confirmed'
        and movement.reversal_of_movement_id='97000000-0000-4000-8000-000000000701') <> 6.000 then
    raise exception 'cumulative returned quantity is wrong';
  end if;
  if (select remaining_quantity from public.inventory_batches where id='97000000-0000-4000-8000-000000000610') <> 10.000 then
    raise exception 'full return did not fully restore original batch quantity';
  end if;
  if exists(select 1 from public.stock_movements where id='97000000-0000-4000-8000-000000000705') then
    raise exception 'failed over-return left movement residue';
  end if;
  if exists(select 1 from public.audit_logs where entity_id='97000000-0000-4000-8000-000000000705') then
    raise exception 'failed over-return left audit residue';
  end if;
end
$$;

set role authenticated;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000202',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  begin
    perform public.record_stock_return(
      '97000000-0000-4000-8000-000000000706',
      '97000000-0000-4000-8000-000000000001',
      '97000000-0000-4000-8000-000000000701',
      1.000,
      'Scope denied'
    );
    raise exception 'out-of-scope return unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end
$$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000203',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  begin
    perform public.record_stock_return(
      '97000000-0000-4000-8000-000000000707',
      '97000000-0000-4000-8000-000000000001',
      '97000000-0000-4000-8000-000000000701',
      1.000,
      'Viewer denied'
    );
    raise exception 'viewer return unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end
$$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000204',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  begin
    perform public.record_stock_return(
      '97000000-0000-4000-8000-000000000708',
      '97000000-0000-4000-8000-000000000002',
      '97000000-0000-4000-8000-000000000701',
      1.000,
      'Cross Organization denied'
    );
    raise exception 'cross-Organization return unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;
end
$$;
reset role;

set role anon;
do $$
begin
  begin
    perform public.record_stock_return(
      '97000000-0000-4000-8000-000000000709',
      '97000000-0000-4000-8000-000000000001',
      '97000000-0000-4000-8000-000000000701',
      1.000,
      'Anon denied'
    );
    raise exception 'anonymous return unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end
$$;
reset role;

select 'stock return tests passed' as result;

rollback;
