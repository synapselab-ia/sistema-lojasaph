\set ON_ERROR_STOP on

create extension if not exists dblink;

insert into public.organizations(id,name,timezone,currency) values
 ('98300000-0000-4000-8000-000000000001','Empréstimos CI','America/Sao_Paulo','BRL'),
 ('98300000-0000-4000-8000-000000000002','Outra organização empréstimos CI','America/Sao_Paulo','BRL');

insert into public.businesses(id,organization_id,name,code) values
 ('98300000-0000-4000-8000-000000000010','98300000-0000-4000-8000-000000000001','Negócio empréstimos CI','loan-main');

insert into public.units(id,organization_id,business_id,name,code) values
 ('98300000-0000-4000-8000-000000000100','98300000-0000-4000-8000-000000000001','98300000-0000-4000-8000-000000000010','Unidade A empréstimos CI','LOAN-A'),
 ('98300000-0000-4000-8000-000000000101','98300000-0000-4000-8000-000000000001','98300000-0000-4000-8000-000000000010','Unidade B empréstimos CI','LOAN-B');

insert into public.stock_locations(id,organization_id,unit_id,name,code,location_type,status) values
 ('98300000-0000-4000-8000-000000000120','98300000-0000-4000-8000-000000000001','98300000-0000-4000-8000-000000000100','Estoque A empréstimos CI','LOAN-LOC-A','warehouse','active'),
 ('98300000-0000-4000-8000-000000000121','98300000-0000-4000-8000-000000000001','98300000-0000-4000-8000-000000000101','Estoque B empréstimos CI','LOAN-LOC-B','warehouse','active');

insert into public.units_of_measure(id,organization_id,code,name,decimal_scale,active)
values ('98300000-0000-4000-8000-000000000300','98300000-0000-4000-8000-000000000001','UN','Unidade',3,true);

insert into public.item_categories(id,organization_id,name,code)
values ('98300000-0000-4000-8000-000000000350','98300000-0000-4000-8000-000000000001','Categoria empréstimos CI','loan-fixture');

insert into public.stock_items(
  id,organization_id,category_id,base_unit_id,name,item_type,active,
  track_expiration,track_batch,is_returnable
) values (
 '98300000-0000-4000-8000-000000000400',
 '98300000-0000-4000-8000-000000000001',
 '98300000-0000-4000-8000-000000000350',
 '98300000-0000-4000-8000-000000000300',
 'Item rastreado empréstimos CI','consumable',true,true,true,true
);

insert into public.inventory_balances(
  organization_id,stock_item_id,stock_location_id,quantity_on_hand,average_cost
) values (
 '98300000-0000-4000-8000-000000000001',
 '98300000-0000-4000-8000-000000000400',
 '98300000-0000-4000-8000-000000000120',8.000,3.13
);

insert into public.inventory_batches(
  id,organization_id,stock_item_id,stock_location_id,batch_code,expiration_date,
  received_at,original_quantity,remaining_quantity,unit_cost,source_type,status
) values
 ('98300000-0000-4000-8000-000000000610','98300000-0000-4000-8000-000000000001','98300000-0000-4000-8000-000000000400','98300000-0000-4000-8000-000000000120','LOAN-5','2026-10-01','2026-09-01T10:00:00Z',3.000,3.000,5.00,'opening_balance','active'),
 ('98300000-0000-4000-8000-000000000611','98300000-0000-4000-8000-000000000001','98300000-0000-4000-8000-000000000400','98300000-0000-4000-8000-000000000120','LOAN-2','2026-12-01','2026-09-01T10:01:00Z',5.000,5.000,2.00,'opening_balance','active');

insert into auth.users(id,email) values
 ('98300000-0000-4000-8000-000000000201','loan-org-inventory@example.invalid'),
 ('98300000-0000-4000-8000-000000000202','loan-scoped-inventory@example.invalid'),
 ('98300000-0000-4000-8000-000000000203','loan-viewer@example.invalid'),
 ('98300000-0000-4000-8000-000000000204','loan-other-org@example.invalid');

insert into public.organization_memberships(organization_id,user_id,role,unit_id,active) values
 ('98300000-0000-4000-8000-000000000001','98300000-0000-4000-8000-000000000201','inventory',null,true),
 ('98300000-0000-4000-8000-000000000001','98300000-0000-4000-8000-000000000202','inventory','98300000-0000-4000-8000-000000000100',true),
 ('98300000-0000-4000-8000-000000000001','98300000-0000-4000-8000-000000000203','viewer','98300000-0000-4000-8000-000000000100',true),
 ('98300000-0000-4000-8000-000000000002','98300000-0000-4000-8000-000000000204','inventory',null,true);

