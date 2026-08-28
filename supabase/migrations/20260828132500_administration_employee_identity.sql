-- Fase 51: vínculo administrativo entre Employee operacional e identidade autenticada.
-- O usuário final seleciona pessoas por nome/e-mail; auth_user_id permanece detalhe interno do modelo.

create or replace function public.admin_link_employee_identity(
  target_membership_id uuid,
  target_employee_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership public.organization_memberships%rowtype;
  employee public.employees%rowtype;
  previous_employee_id uuid;
begin
  select * into membership
  from public.organization_memberships m
  where m.id = target_membership_id;

  if not found then
    raise exception 'MEMBERSHIP_NOT_FOUND' using errcode = 'P0002';
  end if;

  if auth.uid() is null
     or not private.has_org_wide_role(membership.organization_id, array['owner','admin']) then
    raise exception 'ADMIN_ACCESS_REQUIRED' using errcode = '42501';
  end if;

  select e.id into previous_employee_id
  from public.employees e
  where e.organization_id = membership.organization_id
    and e.auth_user_id = membership.user_id
  limit 1
  for update;

  if target_employee_id is not null then
    select * into employee
    from public.employees e
    where e.id = target_employee_id
      and e.organization_id = membership.organization_id
    for update;

    if not found then
      raise exception 'EMPLOYEE_NOT_FOUND' using errcode = 'P0002';
    end if;

    if employee.auth_user_id is not null and employee.auth_user_id <> membership.user_id then
      raise exception 'EMPLOYEE_IDENTITY_ALREADY_LINKED' using errcode = '23505';
    end if;
  end if;

  if previous_employee_id is not null and previous_employee_id is distinct from target_employee_id then
    update public.employees
    set auth_user_id = null
    where id = previous_employee_id;
  end if;

  if target_employee_id is not null then
    update public.employees
    set auth_user_id = membership.user_id
    where id = target_employee_id;
  end if;

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
    membership.organization_id,
    auth.uid(),
    'employee.identity_link',
    'organization_membership',
    membership.id,
    jsonb_build_object('employee_id', previous_employee_id),
    jsonb_build_object('employee_id', target_employee_id),
    jsonb_build_object('source', 'administration_access_rpc')
  );

  return membership.id;
end;
$$;

revoke all on function public.admin_link_employee_identity(uuid,uuid) from public, anon, authenticated;
grant execute on function public.admin_link_employee_identity(uuid,uuid) to authenticated;
