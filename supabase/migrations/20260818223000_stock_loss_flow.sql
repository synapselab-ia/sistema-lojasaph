create table public.stock_loss_reasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null,
  label text not null,
  movement_type text not null check (movement_type in ('loss', 'expiration')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, code),
  check (code = lower(code)),
  check (code ~ '^[a-z][a-z0-9_]{1,39}$'),
  check (length(trim(label)) > 0)
);

create index stock_loss_reasons_org_active_idx
  on public.stock_loss_reasons(organization_id, active, code);

alter table public.stock_loss_reasons enable row level security;

revoke all on table public.stock_loss_reasons from public, anon, authenticated;
grant select, insert, update on table public.stock_loss_reasons to authenticated;

create policy stock_loss_reasons_member_select
on public.stock_loss_reasons
for select
to authenticated
using (private.has_org_role(organization_id, null::text[]));

create policy stock_loss_reasons_admin_insert
on public.stock_loss_reasons
for insert
to authenticated
with check (private.has_org_wide_role(organization_id, array['owner','admin','manager','inventory']));

create policy stock_loss_reasons_admin_update
on public.stock_loss_reasons
for update
to authenticated
using (private.has_org_wide_role(organization_id, array['owner','admin','manager','inventory']))
with check (private.has_org_wide_role(organization_id, array['owner','admin','manager','inventory']));

