alter table public.stock_transfer_batch_allocations
  add column if not exists allocation_order integer;

with ranked as (
  select
    id,
    row_number() over (
      partition by transfer_item_id
      order by created_at asc, id asc
    )::integer as allocation_order
  from public.stock_transfer_batch_allocations
)
update public.stock_transfer_batch_allocations allocation
set allocation_order = ranked.allocation_order
from ranked
where allocation.id = ranked.id
  and allocation.allocation_order is null;

alter table public.stock_transfer_batch_allocations
  alter column allocation_order set not null;

alter table public.stock_transfer_batch_allocations
  add constraint stock_transfer_batch_allocations_order_positive
  check (allocation_order > 0);

create unique index stock_transfer_batch_allocations_order_idx
  on public.stock_transfer_batch_allocations(transfer_item_id, allocation_order);

create or replace function private.replenishment_average_cost(
  p_current_quantity numeric,
  p_current_cost numeric,
  p_incoming_quantity numeric,
  p_incoming_cost numeric
)
returns numeric
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_next_quantity numeric;
begin
  v_next_quantity := p_current_quantity + p_incoming_quantity;

  if v_next_quantity = 0 then
    return 0;
  end if;

  if p_current_quantity <= 0 then
    return round(p_incoming_cost, 2);
  end if;

  return round(
    ((p_current_quantity * p_current_cost) + (p_incoming_quantity * p_incoming_cost))
    / v_next_quantity,
    2
  );
end;
$$;

revoke all on function private.replenishment_average_cost(numeric, numeric, numeric, numeric)
  from public, anon, authenticated;

