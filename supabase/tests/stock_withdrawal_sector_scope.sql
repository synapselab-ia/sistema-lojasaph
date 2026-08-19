\set ON_ERROR_STOP on

begin;

-- This fixture proves that source-location access and destination-sector access are
-- evaluated independently. A sector-scoped inventory user can consume from the
-- location attached to its own sector, but cannot target a sibling sector.
insert into public.stock_locations (
  id, organization_id, unit_id, sector_id, name, code, location_type, status
) values (
  '49100000-0000-4000-8000-000000000120',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000100',
  '00000000-0000-4000-8000-000000000110',
  'Estoque setorial retirada CI',
  'WD-SECTOR-SCOPE',
  'kitchen',
  'active'
);

insert into auth.users(id,email)
values ('49100000-0000-4000-8000-000000000201','withdrawal-sector-scope@example.invalid');

insert into public.organization_memberships (
  organization_id, user_id, role, sector_id, active
) values (
  '00000000-0000-4000-8000-000000000001',
  '49100000-0000-4000-8000-000000000201',
  'inventory',
  '00000000-0000-4000-8000-000000000110',
  true
);

set role authenticated;
select set_config('request.jwt.claim.sub','49100000-0000-4000-8000-000000000201',false);
select set_config('request.jwt.claim.role','authenticated',false);

select * from public.record_stock_entry(
  '49100000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000402',
  '49100000-0000-4000-8000-000000000120',
  2.000,
  20.00,
  null,
  null,
  'seed sector withdrawal scope'
);

select * from public.record_stock_withdrawal(
  '49100000-0000-4000-8000-000000000302',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000402',
  '49100000-0000-4000-8000-000000000120',
  '00000000-0000-4000-8000-000000000110',
  0.500,
  null,
  'own sector allowed'
);

do $$
begin
  begin
    perform public.record_stock_withdrawal(
      '49100000-0000-4000-8000-000000000303',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000402',
      '49100000-0000-4000-8000-000000000120',
      '00000000-0000-4000-8000-000000000111',
      0.500,
      null,
      'sibling sector denied'
    );
    raise exception 'out-of-scope sector withdrawal unexpectedly succeeded';
  exception
    when insufficient_privilege then
      if position('INSUFFICIENT_SCOPE' in sqlerrm) = 0 then
        raise;
      end if;
  end;
end;
$$;

reset role;

do $$
begin
  if (select sector_id from public.stock_movements where id='49100000-0000-4000-8000-000000000302')
       <> '00000000-0000-4000-8000-000000000110' then
    raise exception 'authorized withdrawal did not persist own sector';
  end if;

  if (select quantity_on_hand from public.inventory_balances
      where organization_id='00000000-0000-4000-8000-000000000001'
        and stock_item_id='00000000-0000-4000-8000-000000000402'
        and stock_location_id='49100000-0000-4000-8000-000000000120') <> 1.500 then
    raise exception 'denied sector withdrawal changed projected balance';
  end if;

  if exists(select 1 from public.stock_movements where id='49100000-0000-4000-8000-000000000303') then
    raise exception 'denied sector withdrawal left movement residue';
  end if;

  if exists(select 1 from public.audit_logs where entity_id='49100000-0000-4000-8000-000000000303') then
    raise exception 'denied sector withdrawal left audit residue';
  end if;
end;
$$;

rollback;

select 'stock withdrawal sector scope tests passed' as result;
