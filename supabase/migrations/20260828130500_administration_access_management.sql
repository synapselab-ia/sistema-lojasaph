-- Fase 51: administração de acessos sem expor auth.users ou abrir DML direto em memberships.
-- Q-022 continua aberto: estes RPCs administram os papéis técnicos já existentes, sem mapear pessoas reais por suposição.

create or replace function public.admin_list_organization_access(target_organization_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  email text,
  email_confirmed boolean,
  role text,
  business_id uuid,
  unit_id uuid,
  sector_id uuid,
  active boolean,
  employee_id uuid,
  employee_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
     or not private.has_org_wide_role(target_organization_id, array['owner','admin']) then
    raise exception 'ADMIN_ACCESS_REQUIRED' using errcode = '42501';
  end if;

  return query
  select
    m.id,
    m.user_id,
    lower(u.email),
    u.email_confirmed_at is not null,
    m.role,
    m.business_id,
    m.unit_id,
    m.sector_id,
    m.active,
    e.id,
    e.name
  from public.organization_memberships m
  join auth.users u on u.id = m.user_id
  left join public.employees e
    on e.organization_id = m.organization_id
   and e.auth_user_id = m.user_id
  where m.organization_id = target_organization_id
  order by lower(u.email), m.active desc, m.role, m.created_at;
end;
$$;

revoke all on function public.admin_list_organization_access(uuid) from public, anon, authenticated;
grant execute on function public.admin_list_organization_access(uuid) to authenticated;

create or replace function public.admin_create_organization_membership(
  target_organization_id uuid,
  target_user_id uuid,
  target_role text,
  target_business_id uuid default null,
  target_unit_id uuid default null,
  target_sector_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership_id uuid;
  membership_was_active boolean;
begin
  if auth.uid() is null
     or not private.has_org_wide_role(target_organization_id, array['owner','admin']) then
    raise exception 'ADMIN_ACCESS_REQUIRED' using errcode = '42501';
  end if;

  if target_role is null or target_role not in ('owner','admin','manager','finance','purchases','inventory','cashier','viewer') then
    raise exception 'INVALID_MEMBERSHIP_ROLE' using errcode = '23514';
  end if;

  if not exists (select 1 from auth.users u where u.id = target_user_id) then
    raise exception 'AUTH_USER_NOT_FOUND' using errcode = '23503';
  end if;

  select m.id, m.active
    into membership_id, membership_was_active
  from public.organization_memberships m
  where m.organization_id = target_organization_id
    and m.user_id = target_user_id
    and m.role = target_role
    and m.business_id is not distinct from target_business_id
    and m.unit_id is not distinct from target_unit_id
    and m.sector_id is not distinct from target_sector_id
  limit 1
  for update;

  if membership_id is null then
    insert into public.organization_memberships(
      organization_id,
      user_id,
      role,
      business_id,
      unit_id,
      sector_id,
      active
    )
    values (
      target_organization_id,
      target_user_id,
      target_role,
      target_business_id,
      target_unit_id,
      target_sector_id,
      true
    )
    returning id into membership_id;
  elsif not membership_was_active then
    update public.organization_memberships
    set active = true
    where id = membership_id;
  end if;

  insert into public.audit_logs(
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_data,
    metadata
  )
  values (
    target_organization_id,
    auth.uid(),
    case when membership_was_active is null then 'membership.create' else 'membership.reactivate' end,
    'organization_membership',
    membership_id,
    jsonb_build_object(
      'user_id', target_user_id,
      'role', target_role,
      'business_id', target_business_id,
      'unit_id', target_unit_id,
      'sector_id', target_sector_id,
      'active', true
    ),
    jsonb_build_object('source', 'administration_access_rpc')
  );

  return membership_id;
end;
$$;

revoke all on function public.admin_create_organization_membership(uuid,uuid,text,uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.admin_create_organization_membership(uuid,uuid,text,uuid,uuid,uuid) to authenticated;

create or replace function public.admin_update_organization_membership(
  target_membership_id uuid,
  target_role text,
  target_business_id uuid default null,
  target_unit_id uuid default null,
  target_sector_id uuid default null,
  target_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_membership public.organization_memberships%rowtype;
  removes_org_wide_owner boolean;
begin
  select * into current_membership
  from public.organization_memberships m
  where m.id = target_membership_id
  for update;

  if not found then
    raise exception 'MEMBERSHIP_NOT_FOUND' using errcode = 'P0002';
  end if;

  if auth.uid() is null
     or not private.has_org_wide_role(current_membership.organization_id, array['owner','admin']) then
    raise exception 'ADMIN_ACCESS_REQUIRED' using errcode = '42501';
  end if;

  if target_role is null or target_role not in ('owner','admin','manager','finance','purchases','inventory','cashier','viewer') then
    raise exception 'INVALID_MEMBERSHIP_ROLE' using errcode = '23514';
  end if;

  removes_org_wide_owner :=
    current_membership.active
    and current_membership.role = 'owner'
    and current_membership.business_id is null
    and current_membership.unit_id is null
    and current_membership.sector_id is null
    and not (
      target_active
      and target_role = 'owner'
      and target_business_id is null
      and target_unit_id is null
      and target_sector_id is null
    );

  if removes_org_wide_owner and not exists (
    select 1
    from public.organization_memberships other_membership
    where other_membership.organization_id = current_membership.organization_id
      and other_membership.id <> current_membership.id
      and other_membership.active
      and other_membership.role = 'owner'
      and other_membership.business_id is null
      and other_membership.unit_id is null
      and other_membership.sector_id is null
  ) then
    raise exception 'LAST_ORGANIZATION_OWNER_REQUIRED' using errcode = '23514';
  end if;

  update public.organization_memberships
  set
    role = target_role,
    business_id = target_business_id,
    unit_id = target_unit_id,
    sector_id = target_sector_id,
    active = target_active
  where id = current_membership.id;

  insert into public.audit_logs(
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    metadata
  )
  values (
    current_membership.organization_id,
    auth.uid(),
    'membership.update',
    'organization_membership',
    current_membership.id,
    jsonb_build_object(
      'user_id', current_membership.user_id,
      'role', current_membership.role,
      'business_id', current_membership.business_id,
      'unit_id', current_membership.unit_id,
      'sector_id', current_membership.sector_id,
      'active', current_membership.active
    ),
    jsonb_build_object(
      'user_id', current_membership.user_id,
      'role', target_role,
      'business_id', target_business_id,
      'unit_id', target_unit_id,
      'sector_id', target_sector_id,
      'active', target_active
    ),
    jsonb_build_object('source', 'administration_access_rpc')
  );

  return current_membership.id;
end;
$$;

revoke all on function public.admin_update_organization_membership(uuid,text,uuid,uuid,uuid,boolean) from public, anon, authenticated;
grant execute on function public.admin_update_organization_membership(uuid,text,uuid,uuid,uuid,boolean) to authenticated;