create or replace function public.record_stock_entry(
  p_command_id uuid,
  p_organization_id uuid,
  p_stock_item_id uuid,
  p_stock_location_id uuid,
  p_quantity numeric,
  p_unit_cost numeric,
  p_batch_code text default null,
  p_expiration_date date default null,
  p_notes text default null
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
  v_next_cost numeric(18,2);
  v_track_batch boolean;
  v_track_expiration boolean;
  v_movement_item_id uuid;
  v_batch_id uuid;
  v_existing_org uuid;
  v_existing_type text;
  v_existing_location uuid;
  v_existing_item uuid;
  v_existing_quantity numeric(18,3);
  v_existing_cost numeric(18,2);
  v_existing_notes text;
  v_existing_batch_code text;
  v_existing_expiration date;
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

  if p_unit_cost is null or p_unit_cost < 0 or scale(p_unit_cost) > 2 then
    raise exception 'INVALID_STOCK_COST' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_command_id::text, 0)
  );

  select
    movement.organization_id,
    movement.movement_type,
    movement.destination_location_id,
    item.stock_item_id,
    item.quantity,
    item.unit_cost_snapshot,
    movement.notes,
    batch.batch_code,
    batch.expiration_date
  into
    v_existing_org,
    v_existing_type,
    v_existing_location,
    v_existing_item,
    v_existing_quantity,
    v_existing_cost,
    v_existing_notes,
    v_existing_batch_code,
    v_existing_expiration
  from public.stock_movements movement
  left join public.stock_movement_items item
    on item.movement_id = movement.id
   and item.organization_id = movement.organization_id
  left join public.stock_movement_batch_allocations allocation
    on allocation.movement_item_id = item.id
   and allocation.organization_id = movement.organization_id
  left join public.inventory_batches batch
    on batch.id = allocation.batch_id
   and batch.organization_id = movement.organization_id
  where movement.id = p_command_id
  limit 1;

  if found then
    if v_existing_org <> p_organization_id
      or v_existing_type <> 'entry'
      or v_existing_location is distinct from p_stock_location_id
      or v_existing_item is distinct from p_stock_item_id
      or v_existing_quantity is distinct from p_quantity
      or v_existing_cost is distinct from round(p_unit_cost, 2)
      or v_existing_notes is distinct from nullif(trim(p_notes), '')
      or v_existing_batch_code is distinct from nullif(trim(p_batch_code), '')
      or v_existing_expiration is distinct from p_expiration_date
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

  perform 1
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

  v_next_quantity := v_current_quantity + p_quantity;
  v_next_cost := private.replenishment_average_cost(
    v_current_quantity,
    v_current_cost,
    p_quantity,
    p_unit_cost
  );

  update public.inventory_balances
  set quantity_on_hand = v_next_quantity,
      average_cost = v_next_cost,
      updated_at = now()
  where organization_id = p_organization_id
    and stock_item_id = p_stock_item_id
    and stock_location_id = p_stock_location_id;

  insert into public.stock_movements (
    id,
    organization_id,
    movement_type,
    occurred_at,
    destination_location_id,
    responsible_user_id,
    reason_code,
    notes,
    status
  ) values (
    p_command_id,
    p_organization_id,
    'entry',
    now(),
    p_stock_location_id,
    v_user_id,
    'manual_entry',
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
    round(p_unit_cost, 2)
  );

  if v_track_batch
    or v_track_expiration
    or nullif(trim(p_batch_code), '') is not null
    or p_expiration_date is not null
  then
    v_batch_id := gen_random_uuid();
    insert into public.inventory_batches (
      id,
      organization_id,
      stock_item_id,
      stock_location_id,
      batch_code,
      expiration_date,
      received_at,
      original_quantity,
      remaining_quantity,
      unit_cost,
      source_type,
      source_reference_id,
      status
    ) values (
      v_batch_id,
      p_organization_id,
      p_stock_item_id,
      p_stock_location_id,
      nullif(trim(p_batch_code), ''),
      p_expiration_date,
      now(),
      p_quantity,
      p_quantity,
      round(p_unit_cost, 2),
      'entry',
      p_command_id,
      'active'
    );

    insert into public.stock_movement_batch_allocations (
      organization_id,
      movement_item_id,
      batch_id,
      quantity
    ) values (
      p_organization_id,
      v_movement_item_id,
      v_batch_id,
      p_quantity
    );
  end if;

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
    'stock_entry.recorded',
    'stock_movement',
    p_command_id,
    jsonb_build_object(
      'stock_item_id', p_stock_item_id,
      'stock_location_id', p_stock_location_id,
      'quantity', p_quantity,
      'unit_cost', round(p_unit_cost, 2),
      'quantity_on_hand', v_next_quantity,
      'average_cost', v_next_cost
    ),
    jsonb_build_object('source', 'record_stock_entry_rpc')
  );

  return query select p_command_id, v_next_quantity, v_next_cost;
end;
$$;

revoke all on function public.record_stock_entry(
  uuid, uuid, uuid, uuid, numeric, numeric, text, date, text
) from public, anon;
grant execute on function public.record_stock_entry(
  uuid, uuid, uuid, uuid, numeric, numeric, text, date, text
) to authenticated;

