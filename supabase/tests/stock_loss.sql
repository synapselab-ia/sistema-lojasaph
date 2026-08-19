\set ON_ERROR_STOP on

begin;

insert into public.organizations(id,name,timezone,currency)
values
 ('96000000-0000-4000-8000-000000000001','Perdas CI','America/Sao_Paulo','BRL'),
 ('96000000-0000-4000-8000-000000000002','Outra organização perdas CI','America/Sao_Paulo','BRL');

insert into public.businesses(id,organization_id,name,code) values
 ('96000000-0000-4000-8000-000000000010','96000000-0000-4000-8000-000000000001','Negócio perdas CI','loss-main'),
 ('96000000-0000-4000-8000-000000000011','96000000-0000-4000-8000-000000000002','Outro negócio perdas CI','loss-other');

insert into public.units(id,organization_id,business_id,name,code) values
 ('96000000-0000-4000-8000-000000000100','96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000010','Unidade A perdas CI','LOSS-A'),
 ('96000000-0000-4000-8000-000000000101','96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000010','Unidade B perdas CI','LOSS-B'),
 ('96000000-0000-4000-8000-000000000102','96000000-0000-4000-8000-000000000002','96000000-0000-4000-8000-000000000011','Outra unidade perdas CI','LOSS-X');

insert into public.stock_locations(id,organization_id,unit_id,name,code,location_type,status) values
 ('96000000-0000-4000-8000-000000000120','96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000100','Estoque A perdas CI','LOSS-LOC-A','warehouse','active'),
 ('96000000-0000-4000-8000-000000000121','96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000101','Estoque B perdas CI','LOSS-LOC-B','warehouse','active');

insert into public.units_of_measure(id,organization_id,code,name,decimal_scale,active)
values ('96000000-0000-4000-8000-000000000300','96000000-0000-4000-8000-000000000001','UN','Unidade',3,true);

insert into public.stock_items(id,organization_id,base_unit_id,name,item_type,active,track_expiration,track_batch,is_returnable) values
 ('96000000-0000-4000-8000-000000000400','96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000300','Item rastreado perdas CI','consumable',true,true,true,false),
 ('96000000-0000-4000-8000-000000000401','96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000300','Item simples perdas CI','consumable',true,false,false,false);

insert into public.inventory_balances(organization_id,stock_item_id,stock_location_id,quantity_on_hand,average_cost) values
 ('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000400','96000000-0000-4000-8000-000000000120',10.000,5.00),
 ('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000401','96000000-0000-4000-8000-000000000120',2.000,7.00);

insert into public.inventory_batches(id,organization_id,stock_item_id,stock_location_id,batch_code,expiration_date,received_at,original_quantity,remaining_quantity,unit_cost,source_type,status) values
 ('96000000-0000-4000-8000-000000000610','96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000400','96000000-0000-4000-8000-000000000120','EXP-CI','2020-01-01','2026-01-01T00:00:00Z',4.000,4.000,3.00,'opening_balance','active'),
 ('96000000-0000-4000-8000-000000000611','96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000400','96000000-0000-4000-8000-000000000120','FUT-CI','2099-01-01','2026-01-02T00:00:00Z',6.000,6.000,4.00,'opening_balance','active');

insert into auth.users(id,email) values
 ('96000000-0000-4000-8000-000000000201','loss-org-inventory@example.invalid'),
 ('96000000-0000-4000-8000-000000000202','loss-unit-inventory@example.invalid'),
 ('96000000-0000-4000-8000-000000000203','loss-viewer@example.invalid'),
 ('96000000-0000-4000-8000-000000000204','loss-other-org@example.invalid');

insert into public.organization_memberships(organization_id,user_id,role,unit_id,active) values
 ('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000201','inventory',null,true),
 ('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000202','inventory','96000000-0000-4000-8000-000000000100',true),
 ('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000203','viewer','96000000-0000-4000-8000-000000000100',true),
 ('96000000-0000-4000-8000-000000000002','96000000-0000-4000-8000-000000000204','inventory','96000000-0000-4000-8000-000000000102',true);

-- Every Organization receives the conservative default catalog.
do $$
begin
  if (select count(*) from public.stock_loss_reasons where organization_id='96000000-0000-4000-8000-000000000001') <> 4 then
    raise exception 'default stock loss reasons were not seeded';
  end if;
  if not exists(select 1 from public.stock_loss_reasons where organization_id='96000000-0000-4000-8000-000000000001' and code='breakage' and movement_type='loss') then
    raise exception 'breakage reason mapping missing';
  end if;
  if not exists(select 1 from public.stock_loss_reasons where organization_id='96000000-0000-4000-8000-000000000001' and code='expiration' and movement_type='expiration') then
    raise exception 'expiration reason mapping missing';
  end if;
  if has_table_privilege('anon','public.stock_loss_reasons','SELECT') then
    raise exception 'anon unexpectedly reads stock loss reasons';
  end if;
  if has_table_privilege('authenticated','public.stock_loss_reasons','DELETE') then
    raise exception 'authenticated unexpectedly deletes stock loss reasons';
  end if;