create or replace function private.seed_stock_loss_reasons(target_organization_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.stock_loss_reasons(organization_id, code, label, movement_type)
  values
    (target_organization_id, 'loss', 'Perda', 'loss'),
    (target_organization_id, 'breakage', 'Quebra', 'loss'),
    (target_organization_id, 'expiration', 'Vencimento', 'expiration'),
    (target_organization_id, 'other', 'Outro', 'loss')
  on conflict (organization_id, code) do nothing;
$$;

revoke all on function private.seed_stock_loss_reasons(uuid) from public, anon, authenticated;

create or replace function private.seed_stock_loss_reasons_after_organization_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_stock_loss_reasons(new.id);
  return new;
end;
$$;

revoke all on function private.seed_stock_loss_reasons_after_organization_insert() from public, anon, authenticated;

drop trigger if exists organizations_seed_stock_loss_reasons on public.organizations;
create trigger organizations_seed_stock_loss_reasons
after insert on public.organizations
for each row execute function private.seed_stock_loss_reasons_after_organization_insert();

select private.seed_stock_loss_reasons(id) from public.organizations;

create or replace function private.protect_stock_loss_reason_defaults()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.code in ('loss','breakage','expiration','other')
    and (new.code is distinct from old.code or new.movement_type is distinct from old.movement_type)
  then
    raise exception 'SYSTEM_STOCK_LOSS_REASON_IMMUTABLE' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.protect_stock_loss_reason_defaults() from public, anon, authenticated;

drop trigger if exists stock_loss_reasons_protect_defaults on public.stock_loss_reasons;
create trigger stock_loss_reasons_protect_defaults
before update on public.stock_loss_reasons
for each row execute function private.protect_stock_loss_reason_defaults();

create or replace function private.record_stock_outflow(
  p_command_id uuid,
  p_organization_id uuid,
  p_stock_item_id uuid,
  p_stock_location_id uuid,
  p_quantity numeric,
  p_preferred_batch_id uuid,
  p_notes text,
  p_movement_type text,
  p_reason_code text,
  p_audit_action text,
  p_audit_source text
)
returns table (
  movement_id uuid,
  quantity_on_hand numeric,
  average_cost numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_quantity numeric(18,3);
  v_current_cost numeric(18,2);
  v_next_quantity numeric(18,3);
  v_track_batch boolean;
  v_track_expiration boolean;
  v_allow_negative boolean;
  v_movement_item_id uuid;
  v_remaining numeric(18,3);
  v_take numeric(18,3);
  v_existing_org uuid;
  v_existing_type text;
  v_existing_location uuid;
  v_existing_item uuid;
  v_existing_quantity numeric(18,3);
  v_existing_notes text;
  v_existing_reason text;
  v_existing_preferred_batch_id uuid;
  v_batch record;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if not private.has_org_role(
    p_organization_id,
    array['owner', 'admin', 'manager', 'inventory']
  ) then
    raise exception 'INSUFFICIENT_ROLE' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity <= 0 or scale(p_quantity) > 3 then
    raise exception 'INVALID_STOCK_QUANTITY' using errcode = '22023';
  end if;

  if p_movement_type not in ('withdrawal', 'loss', 'expiration') then
    raise exception 'INVALID_STOCK_OUTFLOW_TYPE' using errcode = '22023';
  end if;

  if nullif(trim(p_reason_code), '') is null then
    raise exception 'STOCK_OUTFLOW_REASON_REQUIRED' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_command_id::text, 0));

  select movement.organization_id,
         movement.movement_type,
         movement.source_location_id,
         item.stock_item_id,
         item.quantity,
         movement.notes,
         movement.reason_code,
         (
           select nullif(audit.after_data ->> 'preferred_batch_id', '')::uuid
           from public.audit_logs audit
           where audit.organization_id = movement.organization_id
             and audit.entity_type = 'stock_movement'
             and audit.entity_id = movement.id
             and audit.action = p_audit_action
           order by audit.occurred_at desc
           limit 1
         )
    into v_existing_org,
         v_existing_type,
         v_existing_location,
         v_existing_item,
         v_existing_quantity,
         v_existing_notes,
         v_existing_reason,
         v_existing_preferred_batch_id
  from public.stock_movements movement
  left join public.stock_movement_items item
    on item.movement_id = movement.id
   and item.organization_id = movement.organization_id
  where movement.id = p_command_id;

  if found then
    if v_existing_org <> p_organization_id
      or v_existing_type <> p_movement_type
      or v_existing_location is distinct from p_stock_location_id
      or v_existing_item is distinct from p_stock_item_id
      or v_existing_quantity is distinct from p_quantity
      or v_existing_notes is distinct from nullif(trim(p_notes), '')
      or v_existing_reason is distinct from p_reason_code
      or v_existing_preferred_batch_id is distinct from p_preferred_batch_id
    then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;

    return query
    select p_command_id, balance.quantity_on_hand, balance.average_cost
    from public.inventory_balances balance
    where balance.organization_id = p_organization_id
      and balance.stock_item_id = p_stock_item_id
      and balance.stock_location_id = p_stock_location_id;
    return;
  end if;

  select item.track_batch, item.track_expiration
    into v_track_batch, v_track_expiration
  from public.stock_items item
  where item.id = p_stock_item_id
    and item.organization_id = p_organization_id
    and item.active;

  if not found then
    raise exception 'STOCK_ITEM_NOT_AVAILABLE' using errcode = '23503';
  end if;

  select location.allow_negative_stock
    into v_allow_negative
  from public.stock_locations location
  where location.id = p_stock_location_id
    and location.organization_id = p_organization_id
    and location.status = 'active';

  if not found then
    raise exception 'STOCK_LOCATION_NOT_AVAILABLE' using errcode = '23503';
  end if;

  insert into public.inventory_balances (
    organization_id,
    stock_item_id,
    stock_location_id,
    quantity_on_hand,
    average_cost
  ) values (
    p_organization_id,
    p_stock_item_id,
    p_stock_location_id,
    0,
    0
  )
  on conflict (organization_id, stock_item_id, stock_location_id) do nothing;

  select balance.quantity_on_hand, balance.average_cost
    into v_current_quantity, v_current_cost
  from public.inventory_balances balance
  where balance.organization_id = p_organization_id
    and balance.stock_item_id = p_stock_item_id
    and balance.stock_location_id = p_stock_location_id
  for update;

  if (v_track_batch or v_track_expiration) and v_current_quantity < p_quantity then
    raise exception 'INSUFFICIENT_STOCK' using errcode = '22023';
  end if;

  if not v_allow_negative and v_current_quantity < p_quantity then
    raise exception 'INSUFFICIENT_STOCK' using errcode = '22023';
  end if;

  if p_preferred_batch_id is not null and not (v_track_batch or v_track_expiration) then
    raise exception 'BATCH_NOT_TRACKED' using errcode = '22023';
  end if;

  if v_track_batch or v_track_expiration then
    perform 1
    from public.inventory_batches batch
    where batch.organization_id = p_organization_id
      and batch.stock_item_id = p_stock_item_id
      and batch.stock_location_id = p_stock_location_id
      and batch.status = 'active'
      and batch.remaining_quantity > 0
    order by batch.id
    for update;

    if p_preferred_batch_id is not null and not exists (
      select 1
      from public.inventory_batches batch
      where batch.id = p_preferred_batch_id
        and batch.organization_id = p_organization_id
        and batch.stock_item_id = p_stock_item_id
        and batch.stock_location_id = p_stock_location_id
        and batch.status = 'active'
        and batch.remaining_quantity > 0
    ) then
      raise exception 'BATCH_NOT_AVAILABLE' using errcode = '22023';
    end if;

    if coalesce((
      select sum(batch.remaining_quantity)
      from public.inventory_batches batch
      where batch.organization_id = p_organization_id
        and batch.stock_item_id = p_stock_item_id
        and batch.stock_location_id = p_stock_location_id
        and batch.status = 'active'
        and batch.remaining_quantity > 0
    ), 0) < p_quantity then
      raise exception 'INSUFFICIENT_BATCH_STOCK' using errcode = '22023';
    end if;
  end if;

  v_next_quantity := v_current_quantity - p_quantity;

  insert into public.stock_movements (
    id,
    organization_id,
    movement_type,
    occurred_at,
    source_location_id,
    responsible_user_id,
    reason_code,
    notes,
    status
  ) values (
    p_command_id,
    p_organization_id,
    p_movement_type,
    now(),
    p_stock_location_id,
    v_user_id,
    p_reason_code,
    nullif(trim(p_notes), ''),
    'confirmed'
  );

  v_movement_item_id := gen_random_uuid();
  insert into public.stock_movement_items (
    id,
    organization_id,
    movement_id,
    stock_item_id,
    quantity,
    unit_cost_snapshot
  ) values (
    v_movement_item_id,
    p_organization_id,
    p_command_id,
    p_stock_item_id,
    p_quantity,
    v_current_cost
  );

  if v_track_batch or v_track_expiration then
    v_remaining := p_quantity;
    for v_batch in
      select batch.id, batch.remaining_quantity
      from public.inventory_batches batch
      where batch.organization_id = p_organization_id
        and batch.stock_item_id = p_stock_item_id
        and batch.stock_location_id = p_stock_location_id
        and batch.status = 'active'
        and batch.remaining_quantity > 0
      order by
        case when batch.id = p_preferred_batch_id then 0 else 1 end,
        batch.expiration_date asc nulls last,
        batch.received_at asc,
        batch.id asc
    loop
      exit when v_remaining = 0;
      v_take := least(v_batch.remaining_quantity, v_remaining);
      if v_take <= 0 then
        continue;
      end if;

      update public.inventory_batches
      set remaining_quantity = remaining_quantity - v_take,
          status = case when remaining_quantity - v_take = 0 then 'depleted' else status end,
          updated_at = now()
      where id = v_batch.id
        and organization_id = p_organization_id;

      insert into public.stock_movement_batch_allocations (
        organization_id,
        movement_item_id,
        batch_id,
        quantity
      ) values (
        p_organization_id,
        v_movement_item_id,
        v_batch.id,
        v_take
      );

      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining <> 0 then
      raise exception 'INSUFFICIENT_BATCH_STOCK' using errcode = '22023';
    end if;
  end if;

  update public.inventory_balances
  set quantity_on_hand = v_next_quantity,
      average_cost = case when v_next_quantity = 0 then 0 else v_current_cost end,
      updated_at = now()
  where organization_id = p_organization_id
    and stock_item_id = p_stock_item_id
    and stock_location_id = p_stock_location_id;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_data,
    metadata
  ) values (
    p_organization_id,
    v_user_id,
    p_audit_action,
    'stock_movement',
    p_command_id,
    jsonb_build_object(
      'stock_item_id', p_stock_item_id,
      'stock_location_id', p_stock_location_id,
      'quantity', p_quantity,
      'unit_cost_snapshot', v_current_cost,
      'previous_quantity', v_current_quantity,
      'quantity_on_hand', v_next_quantity,
      'preferred_batch_id', p_preferred_batch_id,
      'movement_type', p_movement_type,
      'reason_code', p_reason_code
    ),
    jsonb_build_object(
      'source', p_audit_source,
      'allow_negative_stock', v_allow_negative
    )
  );

  return query
  select p_command_id,
         v_next_quantity,
         case when v_next_quantity = 0 then 0::numeric else v_current_cost end;
