\set ON_ERROR_STOP on

begin;

insert into auth.users(id,email) values
  ('99100000-0000-4000-8000-000000000201','minimum-composition-owner@example.invalid'),
  ('99100000-0000-4000-8000-000000000202','minimum-composition-inventory@example.invalid');

insert into public.organizations(id,name,timezone,currency) values
  ('99100000-0000-4000-8000-000000000001','Minimum Composition CI','America/Sao_Paulo','BRL');

insert into public.businesses(id,organization_id,name,code) values
  ('99100000-0000-4000-8000-000000000010','99100000-0000-4000-8000-000000000001','Business','MIN-COMP');

insert into public.units(id,organization_id,business_id,name,code) values
  ('99100000-0000-4000-8000-000000000020','99100000-0000-4000-8000-000000000001','99100000-0000-4000-8000-000000000010','Unit','MIN-COMP-U');

insert into public.sectors(id,organization_id,unit_id,name,code) values
  ('99100000-0000-4000-8000-000000000030','99100000-0000-4000-8000-000000000001','99100000-0000-4000-8000-000000000020','Sector','MIN-COMP-S');

insert into public.stock_locations(id,organization_id,unit_id,sector_id,name,code) values
  ('99100000-0000-4000-8000-000000000040','99100000-0000-4000-8000-000000000001','99100000-0000-4000-8000-000000000020','99100000-0000-4000-8000-000000000030','Location','MIN-COMP-L');

insert into public.units_of_measure(id,organization_id,code,name) values
  ('99100000-0000-4000-8000-000000000050','99100000-0000-4000-8000-000000000001','un','Unit');

insert into public.item_categories(id,organization_id,name,code) values
  ('99100000-0000-4000-8000-000000000060','99100000-0000-4000-8000-000000000001','Category','MIN-COMP-C');

insert into public.stock_items(id,organization_id,category_id,base_unit_id,name,internal_code,item_type) values
  ('99100000-0000-4000-8000-000000000070','99100000-0000-4000-8000-000000000001','99100000-0000-4000-8000-000000000060','99100000-0000-4000-8000-000000000050','Configured Item','MIN-COMP-I1','supply'),
  ('99100000-0000-4000-8000-000000000071','99100000-0000-4000-8000-000000000001','99100000-0000-4000-8000-000000000060','99100000-0000-4000-8000-000000000050','Blocked Item','MIN-COMP-I2','supply');

insert into public.organization_memberships(organization_id,user_id,role,active) values
  ('99100000-0000-4000-8000-000000000001','99100000-0000-4000-8000-000000000201','owner',true);

insert into public.organization_memberships(organization_id,user_id,role,sector_id,active) values
  ('99100000-0000-4000-8000-000000000001','99100000-0000-4000-8000-000000000202','inventory','99100000-0000-4000-8000-000000000030',true);

-- Default-enabled compatibility allows the existing configuration path.
set role authenticated;
select set_config('request.jwt.claim.sub','99100000-0000-4000-8000-000000000202',false);
select set_config('request.jwt.claim.role','authenticated',false);
insert into public.stock_minimum_policies(
  organization_id,stock_item_id,stock_location_id,minimum_quantity
) values (
  '99100000-0000-4000-8000-000000000001',
  '99100000-0000-4000-8000-000000000070',
  '99100000-0000-4000-8000-000000000040',
  5
);
reset role;

-- Owner disables stock-minimum through the compositor.
set role authenticated;
select set_config('request.jwt.claim.sub','99100000-0000-4000-8000-000000000201',false);
select set_config('request.jwt.claim.role','authenticated',false);
select public.set_organization_capability(
  '99100000-0000-4000-8000-000000000001',
  'stock-minimum',
  false
);
reset role;

-- The row remains physically stored, but the disabled product surface is hidden.
do $$
begin
  if (select count(*) from public.stock_minimum_policies where organization_id='99100000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'disabling stock-minimum deleted or duplicated persisted configuration';
  end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','99100000-0000-4000-8000-000000000202',false);
select set_config('request.jwt.claim.role','authenticated',false);

do $$
declare
  affected integer;
begin
  if (select count(*) from public.stock_minimum_policies) <> 0 then
    raise exception 'disabled stock-minimum configuration remained visible through RLS';
  end if;

  update public.stock_minimum_policies
  set minimum_quantity = 9
  where organization_id='99100000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'disabled stock-minimum unexpectedly updated % rows', affected;
  end if;

  begin
    insert into public.stock_minimum_policies(
      organization_id,stock_item_id,stock_location_id,minimum_quantity
    ) values (
      '99100000-0000-4000-8000-000000000001',
      '99100000-0000-4000-8000-000000000071',
      '99100000-0000-4000-8000-000000000040',
      3
    );
    raise exception 'disabled stock-minimum unexpectedly accepted a new policy';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Re-enable restores the original row and its previous value.
set role authenticated;
select set_config('request.jwt.claim.sub','99100000-0000-4000-8000-000000000201',false);
select set_config('request.jwt.claim.role','authenticated',false);
select public.set_organization_capability(
  '99100000-0000-4000-8000-000000000001',
  'stock-minimum',
  true
);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','99100000-0000-4000-8000-000000000202',false);
select set_config('request.jwt.claim.role','authenticated',false);

do $$
begin
  if (select count(*) from public.stock_minimum_policies) <> 1 then
    raise exception 'stock-minimum configuration did not return after reactivation';
  end if;
  if (select minimum_quantity from public.stock_minimum_policies limit 1) <> 5 then
    raise exception 'stock-minimum configuration changed while capability was disabled';
  end if;
end $$;

update public.stock_minimum_policies
set minimum_quantity = 7
where organization_id='99100000-0000-4000-8000-000000000001';
reset role;

do $$
begin
  if (
    select count(*) from public.audit_logs
    where organization_id='99100000-0000-4000-8000-000000000001'
      and action='organization_capability.changed'
      and after_data->>'capability_id'='stock-minimum'
  ) <> 2 then
    raise exception 'stock-minimum composition audit must contain disable and reactivation';
  end if;
end $$;

rollback;

select 'stock minimum composition tests passed' as result;
