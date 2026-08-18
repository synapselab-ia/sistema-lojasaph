-- Fase 19: funcionários operacionais separados da identidade autenticada.

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  code text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  default_unit_id uuid,
  default_sector_id uuid,
  auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (default_unit_id, organization_id)
    references public.units(id, organization_id) on delete restrict,
  foreign key (default_sector_id, organization_id)
    references public.sectors(id, organization_id) on delete restrict
);

create unique index employees_code_unique_idx
  on public.employees(organization_id, code)
  where code is not null;

create unique index employees_auth_user_unique_idx
  on public.employees(organization_id, auth_user_id)
  where auth_user_id is not null;

create index employees_scope_idx
  on public.employees(organization_id, default_unit_id, default_sector_id, status);

create trigger employees_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

create or replace function private.validate_employee_scope_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sector_unit uuid;
begin
  if new.default_sector_id is not null then
    select s.unit_id into v_sector_unit
    from public.sectors s
    where s.id = new.default_sector_id
      and s.organization_id = new.organization_id;

    if not found then
      raise exception 'EMPLOYEE_SECTOR_NOT_AVAILABLE' using errcode = '23503';
    end if;

    if new.default_unit_id is not null and new.default_unit_id <> v_sector_unit then
      raise exception 'EMPLOYEE_SCOPE_HIERARCHY_MISMATCH' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.validate_employee_scope_hierarchy() from public, anon, authenticated;

drop trigger if exists employees_scope_hierarchy on public.employees;
create trigger employees_scope_hierarchy
before insert or update of organization_id, default_unit_id, default_sector_id
on public.employees
for each row execute function private.validate_employee_scope_hierarchy();

create or replace function private.can_manage_employee_scope(
  target_organization_id uuid,
  target_unit_id uuid,
  target_sector_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when target_sector_id is not null then
      private.has_sector_role(target_organization_id, target_sector_id, array['owner','admin','manager'])
    when target_unit_id is not null then
      private.has_unit_role(target_organization_id, target_unit_id, array['owner','admin','manager'])
    else
      private.has_org_wide_role(target_organization_id, array['owner','admin','manager'])
  end;
$$;

revoke all on function private.can_manage_employee_scope(uuid, uuid, uuid) from public, anon;
grant execute on function private.can_manage_employee_scope(uuid, uuid, uuid) to authenticated, service_role;

alter table public.employees enable row level security;

-- O diretório de funcionários contém vínculo opcional com auth.users e é administrativo.
-- Leitura e manutenção exigem owner/admin/manager dentro do escopo efetivo.
create policy employees_admin_select
  on public.employees for select to authenticated
  using (private.can_manage_employee_scope(organization_id, default_unit_id, default_sector_id));

create policy employees_admin_insert
  on public.employees for insert to authenticated
  with check (private.can_manage_employee_scope(organization_id, default_unit_id, default_sector_id));

create policy employees_admin_update
  on public.employees for update to authenticated
  using (private.can_manage_employee_scope(organization_id, default_unit_id, default_sector_id))
  with check (private.can_manage_employee_scope(organization_id, default_unit_id, default_sector_id));

grant select, insert, update on public.employees to authenticated;

-- Intencionalmente não há DELETE: inativação preserva o registro operacional.
