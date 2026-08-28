\set ON_ERROR_STOP on

begin;

insert into auth.users(id,email,email_confirmed_at) values
  ('95000000-0000-4000-8000-000000000001','admin-owner@example.invalid',now()),
  ('95000000-0000-4000-8000-000000000002','admin-target@example.invalid',null),
  ('95000000-0000-4000-8000-000000000003','admin-viewer@example.invalid',now());

insert into public.organization_memberships(
  id, organization_id, user_id, role, business_id, unit_id, sector_id, active
) values
  ('95000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000001','owner',null,null,null,true),
  ('95000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000003','viewer',null,'00000000-0000-4000-8000-000000000100',null,true);

insert into public.employees(
  id, organization_id, name, code, status, default_unit_id
) values (
  '95000000-0000-4000-8000-000000000020',
  '00000000-0000-4000-8000-000000000001',
  'Funcionário administrativo CI',
  'ADMIN-CI',
  'active',
  '00000000-0000-4000-8000-000000000100'
);

-- A location linked to a Sector must use that Sector's Unit.
do $$
begin
  begin
    insert into public.stock_locations(
      organization_id, unit_id, sector_id, name, code, location_type
    ) values (
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000101',
      '00000000-0000-4000-8000-000000000110',
      'Local estrutural inválido',
      'invalid-structure-location',
      'warehouse'
    );
    raise exception 'stock location accepted a Sector from another Unit';
  exception when check_violation then
    if position('STOCK_LOCATION_SCOPE_HIERARCHY_MISMATCH' in sqlerrm) = 0 then raise; end if;
  end;
end $$;

-- Public/anon cannot call the privileged access boundary; authenticated can reach it and is checked internally.
do $$
begin
  if has_function_privilege('anon','public.admin_list_organization_access(uuid)','EXECUTE') then
    raise exception 'anon can execute admin access listing';
  end if;
  if not has_function_privilege('authenticated','public.admin_list_organization_access(uuid)','EXECUTE') then
    raise exception 'authenticated cannot execute admin access listing';
  end if;
  if has_function_privilege('anon','public.admin_create_organization_membership(uuid,uuid,text,uuid,uuid,uuid)','EXECUTE') then
    raise exception 'anon can execute admin membership creation';
  end if;
  if has_function_privilege('anon','public.admin_update_organization_membership(uuid,text,uuid,uuid,uuid,boolean)','EXECUTE') then
    raise exception 'anon can execute admin membership update';
  end if;
  if has_function_privilege('anon','public.admin_link_employee_identity(uuid,uuid)','EXECUTE') then
    raise exception 'anon can execute employee identity link';
  end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claim.role','authenticated',false);

-- Organization-wide owner sees access data with product-safe identity fields.
do $$
declare
  access_count integer;
  target_confirmed boolean;
begin
  select count(*), bool_or(email_confirmed)
    into access_count, target_confirmed
  from public.admin_list_organization_access('00000000-0000-4000-8000-000000000001')
  where email = 'admin-owner@example.invalid';

  if access_count <> 1 or target_confirmed is not true then
    raise exception 'owner access listing did not return expected identity state';
  end if;
end $$;

-- Create and maintain scoped access through the narrow RPC boundary.
do $$
declare
  created_id uuid;
  linked_employee_name text;
begin
  created_id := public.admin_create_organization_membership(
    '00000000-0000-4000-8000-000000000001',
    '95000000-0000-4000-8000-000000000002',
    'inventory',
    null,
    '00000000-0000-4000-8000-000000000100',
    null
  );

  if not exists (
    select 1 from public.organization_memberships m
    where m.id = created_id
      and m.user_id = '95000000-0000-4000-8000-000000000002'
      and m.role = 'inventory'
      and m.unit_id = '00000000-0000-4000-8000-000000000100'
      and m.active
  ) then
    raise exception 'admin membership creation did not persist expected scope';
  end if;

  if not exists (
    select 1 from public.audit_logs a
    where a.entity_id = created_id and a.action = 'membership.create'
  ) then
    raise exception 'admin membership creation was not audited';
  end if;

  perform public.admin_link_employee_identity(
    created_id,
    '95000000-0000-4000-8000-000000000020'
  );

  if not exists (
    select 1 from public.employees e
    where e.id = '95000000-0000-4000-8000-000000000020'
      and e.auth_user_id = '95000000-0000-4000-8000-000000000002'
  ) then
    raise exception 'employee identity link did not persist';
  end if;

  select employee_name into linked_employee_name
  from public.admin_list_organization_access('00000000-0000-4000-8000-000000000001')
  where membership_id = created_id;

  if linked_employee_name <> 'Funcionário administrativo CI' then
    raise exception 'access listing did not expose linked Employee name';
  end if;

  perform public.admin_update_organization_membership(
    created_id,
    'finance',
    null,
    null,
    null,
    true
  );

  if not exists (
    select 1 from public.organization_memberships m
    where m.id = created_id
      and m.role = 'finance'
      and m.business_id is null
      and m.unit_id is null
      and m.sector_id is null
      and m.active
  ) then
    raise exception 'admin membership update did not persist expected access';
  end if;

  if not exists (
    select 1 from public.audit_logs a
    where a.entity_id = created_id and a.action = 'membership.update'
  ) then
    raise exception 'admin membership update was not audited';
  end if;

  perform public.admin_link_employee_identity(created_id, null);
  if exists (
    select 1 from public.employees e
    where e.id = '95000000-0000-4000-8000-000000000020'
      and e.auth_user_id is not null
  ) then
    raise exception 'employee identity unlink did not clear the link';
  end if;

  if (select count(*) from public.audit_logs a where a.entity_id = created_id and a.action = 'employee.identity_link') <> 2 then
    raise exception 'employee identity changes were not audited';
  end if;
end $$;

-- The final active Organization-wide owner cannot be downgraded or revoked.
do $$
begin
  begin
    perform public.admin_update_organization_membership(
      '95000000-0000-4000-8000-000000000010',
      'admin',
      null,
      null,
      null,
      true
    );
    raise exception 'last organization owner was unexpectedly removable';
  exception when check_violation then
    if position('LAST_ORGANIZATION_OWNER_REQUIRED' in sqlerrm) = 0 then raise; end if;
  end;
end $$;

reset role;

-- A scoped viewer cannot call any administrative access RPC.
set role authenticated;
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000003',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  begin
    perform * from public.admin_list_organization_access('00000000-0000-4000-8000-000000000001');
    raise exception 'scoped viewer unexpectedly listed organization access';
  exception when insufficient_privilege then
    if position('ADMIN_ACCESS_REQUIRED' in sqlerrm) = 0 then raise; end if;
  end;

  begin
    perform public.admin_create_organization_membership(
      '00000000-0000-4000-8000-000000000001',
      '95000000-0000-4000-8000-000000000002',
      'viewer',
      null,
      null,
      null
    );
    raise exception 'scoped viewer unexpectedly created organization access';
  exception when insufficient_privilege then
    if position('ADMIN_ACCESS_REQUIRED' in sqlerrm) = 0 then raise; end if;
  end;

  begin
    perform public.admin_link_employee_identity(
      '95000000-0000-4000-8000-000000000010',
      '95000000-0000-4000-8000-000000000020'
    );
    raise exception 'scoped viewer unexpectedly linked Employee identity';
  exception when insufficient_privilege then
    if position('ADMIN_ACCESS_REQUIRED' in sqlerrm) = 0 then raise; end if;
  end;
end $$;

reset role;
rollback;