end;
$$;

revoke all on function private.record_stock_outflow(uuid,uuid,uuid,uuid,numeric,uuid,text,text,text,text,text) from public, anon, authenticated;

create or replace function private.record_stock_withdrawal(
  p_command_id uuid,
  p_organization_id uuid,
  p_stock_item_id uuid,
  p_stock_location_id uuid,
  p_quantity numeric,
  p_preferred_batch_id uuid default null,
  p_notes text default null
)
returns table (
  movement_id uuid,
  quantity_on_hand numeric,
  average_cost numeric
)
language sql
security definer
set search_path = ''
as $$
  select *
  from private.record_stock_outflow(
    p_command_id,
    p_organization_id,
    p_stock_item_id,
    p_stock_location_id,
    p_quantity,
    p_preferred_batch_id,
    p_notes,
    'withdrawal',
    'manual_withdrawal',
    'stock_withdrawal.recorded',
    'record_stock_withdrawal_rpc'
  );
$$;

revoke all on function private.record_stock_withdrawal(uuid,uuid,uuid,uuid,numeric,uuid,text) from public, anon, authenticated;

create or replace function private.record_stock_loss(
  p_command_id uuid,
  p_organization_id uuid,
  p_stock_item_id uuid,
  p_stock_location_id uuid,
  p_quantity numeric,
  p_reason_code text,
  p_preferred_batch_id uuid default null,
  p_notes text default null
)
returns table (
  movement_id uuid,
  movement_type text,
  reason_code text,
  quantity_on_hand numeric,
  average_cost numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason_code text := lower(trim(p_reason_code));
  v_movement_type text;
  v_track_batch boolean;
  v_track_expiration boolean;
  v_batch_expiration date;
  v_batch_remaining numeric(18,3);
begin
  if p_quantity is null or p_quantity <= 0 or scale(p_quantity) > 3 then
    raise exception 'INVALID_STOCK_QUANTITY' using errcode = '22023';
  end if;

  select reason.movement_type
    into v_movement_type
  from public.stock_loss_reasons reason
  where reason.organization_id = p_organization_id
    and reason.code = v_reason_code
    and reason.active;

  if not found then
    raise exception 'STOCK_LOSS_REASON_NOT_AVAILABLE' using errcode = '22023';
  end if;

  select item.track_batch, item.track_expiration
    into v_track_batch, v_track_expiration
  from public.stock_items item
  where item.id = p_stock_item_id
    and item.organization_id = p_organization_id
    and item.active;

  if not found then
    raise exception 'STOCK_ITEM_NOT_AVAILABLE' using errcode = '23503';
  end if;

  if v_movement_type = 'expiration' and (v_track_batch or v_track_expiration) then
    if p_preferred_batch_id is null then
      raise exception 'EXPIRATION_BATCH_REQUIRED' using errcode = '22023';
    end if;

    select batch.expiration_date, batch.remaining_quantity
      into v_batch_expiration, v_batch_remaining
    from public.inventory_batches batch
    where batch.id = p_preferred_batch_id
      and batch.organization_id = p_organization_id
      and batch.stock_item_id = p_stock_item_id
      and batch.stock_location_id = p_stock_location_id
      and batch.status = 'active'
      and batch.remaining_quantity > 0;

    if not found then
      raise exception 'BATCH_NOT_AVAILABLE' using errcode = '22023';
    end if;

    if v_batch_expiration is null or v_batch_expiration > current_date then
      raise exception 'BATCH_NOT_EXPIRED' using errcode = '22023';
    end if;

    if v_batch_remaining < p_quantity then
      raise exception 'EXPIRATION_EXCEEDS_BATCH_STOCK' using errcode = '22023';
    end if;
  end if;

  return query
  select outflow.movement_id,
         v_movement_type,
         v_reason_code,
         outflow.quantity_on_hand,
         outflow.average_cost
  from private.record_stock_outflow(
    p_command_id,
    p_organization_id,
    p_stock_item_id,
    p_stock_location_id,
    p_quantity,
    p_preferred_batch_id,
    p_notes,
    v_movement_type,
    v_reason_code,
    'stock_loss.recorded',
    'record_stock_loss_rpc'
  ) outflow;
end;
$$;

revoke all on function private.record_stock_loss(uuid,uuid,uuid,uuid,numeric,text,uuid,text) from public, anon, authenticated;

create or replace function public.record_stock_loss(
  p_command_id uuid,
  p_organization_id uuid,
  p_stock_item_id uuid,
  p_stock_location_id uuid,
  p_quantity numeric,
  p_reason_code text,
  p_preferred_batch_id uuid default null,
  p_notes text default null
)
returns table (
  movement_id uuid,
  movement_type text,
  reason_code text,
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

  if not private.has_org_role(p_organization_id, array['owner','admin','manager','inventory']) then
    raise exception 'INSUFFICIENT_ROLE' using errcode = '42501';
  end if;

  if not private.has_stock_location_role(
    p_organization_id,
    p_stock_location_id,
    array['owner','admin','manager','inventory']
  ) then
    raise exception 'INSUFFICIENT_SCOPE' using errcode = '42501';
  end if;

  return query
  select * from private.record_stock_loss(
    p_command_id,
    p_organization_id,
    p_stock_item_id,
    p_stock_location_id,
    p_quantity,
    p_reason_code,
    p_preferred_batch_id,
    p_notes
  );
end;
$$;

revoke all on function public.record_stock_loss(uuid,uuid,uuid,uuid,numeric,text,uuid,text) from public, anon, authenticated;
grant execute on function public.record_stock_loss(uuid,uuid,uuid,uuid,numeric,text,uuid,text) to authenticated;