end $$;

-- Organization-wide inventory can configure an additional structured reason.
set role authenticated;
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000201',false);
select set_config('request.jwt.claim.role','authenticated',false);
insert into public.stock_loss_reasons(organization_id,code,label,movement_type)
values('96000000-0000-4000-8000-000000000001','damage','Dano operacional','loss');
reset role;

-- Scoped inventory can read reasons but cannot mutate the Organization-wide catalog.
set role authenticated;
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000202',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  if (select count(*) from public.stock_loss_reasons where organization_id='96000000-0000-4000-8000-000000000001') <> 5 then
    raise exception 'scoped inventory could not read stock loss reasons';
  end if;
  begin
    insert into public.stock_loss_reasons(organization_id,code,label,movement_type)
    values('96000000-0000-4000-8000-000000000001','scoped_forbidden','Proibido','loss');
    raise exception 'scoped inventory configured a global loss reason';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Breakage is a loss movement, preserves average cost and uses FEFO.
select * from public.record_stock_loss(
 '96000000-0000-4000-8000-000000000701',
 '96000000-0000-4000-8000-000000000001',
 '96000000-0000-4000-8000-000000000400',
 '96000000-0000-4000-8000-000000000120',
 2.000,
 'breakage',
 null,
 'CI breakage'
);

-- Same semantic payload is retry-safe.
select * from public.record_stock_loss(
 '96000000-0000-4000-8000-000000000701',
 '96000000-0000-4000-8000-000000000001',
 '96000000-0000-4000-8000-000000000400',
 '96000000-0000-4000-8000-000000000120',
 2.000,
 'breakage',
 null,
 'CI breakage'
);

-- Reusing the key with another reason is a semantic conflict.
do $$
begin
  begin
    perform public.record_stock_loss(
      '96000000-0000-4000-8000-000000000701',
      '96000000-0000-4000-8000-000000000001',
      '96000000-0000-4000-8000-000000000400',
      '96000000-0000-4000-8000-000000000120',
      2.000,
      'loss',
      null,
      'CI breakage'
    );
    raise exception 'loss idempotency conflict unexpectedly succeeded';
  exception when unique_violation then null;
  end;
end $$;
reset role;

do $$
begin
  if (select movement_type from public.stock_movements where id='96000000-0000-4000-8000-000000000701') <> 'loss' then
    raise exception 'breakage did not create loss movement';
  end if;
  if (select reason_code from public.stock_movements where id='96000000-0000-4000-8000-000000000701') <> 'breakage' then
    raise exception 'structured loss reason not persisted';
  end if;
  if (select quantity_on_hand from public.inventory_balances where organization_id='96000000-0000-4000-8000-000000000001' and stock_item_id='96000000-0000-4000-8000-000000000400' and stock_location_id='96000000-0000-4000-8000-000000000120') <> 8.000 then
    raise exception 'breakage produced wrong projected balance';
  end if;
  if (select average_cost from public.inventory_balances where organization_id='96000000-0000-4000-8000-000000000001' and stock_item_id='96000000-0000-4000-8000-000000000400' and stock_location_id='96000000-0000-4000-8000-000000000120') <> 5.00 then
    raise exception 'breakage changed moving average cost';
  end if;
  if (select unit_cost_snapshot from public.stock_movement_items where movement_id='96000000-0000-4000-8000-000000000701') <> 5.00 then
    raise exception 'breakage did not preserve cost snapshot';
  end if;
  if (select remaining_quantity from public.inventory_batches where id='96000000-0000-4000-8000-000000000610') <> 2.000 then
    raise exception 'breakage did not consume FEFO batch';
  end if;
  if (select count(*) from public.audit_logs where entity_id='96000000-0000-4000-8000-000000000701' and action='stock_loss.recorded') <> 1 then
    raise exception 'loss retry duplicated or missed audit';
  end if;
end $$;

-- Expiration of a tracked item requires an explicit already-expired batch and cannot spill.
set role authenticated;
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000202',false);
select set_config('request.jwt.claim.role','authenticated',false);
select * from public.record_stock_loss(
 '96000000-0000-4000-8000-000000000702',
 '96000000-0000-4000-8000-000000000001',
 '96000000-0000-4000-8000-000000000400',
 '96000000-0000-4000-8000-000000000120',
 1.000,
 'expiration',
 '96000000-0000-4000-8000-000000000610',
 'CI expiration'
);