do $$
begin
  if not has_function_privilege(
    'authenticated',
    'public.record_stock_loan(uuid,uuid,uuid,uuid,text,numeric,uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated cannot execute stock loan command';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.record_stock_loan_restitution(uuid,uuid,uuid,numeric,numeric,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated cannot execute stock loan restitution command';
  end if;
  if has_function_privilege(
    'anon',
    'public.record_stock_loan(uuid,uuid,uuid,uuid,text,numeric,uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'anon unexpectedly executes stock loan command';
  end if;
  if has_function_privilege(
    'anon',
    'public.record_stock_loan_restitution(uuid,uuid,uuid,numeric,numeric,text)',
    'EXECUTE'
  ) then
    raise exception 'anon unexpectedly executes stock loan restitution command';
  end if;
  if has_table_privilege('anon','public.stock_loans','SELECT') then
    raise exception 'anon unexpectedly reads stock loans';
  end if;
  if not has_table_privilege('authenticated','public.stock_loans','SELECT') then
    raise exception 'authenticated cannot read visible stock loans';
  end if;
  if has_table_privilege('authenticated','public.stock_loans','INSERT')
     or has_table_privilege('authenticated','public.stock_loans','UPDATE')
     or has_table_privilege('authenticated','public.stock_loan_restitutions','INSERT')
  then
    raise exception 'authenticated received direct stock loan write privileges';
  end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','98300000-0000-4000-8000-000000000201',false);
select set_config('request.jwt.claim.role','authenticated',false);

select * from public.record_stock_loan(
 '98300000-0000-4000-8000-000000000701',
 '98300000-0000-4000-8000-000000000001',
 '98300000-0000-4000-8000-000000000400',
 '98300000-0000-4000-8000-000000000120',
 'Restaurante parceiro',
 5.000,
 null,
 'CI multi-layer loan'
);

-- Retry with the exact semantic payload must be idempotent.
select * from public.record_stock_loan(
 '98300000-0000-4000-8000-000000000701',
 '98300000-0000-4000-8000-000000000001',
 '98300000-0000-4000-8000-000000000400',
 '98300000-0000-4000-8000-000000000120',
 'Restaurante parceiro',
 5.000,
 null,
 'CI multi-layer loan'
);

do $$
begin
  begin
    perform public.record_stock_loan(
      '98300000-0000-4000-8000-000000000701',
      '98300000-0000-4000-8000-000000000001',
      '98300000-0000-4000-8000-000000000400',
      '98300000-0000-4000-8000-000000000120',
      'Restaurante parceiro',
      4.000,
      null,
      'CI multi-layer loan'
    );
    raise exception 'loan idempotency conflict unexpectedly succeeded';
  exception when unique_violation then null;
  end;
end $$;

reset role;

do $$
begin
  if (select count(*) from public.stock_loans where id='98300000-0000-4000-8000-000000000701') <> 1 then
    raise exception 'loan retry duplicated loan';
  end if;
  if (select movement_type from public.stock_movements where id='98300000-0000-4000-8000-000000000701') <> 'loan_out' then
    raise exception 'loan did not create loan_out movement';
  end if;
  if (select original_value from public.stock_loans where id='98300000-0000-4000-8000-000000000701') <> 19.00 then
    raise exception 'loan did not preserve 3x5 + 2x2 = 19 physical-layer value';
  end if;
  if (select remaining_physical_quantity from public.stock_loans where id='98300000-0000-4000-8000-000000000701') <> 5.000 then
    raise exception 'loan physical opening balance mismatch';
  end if;
  if (select remaining_value from public.stock_loans where id='98300000-0000-4000-8000-000000000701') <> 19.00 then
    raise exception 'loan monetary opening balance mismatch';
  end if;
  if (select quantity_on_hand from public.inventory_balances where organization_id='98300000-0000-4000-8000-000000000001' and stock_item_id='98300000-0000-4000-8000-000000000400' and stock_location_id='98300000-0000-4000-8000-000000000120') <> 3.000 then
    raise exception 'loan stock outflow balance mismatch';
  end if;
  if (select remaining_quantity from public.inventory_batches where id='98300000-0000-4000-8000-000000000610') <> 0 then
    raise exception 'loan FEFO did not consume the earliest layer';
  end if;
  if (select remaining_quantity from public.inventory_batches where id='98300000-0000-4000-8000-000000000611') <> 3.000 then
    raise exception 'loan FEFO second layer quantity mismatch';
  end if;
  if (select coalesce(sum(a.total_cost_snapshot),0) from public.stock_movement_batch_allocations a join public.stock_movement_items i on i.id=a.movement_item_id where i.movement_id='98300000-0000-4000-8000-000000000701') <> 19.00 then
    raise exception 'loan movement allocation value mismatch';
  end if;
  if (select count(*) from public.audit_logs where entity_type='stock_loan' and entity_id='98300000-0000-4000-8000-000000000701' and action='stock_loan.created') <> 1 then
    raise exception 'loan creation audit missing or duplicated';
  end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','98300000-0000-4000-8000-000000000201',false);
select set_config('request.jwt.claim.role','authenticated',false);

-- Combination: one unit physically returned from the R$5 layer plus R$4 in value.
select * from public.record_stock_loan_restitution(
 '98300000-0000-4000-8000-000000000711',
 '98300000-0000-4000-8000-000000000001',
 '98300000-0000-4000-8000-000000000701',
 1.000,
 4.00,
 'CI combined restitution'
);

-- Same restitution retry is idempotent.
select * from public.record_stock_loan_restitution(
 '98300000-0000-4000-8000-000000000711',
 '98300000-0000-4000-8000-000000000001',
 '98300000-0000-4000-8000-000000000701',
 1.000,
 4.00,
 'CI combined restitution'
);

do $$
begin
  begin
    perform public.record_stock_loan_restitution(
      '98300000-0000-4000-8000-000000000711',
      '98300000-0000-4000-8000-000000000001',
      '98300000-0000-4000-8000-000000000701',
      1.000,
      3.00,
      'CI combined restitution'
    );
    raise exception 'restitution idempotency conflict unexpectedly succeeded';
  exception when unique_violation then null;
  end;
end $$;

reset role;

do $$
begin
  if (select physical_value from public.stock_loan_restitutions where id='98300000-0000-4000-8000-000000000711') <> 5.00 then
    raise exception 'physical restitution did not preserve original layer value';
  end if;
  if (select remaining_physical_quantity from public.stock_loans where id='98300000-0000-4000-8000-000000000701') <> 4.000 then
    raise exception 'partial physical balance mismatch';
  end if;
  if (select remaining_value from public.stock_loans where id='98300000-0000-4000-8000-000000000701') <> 10.00 then
    raise exception 'combined remaining value should be 19 - 5 - 4 = 10';
  end if;
  if (select status from public.stock_loans where id='98300000-0000-4000-8000-000000000701') <> 'partial' then
    raise exception 'combined partial restitution status mismatch';
  end if;
  if (select movement_type from public.stock_movements where id='98300000-0000-4000-8000-000000000711') <> 'loan_return' then
    raise exception 'physical restitution did not create loan_return';
  end if;
  if (select remaining_quantity from public.inventory_batches where id='98300000-0000-4000-8000-000000000610') <> 1.000 then
    raise exception 'physical restitution did not restore original R$5 layer';
  end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','98300000-0000-4000-8000-000000000201',false);
select set_config('request.jwt.claim.role','authenticated',false);

-- Returning the other two R$5 units consumes the remaining R$10 obligation.
select * from public.record_stock_loan_restitution(
 '98300000-0000-4000-8000-000000000712',
 '98300000-0000-4000-8000-000000000001',
 '98300000-0000-4000-8000-000000000701',
 2.000,
 0,
 'CI settle remainder physically'
);

reset role;

do $$
begin
  if (select remaining_value from public.stock_loans where id='98300000-0000-4000-8000-000000000701') <> 0 then
    raise exception 'combined loan value not settled';
  end if;
  if (select remaining_physical_quantity from public.stock_loans where id='98300000-0000-4000-8000-000000000701') <> 2.000 then
    raise exception 'two monetarily compensated units should remain physically outside stock';
  end if;
  if (select status from public.stock_loans where id='98300000-0000-4000-8000-000000000701') <> 'settled' then
    raise exception 'combined loan did not settle';
  end if;
  if (select physical_returned_value from public.stock_loans where id='98300000-0000-4000-8000-000000000701') <> 15.00 then
    raise exception 'cumulative physical value mismatch';
  end if;
  if (select monetary_settled_amount from public.stock_loans where id='98300000-0000-4000-8000-000000000701') <> 4.00 then
    raise exception 'cumulative monetary settlement mismatch';
  end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','98300000-0000-4000-8000-000000000201',false);
select set_config('request.jwt.claim.role','authenticated',false);

do $$
begin
  begin
    perform public.record_stock_loan_restitution(
      '98300000-0000-4000-8000-000000000713',
      '98300000-0000-4000-8000-000000000001',
      '98300000-0000-4000-8000-000000000701',
      1.000,
      0,
      'must fail after settlement'
    );
    raise exception 'settled loan accepted an extra restitution';
  exception when invalid_parameter_value then null;
  end;
end $$;

-- New layer with an earlier expiration. Explicitly selecting the old R$2 batch
-- must prevail over FEFO for the next loan.
select * from public.record_stock_entry(
 '98300000-0000-4000-8000-000000000720',
 '98300000-0000-4000-8000-000000000001',
 '98300000-0000-4000-8000-000000000400',
 '98300000-0000-4000-8000-000000000120',
 2.000,
 7.00,
 'LOAN-7',
 '2026-09-20',
 'CI explicit layer setup'
);

select * from public.record_stock_loan(
 '98300000-0000-4000-8000-000000000702',
 '98300000-0000-4000-8000-000000000001',
 '98300000-0000-4000-8000-000000000400',
 '98300000-0000-4000-8000-000000000120',
 'Hotel parceiro',
 1.000,
 '98300000-0000-4000-8000-000000000611',
 'CI preferred layer loan'
);

reset role;

do $$
begin
  if (select original_value from public.stock_loans where id='98300000-0000-4000-8000-000000000702') <> 2.00 then
    raise exception 'explicit R$2 layer did not prevail over earlier-expiring R$7 layer';
  end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','98300000-0000-4000-8000-000000000201',false);
select set_config('request.jwt.claim.role','authenticated',false);

do $$
begin
  begin
    perform public.record_stock_loan_restitution(
      '98300000-0000-4000-8000-000000000721',
      '98300000-0000-4000-8000-000000000001',
      '98300000-0000-4000-8000-000000000702',
      2.000,
      0,
      'physical over-return must fail'
    );
    raise exception 'physical over-return unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.record_stock_loan_restitution(
      '98300000-0000-4000-8000-000000000722',
      '98300000-0000-4000-8000-000000000001',
      '98300000-0000-4000-8000-000000000702',
      0,
      3.00,
      'monetary over-settlement must fail'
    );
    raise exception 'monetary over-settlement unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;
end $$;

-- Monetary-only total settlement creates no stock movement.
select * from public.record_stock_loan_restitution(
 '98300000-0000-4000-8000-000000000723',
 '98300000-0000-4000-8000-000000000001',
 '98300000-0000-4000-8000-000000000702',
 0,
 2.00,
 'CI monetary total settlement'
);

-- Separate monetary partial -> total journey on the R$7 layer.
select * from public.record_stock_loan(
 '98300000-0000-4000-8000-000000000703',
 '98300000-0000-4000-8000-000000000001',
 '98300000-0000-4000-8000-000000000400',
 '98300000-0000-4000-8000-000000000120',
 'Quiosque parceiro',
 1.000,
 null,
 'CI monetary partial loan'
);

select * from public.record_stock_loan_restitution(
 '98300000-0000-4000-8000-000000000724',
 '98300000-0000-4000-8000-000000000001',
 '98300000-0000-4000-8000-000000000703',
 0,
 3.00,
 'CI monetary partial'
);

reset role;

do $$
begin
  if exists(select 1 from public.stock_movements where id='98300000-0000-4000-8000-000000000723') then
    raise exception 'monetary-only restitution created fictitious stock movement';
  end if;
  if (select status from public.stock_loans where id='98300000-0000-4000-8000-000000000702') <> 'settled' then
    raise exception 'monetary total settlement did not settle loan';
  end if;
  if (select remaining_physical_quantity from public.stock_loans where id='98300000-0000-4000-8000-000000000702') <> 1.000 then
    raise exception 'monetary settlement should not fabricate physical return';
  end if;
  if (select original_value from public.stock_loans where id='98300000-0000-4000-8000-000000000703') <> 7.00 then
    raise exception 'FEFO did not select earlier R$7 layer';
  end if;
  if (select remaining_value from public.stock_loans where id='98300000-0000-4000-8000-000000000703') <> 4.00 then
    raise exception 'monetary partial remaining value mismatch';
  end if;
  if (select status from public.stock_loans where id='98300000-0000-4000-8000-000000000703') <> 'partial' then
    raise exception 'monetary partial status mismatch';
  end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','98300000-0000-4000-8000-000000000201',false);
select set_config('request.jwt.claim.role','authenticated',false);

select * from public.record_stock_loan_restitution(
 '98300000-0000-4000-8000-000000000725',
 '98300000-0000-4000-8000-000000000001',
 '98300000-0000-4000-8000-000000000703',
 0,
 4.00,
 'CI monetary total after partial'
);

-- Physical full return on another one-unit loan.
select * from public.record_stock_loan(
 '98300000-0000-4000-8000-000000000704',
 '98300000-0000-4000-8000-000000000001',
 '98300000-0000-4000-8000-000000000400',
 '98300000-0000-4000-8000-000000000120',
 'Evento parceiro',
 1.000,
 null,
 'CI physical full loan'
);
select * from public.record_stock_loan_restitution(
 '98300000-0000-4000-8000-000000000726',
 '98300000-0000-4000-8000-000000000001',
 '98300000-0000-4000-8000-000000000704',
 1.000,
 0,
 'CI physical full return'
);

-- Future high-cost receipt must not reprice historical loans.
select * from public.record_stock_entry(
 '98300000-0000-4000-8000-000000000727',
 '98300000-0000-4000-8000-000000000001',
 '98300000-0000-4000-8000-000000000400',
 '98300000-0000-4000-8000-000000000120',
 1.000,
 99.00,
 'LOAN-99',
 '2027-12-31',
 'CI future expensive receipt'
);

reset role;

do $$
begin
  if (select status from public.stock_loans where id='98300000-0000-4000-8000-000000000703') <> 'settled' then
    raise exception 'monetary partial then total did not settle';
  end if;
  if (select remaining_value from public.stock_loans where id='98300000-0000-4000-8000-000000000703') <> 0 then
    raise exception 'monetary partial then total left value';
  end if;
  if (select status from public.stock_loans where id='98300000-0000-4000-8000-000000000704') <> 'settled' then
    raise exception 'full physical return did not settle loan';
  end if;
  if (select remaining_physical_quantity from public.stock_loans where id='98300000-0000-4000-8000-000000000704') <> 0 then
    raise exception 'full physical return left quantity';
  end if;
  if (select original_value from public.stock_loans where id='98300000-0000-4000-8000-000000000701') <> 19.00 then
    raise exception 'future receipt repriced historical loan';
  end if;
  if (select count(*) from public.audit_logs where action='stock_loan.restitution_recorded' and metadata->>'monetary_boundary'='loan_only_no_cash_or_finance_posting') < 6 then
    raise exception 'stock loan restitution audit trail incomplete';
  end if;
end $$;

-- Permission and scope boundaries.
set role authenticated;
select set_config('request.jwt.claim.sub','98300000-0000-4000-8000-000000000203',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  begin
    perform public.record_stock_loan(
      '98300000-0000-4000-8000-000000000730',
      '98300000-0000-4000-8000-000000000001',
      '98300000-0000-4000-8000-000000000400',
      '98300000-0000-4000-8000-000000000120',
      'Viewer denied',1,null,null
    );
    raise exception 'viewer unexpectedly created stock loan';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','98300000-0000-4000-8000-000000000202',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  begin
    perform public.record_stock_loan(
      '98300000-0000-4000-8000-000000000731',
      '98300000-0000-4000-8000-000000000001',
      '98300000-0000-4000-8000-000000000400',
      '98300000-0000-4000-8000-000000000121',
      'Outside scope',1,null,null
    );
    raise exception 'unit-scoped inventory unexpectedly used another unit location';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','98300000-0000-4000-8000-000000000204',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  if (select count(*) from public.stock_loans) <> 0 then
    raise exception 'other Organization can read stock loans';
  end if;
  begin
    perform public.record_stock_loan_restitution(
      '98300000-0000-4000-8000-000000000732',
      '98300000-0000-4000-8000-000000000001',
      '98300000-0000-4000-8000-000000000701',
      0,1.00,null
    );
    raise exception 'other Organization unexpectedly settled stock loan';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Real concurrent settlement: session A locks the loan, waits, settles R$6;
-- session B starts while A owns the row lock and must re-read the remaining R$4.
set role authenticated;
select set_config('request.jwt.claim.sub','98300000-0000-4000-8000-000000000201',false);
select set_config('request.jwt.claim.role','authenticated',false);
select * from public.record_stock_entry(
 '98300000-0000-4000-8000-000000000740',
 '98300000-0000-4000-8000-000000000001',
 '98300000-0000-4000-8000-000000000400',
 '98300000-0000-4000-8000-000000000120',
 1.000,10.00,'LOAN-10','2028-12-31','CI concurrency layer'
);
select * from public.record_stock_loan(
 '98300000-0000-4000-8000-000000000705',
 '98300000-0000-4000-8000-000000000001',
 '98300000-0000-4000-8000-000000000400',
 '98300000-0000-4000-8000-000000000120',
 'Concorrência parceiro',1.000,
 (select id from public.inventory_batches where organization_id='98300000-0000-4000-8000-000000000001' and source_reference_id='98300000-0000-4000-8000-000000000740'),
 'CI concurrency loan'
);
reset role;

create or replace function public.__test_stock_loan_settle_with_delay(
  p_command_id uuid,
  p_loan_id uuid,
  p_delay numeric
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1
  from public.stock_loans loan
  where loan.id = p_loan_id
    and loan.organization_id = '98300000-0000-4000-8000-000000000001'
  for update;
  perform pg_catalog.pg_sleep(p_delay);
  perform public.record_stock_loan_restitution(
    p_command_id,
    '98300000-0000-4000-8000-000000000001',
    p_loan_id,
    0,
    6.00,
    'CI concurrent monetary settlement'
  );
  return 'ok';
end;
$$;
revoke all on function public.__test_stock_loan_settle_with_delay(uuid,uuid,numeric) from public, anon, authenticated;
grant execute on function public.__test_stock_loan_settle_with_delay(uuid,uuid,numeric) to authenticated;

select dblink_connect('loan_c1','host=127.0.0.1 port=5432 dbname=lojasaph user=postgres password=postgres');
select dblink_connect('loan_c2','host=127.0.0.1 port=5432 dbname=lojasaph user=postgres password=postgres');
select dblink_exec('loan_c1','set role authenticated');
select dblink_exec('loan_c2','set role authenticated');
select dblink_exec('loan_c1',$q$set request.jwt.claim.sub = '98300000-0000-4000-8000-000000000201'$q$);
select dblink_exec('loan_c2',$q$set request.jwt.claim.sub = '98300000-0000-4000-8000-000000000201'$q$);
select dblink_exec('loan_c1',$q$set request.jwt.claim.role = 'authenticated'$q$);
select dblink_exec('loan_c2',$q$set request.jwt.claim.role = 'authenticated'$q$);

select dblink_send_query(
  'loan_c1',
  $q$select public.__test_stock_loan_settle_with_delay(
    '98300000-0000-4000-8000-000000000741',
    '98300000-0000-4000-8000-000000000705',
    0.6
  ) as result$q$
);
select pg_sleep(0.1);
select dblink_send_query(
  'loan_c2',
  $q$select public.__test_stock_loan_settle_with_delay(
    '98300000-0000-4000-8000-000000000742',
    '98300000-0000-4000-8000-000000000705',
    0
  ) as result$q$
);

select * from dblink_get_result('loan_c1', true) as t(result text);
select * from dblink_get_result('loan_c2', false) as t(result text);
select dblink_disconnect('loan_c1');
select dblink_disconnect('loan_c2');

drop function public.__test_stock_loan_settle_with_delay(uuid,uuid,numeric);

do $$
begin
  if (select monetary_settled_amount from public.stock_loans where id='98300000-0000-4000-8000-000000000705') <> 6.00 then
    raise exception 'concurrent settlement did not serialize to one accepted R$6 settlement';
  end if;
  if (select remaining_value from public.stock_loans where id='98300000-0000-4000-8000-000000000705') <> 4.00 then
    raise exception 'concurrent settlement remaining value mismatch';
  end if;
  if (select count(*) from public.stock_loan_restitutions where id in ('98300000-0000-4000-8000-000000000741','98300000-0000-4000-8000-000000000742')) <> 1 then
    raise exception 'concurrent settlement accepted more than one conflicting command';
  end if;
end $$;
