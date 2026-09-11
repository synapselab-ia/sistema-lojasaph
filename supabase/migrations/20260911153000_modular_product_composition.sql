-- Fase 60 / Issue #190: primeira prova do compositor modular.
-- O registry estrutural vive no código; o banco persiste somente overrides por Organization.
-- Nesta etapa apenas stock-loans é configurável e depende de inventory, que permanece ativo.

create table public.organization_capability_settings (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  capability_id text not null check (capability_id in ('stock-loans')),
  enabled boolean not null,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, capability_id)
);

create trigger organization_capability_settings_updated_at
before update on public.organization_capability_settings
for each row execute function public.set_updated_at();

alter table public.organization_capability_settings enable row level security;

revoke all on public.organization_capability_settings from public, anon, authenticated, service_role;
grant select on public.organization_capability_settings to authenticated, service_role;

create policy organization_capability_settings_member_select
on public.organization_capability_settings for select to authenticated
using (private.has_org_role(organization_id, null::text[]));

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
    else
      return false;
  end case;
end;
$$;

revoke all on function private.is_capability_enabled(uuid,text)
  from public, anon, authenticated, service_role;

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

  if p_capability_id <> 'stock-loans' then
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
      'rollout', 'phase_60_initial',
      'dependencies', jsonb_build_array('inventory')
    )
  );
end;
$$;

revoke all on function public.set_organization_capability(uuid,text,boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.set_organization_capability(uuid,text,boolean)
  to authenticated;

-- Backend gate autoritativo para a primeira capability configurável.
-- Desabilitar stock-loans impede novos empréstimos, mas não redefine a RPC de
-- restituição: obrigações existentes continuam liquidáveis e o histórico é preservado.
create or replace function public.record_stock_loan(
  p_command_id uuid,
  p_organization_id uuid,
  p_stock_item_id uuid,
  p_source_location_id uuid,
  p_counterparty text,
  p_quantity numeric,
  p_preferred_batch_id uuid default null,
  p_notes text default null
)
returns table (
  loan_id uuid,
  stock_item_id uuid,
  source_location_id uuid,
  original_quantity numeric,
  original_value numeric,
  remaining_physical_quantity numeric,
  remaining_value numeric,
  status text,
  quantity_on_hand numeric,
  average_cost numeric
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if not private.is_capability_enabled(p_organization_id, 'stock-loans') then
    raise exception 'CAPABILITY_DISABLED: stock-loans' using errcode = '42501';
  end if;

  if not private.has_stock_location_role(
    p_organization_id,
    p_source_location_id,
    array['owner', 'admin', 'manager', 'inventory']
  ) then
    raise exception 'INSUFFICIENT_SCOPE' using errcode = '42501';
  end if;

  return query
  select * from private.record_stock_loan(
    p_command_id,
    p_organization_id,
    p_stock_item_id,
    p_source_location_id,
    p_counterparty,
    p_quantity,
    p_preferred_batch_id,
    p_notes
  );
end;
$$;

revoke all on function public.record_stock_loan(uuid,uuid,uuid,uuid,text,numeric,uuid,text)
  from public, anon, authenticated;
grant execute on function public.record_stock_loan(uuid,uuid,uuid,uuid,text,numeric,uuid,text)
  to authenticated;