do $$
begin
  begin
    perform public.record_stock_loss(
      '96000000-0000-4000-8000-000000000703',
      '96000000-0000-4000-8000-000000000001',
      '96000000-0000-4000-8000-000000000400',
      '96000000-0000-4000-8000-000000000120',
      1.000,
      'expiration',
      '96000000-0000-4000-8000-000000000611',
      'future batch denied'
    );
    raise exception 'future batch expiration unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.record_stock_loss(
      '96000000-0000-4000-8000-000000000704',
      '96000000-0000-4000-8000-000000000001',
      '96000000-0000-4000-8000-000000000400',
      '96000000-0000-4000-8000-000000000120',
      1.000,
      'expiration',
      null,
      'missing batch denied'
    );
    raise exception 'tracked expiration without batch unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;

  -- Unit A inventory cannot touch Unit B.
  begin
    perform public.record_stock_loss(
      '96000000-0000-4000-8000-000000000705',
      '96000000-0000-4000-8000-000000000001',
      '96000000-0000-4000-8000-000000000401',
      '96000000-0000-4000-8000-000000000121',
      1.000,
      'loss',
      null,
      'scope denied'
    );
    raise exception 'out-of-scope stock loss unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

do $$
begin
  if (select movement_type from public.stock_movements where id='96000000-0000-4000-8000-000000000702') <> 'expiration' then
    raise exception 'expiration did not create expiration movement';
  end if;
  if (select remaining_quantity from public.inventory_batches where id='96000000-0000-4000-8000-000000000610') <> 1.000 then
    raise exception 'expiration did not consume selected expired batch';
  end if;
  if (select remaining_quantity from public.inventory_batches where id='96000000-0000-4000-8000-000000000611') <> 6.000 then
    raise exception 'expiration spilled into future batch';
  end if;
  if exists(select 1 from public.stock_movements where id in ('96000000-0000-4000-8000-000000000703','96000000-0000-4000-8000-000000000704','96000000-0000-4000-8000-000000000705')) then
    raise exception 'failed loss command left a movement behind';
  end if;
end $$;

-- Viewer and another Organization are denied by role boundary.
set role authenticated;
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000203',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  begin
    perform public.record_stock_loss(
      '96000000-0000-4000-8000-000000000706','96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000401','96000000-0000-4000-8000-000000000120',1.000,'loss',null,'viewer denied'
    );
    raise exception 'viewer stock loss unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000204',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  begin
    perform public.record_stock_loss(
      '96000000-0000-4000-8000-000000000707','96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000401','96000000-0000-4000-8000-000000000120',1.000,'loss',null,'cross org denied'
    );
    raise exception 'cross-Organization stock loss unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Existing negative-stock policy remains authoritative for untracked losses.
set role authenticated;
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000202',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  begin
    perform public.record_stock_loss(
      '96000000-0000-4000-8000-000000000708','96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000401','96000000-0000-4000-8000-000000000120',3.000,'damage',null,'negative denied'
    );
    raise exception 'negative stock loss unexpectedly succeeded without configuration';
  exception when invalid_parameter_value then null;
  end;
end $$;
reset role;

update public.stock_locations
set allow_negative_stock=true
where id='96000000-0000-4000-8000-000000000120' and organization_id='96000000-0000-4000-8000-000000000001';

set role authenticated;
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000202',false);
select set_config('request.jwt.claim.role','authenticated',false);
select * from public.record_stock_loss(
 '96000000-0000-4000-8000-000000000709','96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000401','96000000-0000-4000-8000-000000000120',3.000,'damage',null,'configured negative loss'
);
reset role;

do $$
begin
  if (select quantity_on_hand from public.inventory_balances where organization_id='96000000-0000-4000-8000-000000000001' and stock_item_id='96000000-0000-4000-8000-000000000401' and stock_location_id='96000000-0000-4000-8000-000000000120') <> -1.000 then
    raise exception 'configured negative loss produced wrong balance';
  end if;
  if (select reason_code from public.stock_movements where id='96000000-0000-4000-8000-000000000709') <> 'damage' then
    raise exception 'custom configured reason was not used';
  end if;
end $$;

-- Anonymous callers cannot execute the command.
set role anon;
do $$
begin
  begin
    perform public.record_stock_loss(
      '96000000-0000-4000-8000-000000000710','96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000401','96000000-0000-4000-8000-000000000120',1.000,'loss',null,'anon denied'
    );
    raise exception 'anonymous stock loss unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

rollback;

select 'stock loss tests passed' as result;