create or replace function public.dispatch_stock_transfer(
  p_command_id uuid,
  p_organization_id uuid,
  p_stock_item_id uuid,
  p_source_location_id uuid,
  p_destination_location_id uuid,
  p_quantity numeric,
  p_preferred_batch_id uuid default null,
  p_notes text default null
)
returns table (
  transfer_id uuid,
  transfer_status text,
  dispatched_quantity numeric,
  received_quantity numeric
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
  v_transfer_item_id uuid;
  v_movement_item_id uuid;
  v_remaining numeric(18,3);
  v_take numeric(18,3);
  v_allocation_order integer := 0;
  v_existing_org uuid;
  v_existing_source uuid;
  v_existing_destination uuid;
  v_existing_status text;
  v_existing_item uuid;
  v_existing_dispatched numeric(18,3);
  v_existing_received numeric(18,3);
  v_existing_notes text;
  v_existing_preferred_batch_id uuid;
  v_existing_audit boolean;
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

  if p_source_location_id = p_destination_location_id then
    raise exception 'SAME_TRANSFER_LOCATION' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_command_id::text, 0)
  );

  select
    transfer.organization_id,
    transfer.source_location_id,
    transfer.destination_location_id,
    transfer.status,
    item.stock_item_id,
    item.dispatched_quantity,
    item.received_quantity,
    transfer.notes,
    (
      select nullif(audit.after_data ->> 'preferred_batch_id', '')::uuid
      from public.audit_logs audit
      where audit.organization_id = transfer.organization_id
        and audit.entity_type = 'stock_transfer'
        and audit.entity_id = transfer.id
        and audit.action = 'stock_transfer.dispatched'
      order by audit.occurred_at desc
      limit 1
    ),
    exists (
      select 1
      from public.audit_logs audit
      where audit.organization_id = transfer.organization_id
        and audit.entity_type = 'stock_transfer'
        and audit.entity_id = transfer.id
        and audit.action = 'stock_transfer.dispatched'
    )
  into
    v_existing_org,
    v_existing_source,
    v_existing_destination,
    v_existing_status,
    v_existing_item,
    v_existing_dispatched,
    v_existing_received,
    v_existing_notes,
    v_existing_preferred_batch_id,
    v_existing_audit
  from public.stock_transfers transfer
  left join public.stock_transfer_items item
    on item.transfer_id = transfer.id
   and item.organization_id = transfer.organization_id
  where transfer.id = p_command_id
  limit 1;

  if found then
    if not v_existing_audit
      or v_existing_org <> p_organization_id
      or v_existing_source <> p_source_location_id
      or v_existing_destination <> p_destination_location_id
      or v_existing_item is distinct from p_stock_item_id
      or v_existing_dispatched is distinct from p_quantity
      or v_existing_notes is distinct from nullif(trim(p_notes), '')
      or v_existing_preferred_batch_id is distinct from p_preferred_batch_id
    then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;

    return query
    select
      p_command_id,
      v_existing_status,
      v_existing_dispatched,
      v_existing_received;
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

  perform 1
  from public.stock_locations location
  where location.id = p_source_location_id
    and location.organization_id = p_organization_id
    and location.status = 'active';

  if not found then
    raise exception 'SOURCE_LOCATION_NOT_AVAILABLE' using errcode = '23503';
  end if;

  perform 1
  from public.stock_locations location
  where location.id = p_destination_location_id
    and location.organization_id = p_organization_id
    and location.status = 'active';

  if not found then
    raise exception 'DESTINATION_LOCATION_NOT_AVAILABLE' using errcode = '23503';
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
    p_source_location_id,
    0,
    0
  )
  on conflict (organization_id, stock_item_id, stock_location_id) do nothing;

  select balance.quantity_on_hand, balance.average_cost
    into v_current_quantity, v_current_cost
  from public.inventory_balances balance
  where balance.organization_id = p_organization_id
    and balance.stock_item_id = p_stock_item_id
    and balance.stock_location_id = p_source_location_id
  for update;

  if v_current_quantity < p_quantity then
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
      and batch.stock_location_id = p_source_location_id
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
        and batch.stock_location_id = p_source_location_id
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
        and batch.stock_location_id = p_source_location_id
        and batch.status = 'active'
        and batch.remaining_quantity > 0
    ), 0) < p_quantity then
      raise exception 'INSUFFICIENT_BATCH_STOCK' using errcode = '22023';
    end if;
  end if;

  v_next_quantity := v_current_quantity - p_quantity;

  insert into public.stock_transfers (
    id,
    organization_id,
    source_location_id,
    destination_location_id,
    status,
    requested_at,
    dispatched_at,
    responsible_user_id,
    notes
  ) values (
    p_command_id,
    p_organization_id,
    p_source_location_id,
    p_destination_location_id,
    'dispatched',
    now(),
    now(),
    v_user_id,
    nullif(trim(p_notes), '')
  );

  v_transfer_item_id := gen_random_uuid();
  insert into public.stock_transfer_items (
    id,
    organization_id,
    transfer_id,
    stock_item_id,
    requested_quantity,
    dispatched_quantity,
    received_quantity,
    unit_cost_snapshot
  ) values (
    v_transfer_item_id,
    p_organization_id,
    p_command_id,
    p_stock_item_id,
    p_quantity,
    p_quantity,
    0,
    v_current_cost
  );

  insert into public.stock_movements (
    id,
    organization_id,
    movement_type,
    occurred_at,
    source_location_id,
    destination_location_id,
    responsible_user_id,
    reference_type,
    reference_id,
    notes,
    status
  ) values (
    p_command_id,
    p_organization_id,
    'transfer_out',
    now(),
    p_source_location_id,
    p_destination_location_id,
    v_user_id,
    'stock_transfer',
    p_command_id,
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
      select
        batch.id,
        batch.remaining_quantity,
        batch.batch_code,
        batch.expiration_date,
        batch.unit_cost
      from public.inventory_batches batch
      where batch.organization_id = p_organization_id
        and batch.stock_item_id = p_stock_item_id
        and batch.stock_location_id = p_source_location_id
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

      v_allocation_order := v_allocation_order + 1;

      update public.inventory_batches
      set remaining_quantity = remaining_quantity - v_take,
          status = case when remaining_quantity - v_take = 0 then 'depleted' else status end,
          updated_at = now()
      where id = v_batch.id
        and organization_id = p_organization_id;

      insert into public.stock_transfer_batch_allocations (
        organization_id,
        transfer_item_id,
        source_batch_id,
        destination_batch_id,
        quantity,
        received_quantity,
        batch_code_snapshot,
        expiration_date_snapshot,
        unit_cost_snapshot,
        allocation_order
      ) values (
        p_organization_id,
        v_transfer_item_id,
        v_batch.id,
        null,
        v_take,
        0,
        v_batch.batch_code,
        v_batch.expiration_date,
        v_batch.unit_cost,
        v_allocation_order
      );

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
    and stock_location_id = p_source_location_id;

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
    'stock_transfer.dispatched',
    'stock_transfer',
    p_command_id,
    jsonb_build_object(
      'stock_item_id', p_stock_item_id,
      'source_location_id', p_source_location_id,
      'destination_location_id', p_destination_location_id,
      'quantity', p_quantity,
      'unit_cost_snapshot', v_current_cost,
      'preferred_batch_id', p_preferred_batch_id
    ),
    jsonb_build_object(
      'source', 'dispatch_stock_transfer_rpc',
      'command_id', p_command_id
    )
  );

  return query select p_command_id, 'dispatched'::text, p_quantity, 0::numeric;
