\set ON_ERROR_STOP on

begin;

-- Additional hierarchy used only inside this transactional suite.
insert into public.businesses(id,organization_id,name,code)
values ('94000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','Negócio isolado CI','scope-other-business');
insert into public.units(id,organization_id,business_id,name,code)
values ('94000000-0000-4000-8000-000000000100','00000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000010','Unidade isolada CI','scope-other-unit');
insert into public.stock_locations(id,organization_id,unit_id,sector_id,name,code,location_type)
values ('94000000-0000-4000-8000-000000000120','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000100','00000000-0000-4000-8000-000000000110','Estoque Cozinha CI','scope-cozinha','kitchen');

insert into auth.users(id,email) values
 ('94000000-0000-4000-8000-000000000001','scope-orgwide-inventory@example.invalid'),
 ('94000000-0000-4000-8000-000000000002','scope-business-inventory@example.invalid'),
 ('94000000-0000-4000-8000-000000000003','scope-unit-a-inventory@example.invalid'),
 ('94000000-0000-4000-8000-000000000004','scope-unit-b-inventory@example.invalid'),
 ('94000000-0000-4000-8000-000000000005','scope-multi-unit-inventory@example.invalid'),
 ('94000000-0000-4000-8000-000000000006','scope-sector-inventory@example.invalid'),
 ('94000000-0000-4000-8000-000000000007','scope-unit-c-inventory@example.invalid'),
 ('94000000-0000-4000-8000-000000000008','scope-unit-a-purchases@example.invalid'),
 ('94000000-0000-4000-8000-000000000009','scope-unit-a-finance@example.invalid'),
 ('94000000-0000-4000-8000-000000000010','scope-unit-a-manager@example.invalid'),
 ('94000000-0000-4000-8000-000000000011','scope-orgwide-manager@example.invalid'),
 ('94000000-0000-4000-8000-000000000012','scope-unit-a-viewer@example.invalid'),
 ('94000000-0000-4000-8000-000000000099','scope-invalid-hierarchy@example.invalid');

insert into public.organization_memberships(organization_id,user_id,role,business_id,unit_id,sector_id,active) values
 ('00000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000001','inventory',null,null,null,true),
 ('00000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000002','inventory','00000000-0000-4000-8000-000000000010',null,null,true),
 ('00000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000003','inventory',null,'00000000-0000-4000-8000-000000000100',null,true),
 ('00000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000004','inventory',null,'00000000-0000-4000-8000-000000000101',null,true),
 ('00000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000005','inventory',null,'00000000-0000-4000-8000-000000000100',null,true),
 ('00000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000005','inventory',null,'00000000-0000-4000-8000-000000000101',null,true),
 ('00000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000006','inventory',null,null,'00000000-0000-4000-8000-000000000110',true),
 ('00000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000007','inventory',null,'00000000-0000-4000-8000-000000000102',null,true),
 ('00000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000008','purchases',null,'00000000-0000-4000-8000-000000000100',null,true),
 ('00000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000009','finance',null,'00000000-0000-4000-8000-000000000100',null,true),
 ('00000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000010','manager',null,'00000000-0000-4000-8000-000000000100',null,true),
 ('00000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000011','manager',null,null,null,true),
 ('00000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000012','viewer',null,'00000000-0000-4000-8000-000000000100',null,true);

-- Hierarchy trigger must reject contradictory parent scopes.
do $$
begin
  begin
    insert into public.organization_memberships(organization_id,user_id,role,business_id,unit_id,active)
    values('00000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000099','inventory','94000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000100',true);
    raise exception 'business/unit hierarchy mismatch unexpectedly succeeded';
  exception when check_violation then null;
  end;

  begin
    insert into public.organization_memberships(organization_id,user_id,role,unit_id,sector_id,active)
    values('00000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000099','inventory','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000110',true);
    raise exception 'unit/sector hierarchy mismatch unexpectedly succeeded';
  exception when check_violation then null;
  end;
end $$;

-- Signed-in clients must not be able to bypass wrappers by calling private implementations.
do $$
begin
  if has_function_privilege('authenticated','private.record_stock_entry(uuid,uuid,uuid,uuid,numeric,numeric,text,date,text)','EXECUTE') then
    raise exception 'authenticated can execute private stock-entry implementation';
  end if;
  if has_function_privilege('authenticated','private.create_payable_document(uuid,uuid,uuid,uuid,uuid,text,text,text,text,date,text,jsonb)','EXECUTE') then
    raise exception 'authenticated can execute private finance implementation';
  end if;
  if has_function_privilege('authenticated','private.open_cash_session(uuid,uuid,uuid,date,integer,numeric,text)','EXECUTE') then
    raise exception 'authenticated can execute private cash implementation';
  end if;
end $$;

-- Organization-wide membership preserves current broad behavior.
set role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  if (select count(*) from public.units where organization_id='00000000-0000-4000-8000-000000000001') <> 4 then
    raise exception 'organization-wide member did not see all units';
  end if;
