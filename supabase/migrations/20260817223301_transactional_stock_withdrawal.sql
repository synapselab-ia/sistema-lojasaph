alter table public.inventory_balances
  drop constraint if exists inventory_balances_quantity_on_hand_check;

create or replace function private.enforce_inventory_balance_negative_policy()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.quantity_on_hand < 0 and not exists (
    select 1
    from public.stock_locations location
    where location.id = new.stock_location_id
      and location.organization_id = new.organization_id
      and location.allow_negative_stock
  ) then
    raise exception 'NEGATIVE_STOCK_NOT_ALLOWED' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_inventory_balance_negative_policy() from public, anon, authenticated;

drop trigger if exists inventory_balances_negative_policy on public.inventory_balances;
create trigger inventory_balances_negative_policy
before insert or update of organization_id, stock_location_id, quantity_on_hand
on public.inventory_balances
for each row execute function private.enforce_inventory_balance_negative_policy();

create or replace function private.enforce_stock_location_negative_policy_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.allow_negative_stock
    and not new.allow_negative_stock
    and exists (
      select 1
      from public.inventory_balances balance
      where balance.organization_id = new.organization_id
        and balance.stock_location_id = new.id
        and balance.quantity_on_hand < 0
    )
  then
    raise exception 'NEGATIVE_BALANCE_EXISTS' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_stock_location_negative_policy_change() from public, anon, authenticated;

drop trigger if exists stock_locations_negative_policy_change on public.stock_locations;
create trigger stock_locations_negative_policy_change
before update of allow_negative_stock
on public.stock_locations
for each row execute function private.enforce_stock_location_negative_policy_change();

create or replace function public.record_stock_withdrawal(
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

  -- Serialize retries of the same command before the idempotency lookup.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_command_id::text, 0));

  select movement.organization_id,
         movement.movement_type,
         movement.source_location_id,
         item.stock_item_id,
         item.quantity,
         movement.notes,
         (
           select nullif(audit.after_data ->> 'preferred_batch_id', '')::uuid
           from public.audit_logs audit
           where audit.organization_id = movement.organization_id
             and audit.entity_type = 'stock_movement'
             and audit.entity_id = movement.id
             and audit.action = 'stock_withdrawal.recorded'
           order by audit.occurred_at desc
           limit 1
         )
    into v_existing_org,
         v_existing_type,
         v_existing_location,
         v_existing_item,
         v_existing_quantity,
         v_existing_notes,
         v_existing_preferred_batch_id
  from public.stock_movements movement
  left join public.stock_movement_items item
    on item.movement_id = movement.id
   and item.organization_id = movement.organization_id
  where movement.id = p_command_id;

  if found then
    if v_existing_org <> p_organization_id
      or v_existing_type <> 'withdrawal'
      or v_existing_location is distinct from p_stock_location_id
      or v_existing_item is distinct from p_stock_item_id
      or v_existing_quantity is distinct from p_quantity
      or v_existing_notes is distinct from nullif(trim(p_notes), '')
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
    -- Lock every candidate in deterministic ID order before FEFO allocation.
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
    'withdrawal',
    now(),
    p_stock_location_id,
    v_user_id,
    'manual_withdrawal',
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
    'stock_withdrawal.recorded',
    'stock_movement',
    p_command_id,
    jsonb_build_object(
      'stock_item_id', p_stock_item_id,
      'stock_location_id', p_stock_location_id,
      'quantity', p_quantity,
      'unit_cost_snapshot', v_current_cost,
      'previous_quantity', v_current_quantity,
      'quantity_on_hand', v_next_quantity,
      'preferred_batch_id', p_preferred_batch_id
    ),
    jsonb_build_object(
      'source', 'record_stock_withdrawal_rpc',
      'allow_negative_stock', v_allow_negative
    )
  );

  return query
  select p_command_id,
         v_next_quantity,
         case when v_next_quantity = 0 then 0::numeric else v_current_cost end;
end;
$$;

revoke all on function public.record_stock_withdrawal(uuid, uuid, uuid, uuid, numeric, uuid, text) from public, anon;
grant execute on function public.record_stock_withdrawal(uuid, uuid, uuid, uuid, numeric, uuid, text) to authenticated;
