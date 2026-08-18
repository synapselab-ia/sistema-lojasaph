\set ON_ERROR_STOP on

begin;

insert into public.organizations(id,name,timezone,currency)
values ('95000000-0000-4000-8000-000000000001','Outra Organização CI','America/Sao_Paulo','BRL');
insert into public.businesses(id,organization_id,name,code)
values ('95000000-0000-4000-8000-000000000010','95000000-0000-4000-8000-000000000001','Outro Negócio CI','employees-other-business');
insert into public.units(id,organization_id,business_id,name,code)
values ('95000000-0000-4000-8000-000000000100','95000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000010','Outra Unidade CI','employees-other-unit');

insert into auth.users(id,email) values
 ('95000000-0000-4000-8000-000000000201','employees-owner@example.invalid'),
 ('95000000-0000-4000-8000-000000000202','employees-unit-manager@example.invalid'),
 ('95000000-0000-4000-8000-000000000203','employees-viewer@example.invalid'),
 ('95000000-0000-4000-8000-000000000204','employees-linked-no-access@example.invalid'),
 ('95000000-0000-4000-8000-000000000205','employees-other-org@example.invalid');

insert into public.organization_memberships(organization_id,user_id,role,unit_id,active) values
 ('00000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000201','owner',null,true),
 ('00000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000202','manager','00000000-0000-4000-8000-000000000100',true),
 ('00000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000203','viewer','00000000-0000-4000-8000-000000000100',true),
 ('95000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000205','owner','95000000-0000-4000-8000-000000000100',true);

insert into public.employees(id,organization_id,name,code,status)
values ('95000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000001','Funcionário organização CI','EMP-ORG','active');
insert into public.employees(id,organization_id,name,code,status,default_unit_id)
values ('95000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000001','Funcionário unidade A CI','EMP-UNIT-A','active','00000000-0000-4000-8000-000000000100');
insert into public.employees(id,organization_id,name,code,status,default_unit_id,default_sector_id,auth_user_id)
values ('95000000-0000-4000-8000-000000000303','00000000-0000-4000-8000-000000000001','Funcionário setor A CI','EMP-SECTOR-A','active','00000000-0000-4000-8000-000000000100','00000000-0000-4000-8000-000000000110','95000000-0000-4000-8000-000000000204');
insert into public.employees(id,organization_id,name,code,status,default_unit_id)
values ('95000000-0000-4000-8000-000000000304','95000000-0000-4000-8000-000000000001','Funcionário outra organização CI','EMP-OTHER','active','95000000-0000-4000-8000-000000000100');

-- Unit/Sector parents cannot contradict each other.
do $$
begin
  begin
    insert into public.employees(organization_id,name,default_unit_id,default_sector_id)
    values('00000000-0000-4000-8000-000000000001','Escopo inválido CI','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000110');
    raise exception 'employee hierarchy mismatch unexpectedly succeeded';
  exception when check_violation then null;
  end;
end $$;

-- Organization-wide owner sees and manages every employee in the Organization.
set role authenticated;
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000201',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  if (select count(*) from public.employees where organization_id='00000000-0000-4000-8000-000000000001') <> 3 then
    raise exception 'organization-wide owner did not see all employees';
  end if;
  if exists(select 1 from public.employees where organization_id='95000000-0000-4000-8000-000000000001') then
    raise exception 'employee read leaked another organization';
  end if;
end $$;

insert into public.employees(id,organization_id,name,code,status)
values ('95000000-0000-4000-8000-000000000305','00000000-0000-4000-8000-000000000001','Funcionário sem escopo CI','EMP-OWNER-CREATED','active');
update public.employees set status='inactive' where id='95000000-0000-4000-8000-000000000305';
reset role;

-- Linking an auth identity must not create access/membership as a side effect.
do $$
begin
  if exists(select 1 from public.organization_memberships where user_id='95000000-0000-4000-8000-000000000204') then
    raise exception 'employee auth link created a membership';
  end if;
  if not exists(select 1 from public.employees where id='95000000-0000-4000-8000-000000000303' and auth_user_id='95000000-0000-4000-8000-000000000204') then
    raise exception 'employee auth link was not persisted';
  end if;
  if (select status from public.employees where id='95000000-0000-4000-8000-000000000305') <> 'inactive' then
    raise exception 'employee inactivation was not persisted';
  end if;
end $$;

-- Unit-scoped manager sees/manages only employees in that unit/its sectors.
set role authenticated;
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000202',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  if (select count(*) from public.employees where organization_id='00000000-0000-4000-8000-000000000001') <> 2 then
    raise exception 'unit manager employee visibility is not scope-aware';
  end if;
  if exists(select 1 from public.employees where id='95000000-0000-4000-8000-000000000301') then
    raise exception 'unit manager saw organization-wide employee';
  end if;
end $$;

insert into public.employees(id,organization_id,name,code,status,default_unit_id)
values ('95000000-0000-4000-8000-000000000306','00000000-0000-4000-8000-000000000001','Criado pela unidade A CI','EMP-MANAGER-A','active','00000000-0000-4000-8000-000000000100');
update public.employees set status='inactive' where id='95000000-0000-4000-8000-000000000306';

do $$
begin
  begin
    insert into public.employees(organization_id,name,code,status)
    values('00000000-0000-4000-8000-000000000001','Global proibido CI','EMP-GLOBAL-DENIED','active');
    raise exception 'scoped manager created organization-wide employee';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.employees(organization_id,name,code,status,default_unit_id)
    values('00000000-0000-4000-8000-000000000001','Outra unidade proibida CI','EMP-UNIT-B-DENIED','active','00000000-0000-4000-8000-000000000101');
    raise exception 'scoped manager created employee in another unit';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.employees
    set default_unit_id='00000000-0000-4000-8000-000000000101'
    where id='95000000-0000-4000-8000-000000000302';
    raise exception 'scoped manager moved employee outside own scope';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Viewer has no access to the administrative employee directory and cannot mutate it.
set role authenticated;
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000203',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
declare
  affected integer;
begin
  if exists(select 1 from public.employees) then
    raise exception 'viewer saw administrative employee records';
  end if;

  update public.employees set status='inactive' where id='95000000-0000-4000-8000-000000000302';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'viewer updated employee';
  end if;
end $$;
reset role;

do $$
begin
  if (select status from public.employees where id='95000000-0000-4000-8000-000000000302') <> 'active' then
    raise exception 'viewer mutation changed employee state';
  end if;
end $$;

-- Employee without login is valid; linked auth user without membership gains no access.
do $$
begin
  if not exists(select 1 from public.employees where id='95000000-0000-4000-8000-000000000302' and auth_user_id is null) then
    raise exception 'employee without login is not preserved';
  end if;
  if has_table_privilege('authenticated','public.employees','DELETE') then
    raise exception 'authenticated role unexpectedly has DELETE on employees';
  end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000204',false);
select set_config('request.jwt.claim.role','authenticated',false);
do $$
begin
  if exists(select 1 from public.employees) then
    raise exception 'linked auth user without membership gained employee access';
  end if;
end $$;
reset role;

rollback;