end $$;

insert into public.stock_items(organization_id,base_unit_id,name,internal_code,item_type)
values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000200','Orgwide temporary item','SCOPE-ORG-WIDE','supply');
reset role;

-- Business-scoped membership sees only children of the selected Business.
set role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000002',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  if (select count(*) from public.units where organization_id='00000000-0000-4000-8000-000000000001') <> 3 then
    raise exception 'business scope should expose exactly the three demo units';
  end if;
  if exists(select 1 from public.units where id='94000000-0000-4000-8000-000000000100') then
    raise exception 'business scope leaked a unit from another business';
  end if;
end $$;
reset role;

-- Unit A: own Unit and all of its sectors/locations, shared catalog reads, no Unit B mutation and no global catalog mutation.
set role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  if (select count(*) from public.units where organization_id='00000000-0000-4000-8000-000000000001') <> 1 then raise exception 'unit A member should see exactly one unit'; end if;
  if not exists(select 1 from public.units where id='00000000-0000-4000-8000-000000000100') then raise exception 'unit A member cannot see own unit'; end if;
  if (select count(*) from public.sectors where organization_id='00000000-0000-4000-8000-000000000001') <> 3 then raise exception 'unit A member should see all sectors in own unit'; end if;
  if (select count(*) from public.stock_locations where organization_id='00000000-0000-4000-8000-000000000001') <> 2 then raise exception 'unit A member should see unit-wide and sector-linked locations'; end if;
  if (select count(*) from public.stock_items where organization_id='00000000-0000-4000-8000-000000000001') < 3 then raise exception 'scoped member lost shared catalog read'; end if;

  begin
    insert into public.stock_items(organization_id,base_unit_id,name,internal_code,item_type)
    values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000200','Scoped forbidden item','SCOPE-DENIED','supply');
    raise exception 'scoped inventory unexpectedly mutated global catalog';
  exception when insufficient_privilege then null;
  end;

  perform public.record_stock_entry('94000000-0000-4000-8000-000000000300','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000120',1,20,null,null,'own unit entry');

  begin
    perform public.record_stock_entry('94000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000121',1,20,null,null,'other unit denied');
    raise exception 'unit A inventory wrote Unit B';
  exception when insufficient_privilege then
    if position('INSUFFICIENT_SCOPE' in sqlerrm)=0 then raise; end if;
  end;

  begin
    perform public.dispatch_stock_transfer('94000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000120','00000000-0000-4000-8000-000000000121',1,null,'requires both ends');
    raise exception 'single-unit membership dispatched cross-unit transfer';
  exception when insufficient_privilege then
    if position('INSUFFICIENT_SCOPE' in sqlerrm)=0 then raise; end if;
  end;

  begin
    perform public.start_inventory_count('94000000-0000-4000-8000-000000000303','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000121');
    raise exception 'unit A inventory started Unit B inventory count';
  exception when insufficient_privilege then
    if position('INSUFFICIENT_SCOPE' in sqlerrm)=0 then raise; end if;
  end;
end $$;
reset role;

-- Sector scope sees parent metadata and only explicitly sector-linked operational resources.
set role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000006',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  if (select count(*) from public.units where organization_id='00000000-0000-4000-8000-000000000001') <> 1 then raise exception 'sector member should see its parent unit'; end if;
  if (select count(*) from public.sectors where organization_id='00000000-0000-4000-8000-000000000001') <> 1 then raise exception 'sector member should see only own sector'; end if;
  if (select count(*) from public.stock_locations where organization_id='00000000-0000-4000-8000-000000000001') <> 1 then raise exception 'sector member should see only explicitly linked location'; end if;
  if not exists(select 1 from public.stock_locations where id='94000000-0000-4000-8000-000000000120') then raise exception 'sector-linked location not visible'; end if;
  if exists(select 1 from public.stock_locations where id='00000000-0000-4000-8000-000000000120') then raise exception 'sector membership leaked sectorless unit location'; end if;

  perform public.record_stock_entry('94000000-0000-4000-8000-000000000310','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000402','94000000-0000-4000-8000-000000000120',1,20,null,null,'sector entry');

  begin
    perform public.record_stock_entry('94000000-0000-4000-8000-000000000311','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000120',1,20,null,null,'sectorless denied');
    raise exception 'sector member wrote sectorless unit location';
  exception when insufficient_privilege then
    if position('INSUFFICIENT_SCOPE' in sqlerrm)=0 then raise; end if;
  end;
end $$;
reset role;

-- Multiple memberships are a union: A+B visible/operable, C hidden.
set role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000005',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  if (select count(*) from public.units where organization_id='00000000-0000-4000-8000-000000000001') <> 2 then raise exception 'multi-membership should expose exactly two units'; end if;
  if exists(select 1 from public.units where id='00000000-0000-4000-8000-000000000102') then raise exception 'multi-membership leaked Unit C'; end if;