end;
$$;

revoke all on function public.dispatch_stock_transfer(
  uuid, uuid, uuid, uuid, uuid, numeric, uuid, text
) from public, anon;
grant execute on function public.dispatch_stock_transfer(
  uuid, uuid, uuid, uuid, uuid, numeric, uuid, text
) to authenticated;

create or replace function public.receive_stock_transfer(
  p_command_id uuid,
  p_organization_id uuid,
  p_transfer_id uuid,
  p_quantity numeric default null
)
returns table (
  transfer_id uuid,
  transfer_status text,
  dispatched_quantity numeric,
  received_quantity numeric,
  received_now numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_org uuid;
  v_existing_type text;
  v_existing_transfer_id uuid;
  v_existing_received_now numeric(18,3);
  v_existing_requested_quantity numeric;
  v_existing_audit boolean;
  v_status text;
  v_source_location_id uuid;
  v_destination_location_id uuid;
  v_transfer_item_id uuid;
  v_stock_item_id uuid;
  v_dispatched numeric(18,3);
  v_received numeric(18,3);
  v_line_cost numeric(18,2);
  v_pending numeric(18,3);
  v_receive_quantity numeric(18,3);
  v_next_received numeric(18,3);
  v_completed boolean;
  v_destination_quantity numeric(18,3);
  v_destination_cost numeric(18,2);
  v_next_destination_quantity numeric(18,3);
  v_next_destination_cost numeric(18,2);
  v_movement_item_id uuid;
  v_remaining numeric(18,3);
  v_take numeric(18,3);
  v_destination_batch_id uuid;
  v_destination_batch_status text;
  v_allocation record;
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

  if p_quantity is not null and (p_quantity <= 0 or scale(p_quantity) > 3) then
    raise exception 'INVALID_STOCK_QUANTITY' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_command_id::text, 0)
  );

  select
    movement.organization_id,
    movement.movement_type,
    movement.reference_id,
    item.quantity,
    (
      select (audit.metadata ->> 'requested_quantity')::numeric
      from public.audit_logs audit
      where audit.organization_id = movement.organization_id
        and audit.action = 'stock_transfer.received'
        and audit.metadata ->> 'command_id' = p_command_id::text
      order by audit.occurred_at desc
      limit 1
    ),
    exists (
      select 1
      from public.audit_logs audit
      where audit.organization_id = movement.organization_id
        and audit.action = 'stock_transfer.received'
        and audit.metadata ->> 'command_id' = p_command_id::text
    )
  into
    v_existing_org,
    v_existing_type,
    v_existing_transfer_id,
    v_existing_received_now,
    v_existing_requested_quantity,
    v_existing_audit
  from public.stock_movements movement
  left join public.stock_movement_items item
    on item.movement_id = movement.id
   and item.organization_id = movement.organization_id
  where movement.id = p_command_id
  limit 1;

  if found then
    if not v_existing_audit
      or v_existing_org <> p_organization_id
      or v_existing_type <> 'transfer_in'
      or v_existing_transfer_id is distinct from p_transfer_id
      or v_existing_requested_quantity is distinct from p_quantity
    then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;

    return query
    select
      transfer.id,
      transfer.status,
      item.dispatched_quantity,
      item.received_quantity,
      v_existing_received_now
    from public.stock_transfers transfer
    join public.stock_transfer_items item
      on item.transfer_id = transfer.id
     and item.organization_id = transfer.organization_id
    where transfer.id = p_transfer_id
      and transfer.organization_id = p_organization_id
    limit 1;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('stock_transfer:' || p_transfer_id::text, 0)
  );

  select
    transfer.status,
    transfer.source_location_id,
    transfer.destination_location_id
  into
    v_status,
    v_source_location_id,
    v_destination_location_id
  from public.stock_transfers transfer
  where transfer.id = p_transfer_id
    and transfer.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'TRANSFER_NOT_FOUND' using errcode = '23503';
  end if;

  if v_status not in ('dispatched', 'partially_received') then
    raise exception 'TRANSFER_NOT_RECEIVABLE' using errcode = '22023';
  end if;

  if (
    select count(*)
    from public.stock_transfer_items item
    where item.transfer_id = p_transfer_id
      and item.organization_id = p_organization_id
  ) <> 1 then
    raise exception 'TRANSFER_ITEM_SHAPE_UNSUPPORTED' using errcode = '22023';
  end if;

  select
    item.id,
    item.stock_item_id,
    item.dispatched_quantity,
    item.received_quantity,
    item.unit_cost_snapshot
  into
    v_transfer_item_id,
    v_stock_item_id,
    v_dispatched,
    v_received,
    v_line_cost
  from public.stock_transfer_items item
  where item.transfer_id = p_transfer_id
    and item.organization_id = p_organization_id
  for update;

  v_pending := v_dispatched - v_received;
  v_receive_quantity := coalesce(p_quantity, v_pending);

  if v_receive_quantity <= 0 then
    raise exception 'TRANSFER_NOT_RECEIVABLE' using errcode = '22023';
  end if;

  if v_receive_quantity > v_pending then
    raise exception 'TRANSFER_RECEIPT_EXCEEDS_PENDING' using errcode = '22023';
  end if;

  insert into public.inventory_balances (
    organization_id,
    stock_item_id,
    stock_location_id,
    quantity_on_hand,
    average_cost
  ) values (
    p_organization_id,
    v_stock_item_id,
    v_destination_location_id,
    0,
    0
  )
  on conflict (organization_id, stock_item_id, stock_location_id) do nothing;

  select balance.quantity_on_hand, balance.average_cost
    into v_destination_quantity, v_destination_cost
  from public.inventory_balances balance
  where balance.organization_id = p_organization_id
    and balance.stock_item_id = v_stock_item_id
    and balance.stock_location_id = v_destination_location_id
  for update;

  v_next_destination_quantity := v_destination_quantity + v_receive_quantity;
  v_next_destination_cost := private.replenishment_average_cost(
    v_destination_quantity,
    v_destination_cost,
    v_receive_quantity,
    v_line_cost
  );

  insert into public.stock_movements (
    id,
    organization_id,
    movement_type,
    occurred_at,
    source_location_id,
    destination_location_id,
    responsible_user_id,
    reference_type,
    reference_id,
    notes,
    status
  )
  select
    p_command_id,
    p_organization_id,
    'transfer_in',
    now(),
    transfer.source_location_id,
    transfer.destination_location_id,
    v_user_id,
    'stock_transfer',
    transfer.id,
    transfer.notes,
    'confirmed'
  from public.stock_transfers transfer
  where transfer.id = p_transfer_id
    and transfer.organization_id = p_organization_id;

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
    v_stock_item_id,
    v_receive_quantity,
    v_line_cost
  );

  if exists (
    select 1
    from public.stock_transfer_batch_allocations allocation
    where allocation.transfer_item_id = v_transfer_item_id
      and allocation.organization_id = p_organization_id
  ) then
    perform 1
    from public.stock_transfer_batch_allocations allocation
    where allocation.transfer_item_id = v_transfer_item_id
      and allocation.organization_id = p_organization_id
    order by allocation.allocation_order
    for update;

    if coalesce((
      select sum(allocation.quantity - allocation.received_quantity)
      from public.stock_transfer_batch_allocations allocation
      where allocation.transfer_item_id = v_transfer_item_id
        and allocation.organization_id = p_organization_id
    ), 0) < v_receive_quantity then
      raise exception 'TRANSFER_BATCH_RECEIPT_MISMATCH' using errcode = '22023';
    end if;

    v_remaining := v_receive_quantity;
    for v_allocation in
      select
        allocation.id,
        allocation.destination_batch_id,
        allocation.quantity,
        allocation.received_quantity,
        allocation.batch_code_snapshot,
        allocation.expiration_date_snapshot,
        allocation.unit_cost_snapshot,
        allocation.allocation_order
      from public.stock_transfer_batch_allocations allocation
      where allocation.transfer_item_id = v_transfer_item_id
        and allocation.organization_id = p_organization_id
      order by allocation.allocation_order
    loop
      exit when v_remaining = 0;
      v_take := least(
        v_allocation.quantity - v_allocation.received_quantity,
        v_remaining
      );

      if v_take <= 0 then
        continue;
      end if;

      v_destination_batch_id := v_allocation.destination_batch_id;

      if v_destination_batch_id is null then
        v_destination_batch_id := gen_random_uuid();

        insert into public.inventory_batches (
          id,
          organization_id,
          stock_item_id,
          stock_location_id,
          batch_code,
          expiration_date,
          received_at,
          original_quantity,
          remaining_quantity,
          unit_cost,
          source_type,
          source_reference_id,
          status
        ) values (
          v_destination_batch_id,
          p_organization_id,
          v_stock_item_id,
          v_destination_location_id,
          v_allocation.batch_code_snapshot,
          v_allocation.expiration_date_snapshot,
          now(),
          v_take,
          v_take,
          v_allocation.unit_cost_snapshot,
          'transfer',
          p_transfer_id,
          'active'
        );

        update public.stock_transfer_batch_allocations
        set destination_batch_id = v_destination_batch_id,
            received_quantity = received_quantity + v_take
        where id = v_allocation.id
          and organization_id = p_organization_id;
      else
        select batch.status
          into v_destination_batch_status
        from public.inventory_batches batch
        where batch.id = v_destination_batch_id
          and batch.organization_id = p_organization_id
          and batch.stock_item_id = v_stock_item_id
          and batch.stock_location_id = v_destination_location_id
          and batch.source_type = 'transfer'
          and batch.source_reference_id = p_transfer_id
          and batch.batch_code is not distinct from v_allocation.batch_code_snapshot
          and batch.expiration_date is not distinct from v_allocation.expiration_date_snapshot
          and batch.unit_cost = v_allocation.unit_cost_snapshot
        for update;

        if not found or v_destination_batch_status = 'cancelled' then
          raise exception 'TRANSFER_DESTINATION_BATCH_MISMATCH' using errcode = '22023';
        end if;

        update public.inventory_batches
        set original_quantity = original_quantity + v_take,
            remaining_quantity = remaining_quantity + v_take,
            status = case when status = 'depleted' then 'active' else status end,
            updated_at = now()
        where id = v_destination_batch_id
          and organization_id = p_organization_id;

        update public.stock_transfer_batch_allocations
        set received_quantity = received_quantity + v_take
        where id = v_allocation.id
          and organization_id = p_organization_id;
      end if;

      insert into public.stock_movement_batch_allocations (
        organization_id,
        movement_item_id,
        batch_id,
        quantity
      ) values (
        p_organization_id,
        v_movement_item_id,
        v_destination_batch_id,
        v_take
      );

      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining <> 0 then
      raise exception 'TRANSFER_BATCH_RECEIPT_MISMATCH' using errcode = '22023';
    end if;
  end if;

  update public.inventory_balances
  set quantity_on_hand = v_next_destination_quantity,
      average_cost = v_next_destination_cost,
      updated_at = now()
  where organization_id = p_organization_id
    and stock_item_id = v_stock_item_id
    and stock_location_id = v_destination_location_id;

  v_next_received := v_received + v_receive_quantity;
  v_completed := v_next_received = v_dispatched;

  update public.stock_transfer_items
  set received_quantity = v_next_received
  where id = v_transfer_item_id
    and organization_id = p_organization_id;

  update public.stock_transfers
  set status = case when v_completed then 'received' else 'partially_received' end,
      received_at = case when v_completed then now() else received_at end,
      updated_at = now()
  where id = p_transfer_id
    and organization_id = p_organization_id;

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
    'stock_transfer.received',
    'stock_transfer',
    p_transfer_id,
    jsonb_build_object(
      'stock_item_id', v_stock_item_id,
      'received_now', v_receive_quantity,
      'received_total', v_next_received,
      'dispatched_quantity', v_dispatched,
      'status', case when v_completed then 'received' else 'partially_received' end,
      'destination_quantity_on_hand', v_next_destination_quantity,
      'destination_average_cost', v_next_destination_cost
    ),
    jsonb_build_object(
      'source', 'receive_stock_transfer_rpc',
      'command_id', p_command_id,
      'requested_quantity', p_quantity
    )
  );

  return query
  select
    p_transfer_id,
    case when v_completed then 'received'::text else 'partially_received'::text end,
    v_dispatched,
    v_next_received,
    v_receive_quantity;
end;
$$;

revoke all on function public.receive_stock_transfer(
  uuid, uuid, uuid, numeric
) from public, anon;
grant execute on function public.receive_stock_transfer(
  uuid, uuid, uuid, numeric
) to authenticated;
