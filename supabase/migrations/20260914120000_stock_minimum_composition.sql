-- Fase 60 / Issue #190: segunda capability configurável do compositor.
-- Estoque mínimo depende de inventory, preserva configuração ao ser desativado
-- e deve desaparecer também da superfície Data API enquanto estiver off.

alter table public.organization_capability_settings
  drop constraint if exists organization_capability_settings_capability_id_check;

alter table public.organization_capability_settings
  add constraint organization_capability_settings_capability_id_check
  check (capability_id in ('stock-loans', 'stock-minimum'));

create or replace function private.is_capability_enabled(
  p_organization_id uuid,
  p_capability_id text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_enabled boolean;
begin
  case p_capability_id
    when 'organization-context' then return true;
    when 'authorization' then return true;
    when 'audit' then return true;
    when 'composition' then return true;
    when 'inventory' then return true;
    when 'stock-loans' then
      select setting.enabled into v_enabled
      from public.organization_capability_settings setting
      where setting.organization_id = p_organization_id
        and setting.capability_id = p_capability_id;
      return coalesce(v_enabled, true);
    when 'stock-minimum' then
      select setting.enabled into v_enabled
      from public.organization_capability_settings setting
      where setting.organization_id = p_organization_id
        and setting.capability_id = p_capability_id;
      return coalesce(v_enabled, true);
    else
      return false;
  end case;
end;
$$;

revoke all on function private.is_capability_enabled(uuid,text)
  from public, anon, authenticated, service_role;

-- RLS-facing helper: authenticated keeps no direct EXECUTE on the internal
-- capability resolver. This wrapper answers only for a membership visible to
-- the current authenticated actor, so it can safely participate in policies.
create or replace function private.can_use_capability(
  p_organization_id uuid,
  p_capability_id text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  if not private.is_org_member(p_organization_id) then
    return false;
  end if;

  return private.is_capability_enabled(p_organization_id, p_capability_id);
end;
$$;

revoke all on function private.can_use_capability(uuid,text)
  from public, anon, authenticated, service_role;
grant execute on function private.can_use_capability(uuid,text)
  to authenticated;

create or replace function public.set_organization_capability(
  p_organization_id uuid,
  p_capability_id text,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_previous boolean;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if not private.has_org_wide_role(p_organization_id, array['owner']) then
    raise exception 'INSUFFICIENT_ROLE' using errcode = '42501';
  end if;

  if p_capability_id not in ('stock-loans', 'stock-minimum') then
    raise exception 'CAPABILITY_NOT_CONFIGURABLE' using errcode = '22023';
  end if;

  if p_enabled and not private.is_capability_enabled(p_organization_id, 'inventory') then
    raise exception 'CAPABILITY_DEPENDENCY_DISABLED: inventory' using errcode = '23514';
  end if;

  select coalesce(setting.enabled, true) into v_previous
  from (select true) seed
  left join public.organization_capability_settings setting
    on setting.organization_id = p_organization_id
   and setting.capability_id = p_capability_id;

  if v_previous = p_enabled then
    return;
  end if;

  insert into public.organization_capability_settings (
    organization_id,
    capability_id,
    enabled,
    updated_by_user_id
  ) values (
    p_organization_id,
    p_capability_id,
    p_enabled,
    v_user_id
  )
  on conflict (organization_id, capability_id) do update
  set enabled = excluded.enabled,
      updated_by_user_id = excluded.updated_by_user_id,
      updated_at = now();

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    metadata
  ) values (
    p_organization_id,
    v_user_id,
    'organization_capability.changed',
    'organization_capability',
    null,
    jsonb_build_object('capability_id', p_capability_id, 'enabled', v_previous),
    jsonb_build_object('capability_id', p_capability_id, 'enabled', p_enabled),
    jsonb_build_object(
      'source', 'set_organization_capability_rpc',
      'rollout', 'phase_60_second_slice',
      'dependencies', jsonb_build_array('inventory')
    )
  );
end;
$$;

revoke all on function public.set_organization_capability(uuid,text,boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.set_organization_capability(uuid,text,boolean)
  to authenticated;

-- Estoque mínimo is configuration, not an outstanding obligation. When off,
-- hide its rows from the product surface and reject INSERT/UPDATE while keeping
-- the physical rows intact. Re-enable restores the same rows through RLS.
drop policy if exists stock_minimum_policies_member_select
  on public.stock_minimum_policies;
drop policy if exists stock_minimum_policies_inventory_insert
  on public.stock_minimum_policies;
drop policy if exists stock_minimum_policies_inventory_update
  on public.stock_minimum_policies;

create policy stock_minimum_policies_member_select
on public.stock_minimum_policies
for select
to authenticated
using (
  private.can_use_capability(organization_id, 'stock-minimum')
  and private.can_read_stock_location(organization_id, stock_location_id)
);

create policy stock_minimum_policies_inventory_insert
on public.stock_minimum_policies
for insert
to authenticated
with check (
  private.can_use_capability(organization_id, 'stock-minimum')
  and private.has_stock_location_role(
    organization_id,
    stock_location_id,
    array['owner','admin','manager','inventory']
  )
);

create policy stock_minimum_policies_inventory_update
on public.stock_minimum_policies
for update
to authenticated
using (
  private.can_use_capability(organization_id, 'stock-minimum')
  and private.has_stock_location_role(
    organization_id,
    stock_location_id,
    array['owner','admin','manager','inventory']
  )
)
with check (
  private.can_use_capability(organization_id, 'stock-minimum')
  and private.has_stock_location_role(
    organization_id,
    stock_location_id,
    array['owner','admin','manager','inventory']
  )
);