end $$;
select * from public.dispatch_stock_transfer('94000000-0000-4000-8000-000000000320','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000120','00000000-0000-4000-8000-000000000121',1,null,'A to B authorized');
reset role;

-- Source and destination can read the transfer; unrelated Unit C cannot. Destination-only member can receive.
set role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$ begin if not exists(select 1 from public.stock_transfers where id='94000000-0000-4000-8000-000000000320') then raise exception 'source unit cannot read transfer'; end if; end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000004',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$ begin if not exists(select 1 from public.stock_transfers where id='94000000-0000-4000-8000-000000000320') then raise exception 'destination unit cannot read transfer'; end if; end $$;
select * from public.receive_stock_transfer('94000000-0000-4000-8000-000000000321','00000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000320',1);
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000007',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$ begin if exists(select 1 from public.stock_transfers where id='94000000-0000-4000-8000-000000000320') then raise exception 'unrelated unit can read transfer'; end if; end $$;
reset role;

-- Purchases command is scoped by receiving StockLocation.
set role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000008',false);
select set_config('request.jwt.claim.role','authenticated',false);
select * from public.create_purchase_order(
 '94000000-0000-4000-8000-000000000330','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000500','00000000-0000-4000-8000-000000000120',null,'Unit A purchase',
 jsonb_build_array(jsonb_build_object('supplier_item_id','00000000-0000-4000-8000-000000000520','quantity',1.000,'unit_price',2.10))
);
do $$
begin
  begin
    perform public.create_purchase_order(
      '94000000-0000-4000-8000-000000000331','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000500','00000000-0000-4000-8000-000000000121',null,'Unit B denied',
      jsonb_build_array(jsonb_build_object('supplier_item_id','00000000-0000-4000-8000-000000000520','quantity',1.000,'unit_price',2.10))
    );
    raise exception 'unit A purchases created Unit B order';
  exception when insufficient_privilege then if position('INSUFFICIENT_SCOPE' in sqlerrm)=0 then raise; end if; end;
end $$;
reset role;

-- Finance command is scoped by Unit/Sector target.
set role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000009',false);
select set_config('request.jwt.claim.role','authenticated',false);
select * from public.create_payable_document(
 '94000000-0000-4000-8000-000000000340','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000100',null,'00000000-0000-4000-8000-000000000500','supplier_document','SCOPE-A','1',null,'2026-08-18','Unit A payable',
 jsonb_build_array(jsonb_build_object('number',1,'count',1,'amount',100.00,'due_date','2026-08-25'))
);
do $$
begin
  begin
    perform public.create_payable_document(
      '94000000-0000-4000-8000-000000000341','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101',null,'00000000-0000-4000-8000-000000000500','supplier_document','SCOPE-B','1',null,'2026-08-18','Unit B denied',
      jsonb_build_array(jsonb_build_object('number',1,'count',1,'amount',100.00,'due_date','2026-08-25'))
    );
    raise exception 'unit A finance created Unit B payable';
  exception when insufficient_privilege then if position('INSUFFICIENT_SCOPE' in sqlerrm)=0 then raise; end if; end;
end $$;
reset role;

-- Unit-scoped manager can configure its cash register, but global payment-method config requires org-wide scope.
set role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000010',false);
select set_config('request.jwt.claim.role','authenticated',false);
select * from public.create_cash_register('94000000-0000-4000-8000-000000000350','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000100','Caixa Unit A scoped','scope-cash-a');
do $$
begin
  begin
    perform public.create_cash_register('94000000-0000-4000-8000-000000000351','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000101','Caixa Unit B denied','scope-cash-b');
    raise exception 'unit A manager created Unit B register';
  exception when insufficient_privilege then if position('INSUFFICIENT_SCOPE' in sqlerrm)=0 then raise; end if; end;

  begin
    perform public.create_payment_method('94000000-0000-4000-8000-000000000352','00000000-0000-4000-8000-000000000001','scope-card-denied','Card scoped denied','card',false);
    raise exception 'scoped manager changed Organization-wide payment methods';
  exception when insufficient_privilege then if position('INSUFFICIENT_SCOPE' in sqlerrm)=0 then raise; end if; end;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000011',false);
select set_config('request.jwt.claim.role','authenticated',false);
select * from public.create_payment_method('94000000-0000-4000-8000-000000000353','00000000-0000-4000-8000-000000000001','scope-card-orgwide','Card orgwide allowed','card',false);
reset role;

-- Viewer remains read-only even inside an allowed Unit.
set role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000012',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  if not exists(select 1 from public.units where id='00000000-0000-4000-8000-000000000100') then raise exception 'unit-scoped viewer cannot read own unit'; end if;
  begin
    perform public.record_stock_entry('94000000-0000-4000-8000-000000000360','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000120',1,20,null,null,'viewer denied');
    raise exception 'viewer unexpectedly executed stock command';
  exception when insufficient_privilege then if position('INSUFFICIENT_ROLE' in sqlerrm)=0 then raise; end if; end;
end $$;
reset role;

rollback;
select 'scoped permission tests passed' as result;
