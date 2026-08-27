-- Issue #132 / REQ-STK-011: minimum stock policy per item and stock location.
-- inventory_balances remains a read-only projection; configuration lives here.

create table public.stock_minimum_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  stock_item_id uuid not null,
  stock_location_id uuid not null,
  minimum_quantity numeric(18,3) not null check (minimum_quantity >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, stock_item_id, stock_location_id),
  unique (id, organization_id),
  foreign key (stock_item_id, organization_id)
    references public.stock_items(id, organization_id) on delete restrict,
  foreign key (stock_location_id, organization_id)
    references public.stock_locations(id, organization_id) on delete restrict
);

create index stock_minimum_policies_location_active_idx
  on public.stock_minimum_policies(organization_id, stock_location_id, stock_item_id)
  where active;

create trigger stock_minimum_policies_updated_at
before update on public.stock_minimum_policies
for each row execute function public.set_updated_at();

alter table public.stock_minimum_policies enable row level security;

-- New public objects are born closed after the global hardening migration.
-- Expose only the commands backed by explicit policies; DELETE remains absent.
revoke all privileges on table public.stock_minimum_policies from public, anon, authenticated, service_role;
grant select, insert, update on table public.stock_minimum_policies to authenticated;

create policy stock_minimum_policies_member_select
on public.stock_minimum_policies
for select
to authenticated
using (private.can_read_stock_location(organization_id, stock_location_id));

create policy stock_minimum_policies_inventory_insert
on public.stock_minimum_policies
for insert
to authenticated
with check (
  private.has_stock_location_role(
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
  private.has_stock_location_role(
    organization_id,
    stock_location_id,
    array['owner','admin','manager','inventory']
  )
)
with check (
  private.has_stock_location_role(
    organization_id,
    stock_location_id,
    array['owner','admin','manager','inventory']
  )
);

create or replace function private.audit_stock_minimum_policy_configuration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
begin
  if tg_op not in ('INSERT', 'UPDATE') then
    raise exception 'STOCK_MINIMUM_AUDIT_OPERATION_NOT_SUPPORTED' using errcode = '0A000';
  end if;

  v_after := jsonb_build_object(
    'organization_id', new.organization_id,
    'stock_item_id', new.stock_item_id,
    'stock_location_id', new.stock_location_id,
    'minimum_quantity', new.minimum_quantity,
    'active', new.active
  );

  if tg_op = 'UPDATE' then
    v_before := jsonb_build_object(
      'organization_id', old.organization_id,
      'stock_item_id', old.stock_item_id,
      'stock_location_id', old.stock_location_id,
      'minimum_quantity', old.minimum_quantity,
      'active', old.active
    );

    if v_before = v_after then
      return new;
    end if;
  end if;

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
    new.organization_id,
    auth.uid(),
    'stock_minimum_policy.' || case when tg_op = 'INSERT' then 'created' else 'updated' end,
    'stock_minimum_policy',
    new.id,
    v_before,
    v_after,
    jsonb_build_object(
      'source', 'critical_configuration_trigger',
      'operation', lower(tg_op)
    )
  );

  return new;
end;
$$;

revoke all on function private.audit_stock_minimum_policy_configuration()
  from public, anon, authenticated, service_role;

create trigger stock_minimum_policies_critical_config_audit
after insert or update on public.stock_minimum_policies
for each row execute function private.audit_stock_minimum_policy_configuration();
