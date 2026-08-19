-- Fase 21 / Issue #53: related return of a confirmed withdrawal.
-- The existing reversal_of_movement_id relationship is intentionally reused:
-- multiple return_in movements may reference the same withdrawal for partial returns.

create index if not exists stock_movements_reversal_org_idx
  on public.stock_movements(reversal_of_movement_id, organization_id, occurred_at)
  where reversal_of_movement_id is not null;

create or replace function private.record_stock_return(
  p_command_id uuid,
  p_organization_id uuid,
  p_withdrawal_movement_id uuid,
  p_quantity numeric,
  p_notes text default null
)
returns table (
  movement_id uuid,
  withdrawal_movement_id uuid,
  stock_item_id uuid,
  stock_location_id uuid,
  returned_quantity numeric,
  remaining_returnable_quantity numeric,
  quantity_on_hand numeric,
  average_cost numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_org uuid;
  v_existing_type text;
  v_existing_reversal uuid;
  v_existing_location uuid;
  v_existing_item uuid;
  v_existing_quantity numeric(18,3);
  v_existing_notes text;
  v_existing_reason text;

  v_source_location_id uuid;
  v_original_item_id uuid;
  v_stock_item_id uuid;
  v_original_quantity numeric(18,3);
  v_original_unit_cost numeric(18,2);
  v_track_batch boolean;
  v_track_expiration boolean;
  v_returned_before numeric(18,3);
  v_returned_total numeric(18,3);
  v_remaining_returnable numeric(18,3);

  v_current_quantity numeric(18,3);
  v_current_cost numeric(18,2);
  v_next_quantity numeric(18,3);
  v_next_cost numeric(18,2);
  v_return_item_id uuid;

  v_remaining numeric(18,3);
  v_take numeric(18,3);
  v_available numeric(18,3);
  v_batch_remaining numeric(18,3);
  v_batch_original numeric(18,3);
  v_batch_status text;
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

  if p_quantity is null or p_quantity <= 0 or scale(p_quantity) > 3 then
    raise exception 'INVALID_STOCK_QUANTITY' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('stock-return-command:' || p_command_id::text, 0)
  );

  select movement.organization_id,
         movement.movement_type,
         movement.reversal_of_movement_id,
         movement.destination_location_id,
         item.stock_item_id,
         item.quantity,
         movement.notes,
         movement.reason_code
    into v_existing_org,
         v_existing_type,
         v_existing_reversal,
         v_existing_location,
         v_existing_item,
         v_existing_quantity,
         v_existing_notes,
         v_existing_reason
  from public.stock_movements movement
  left join public.stock_movement_items item
    on item.movement_id = movement.id
   and item.organization_id = movement.organization_id
  where movement.id = p_command_id;

  if found then
    if v_existing_org <> p_organization_id
      or v_existing_type <> 'return_in'
      or v_existing_reversal is distinct from p_withdrawal_movement_id
      or v_existing_quantity is distinct from p_quantity
      or v_existing_notes is distinct from nullif(trim(p_notes), '')
      or v_existing_reason is distinct from 'withdrawal_return'
    then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;

    select item.quantity
      into v_original_quantity
    from public.stock_movement_items item
    where item.organization_id = p_organization_id
      and item.movement_id = p_withdrawal_movement_id;

    if not found then
      raise exception 'WITHDRAWAL_NOT_RETURNABLE' using errcode = '22023';
    end if;

    select coalesce(sum(return_item.quantity), 0)::numeric(18,3)
      into v_returned_total
    from public.stock_movements return_movement
    join public.stock_movement_items return_item
      on return_item.movement_id = return_movement.id
     and return_item.organization_id = return_movement.organization_id
    where return_movement.organization_id = p_organization_id
      and return_movement.movement_type = 'return_in'
      and return_movement.status = 'confirmed'
      and return_movement.reversal_of_movement_id = p_withdrawal_movement_id
      and return_item.stock_item_id = v_existing_item;

    v_remaining_returnable := greatest(v_original_quantity - v_returned_total, 0);

    return query
    select p_command_id,
           p_withdrawal_movement_id,
           v_existing_item,
           v_existing_location,
           p_quantity::numeric,
           v_remaining_returnable::numeric,
           balance.quantity_on_hand,
           balance.average_cost
    from public.inventory_balances balance
    where balance.organization_id = p_organization_id
      and balance.stock_item_id = v_existing_item
      and balance.stock_location_id = v_existing_location;
    return;
  end if;

  perform 1
  from public.stock_movements movement
  where movement.id = p_withdrawal_movement_id
    and movement.organization_id = p_organization_id
    and movement.movement_type = 'withdrawal'
    and movement.status = 'confirmed'
    and movement.source_location_id is not null
  for update;

  if not found then
    raise exception 'WITHDRAWAL_NOT_RETURNABLE' using errcode = '22023';
  end if;

  if (
    select count(*)
    from public.stock_movement_items item
    where item.organization_id = p_organization_id
      and item.movement_id = p_withdrawal_movement_id
  ) <> 1 then
    raise exception 'WITHDRAWAL_ITEM_CARDINALITY_UNSUPPORTED' using errcode = '22023';
  end if;

  select movement.source_location_id,
         item.id,
         item.stock_item_id,
         item.quantity,
         item.unit_cost_snapshot,
         stock_item.track_batch,
         stock_item.track_expiration
    into v_source_location_id,
         v_original_item_id,
         v_stock_item_id,
         v_original_quantity,
         v_original_unit_cost,
         v_track_batch,
         v_track_expiration
  from public.stock_movements movement
  join public.stock_movement_items item
    on item.movement_id = movement.id
   and item.organization_id = movement.organization_id
  join public.stock_items stock_item
    on stock_item.id = item.stock_item_id
   and stock_item.organization_id = item.organization_id
  where movement.id = p_withdrawal_movement_id
    and movement.organization_id = p_organization_id;

  if not private.has_stock_location_role(
    p_organization_id,
    v_source_location_id,
    array['owner', 'admin', 'manager', 'inventory']
  ) then
    raise exception 'INSUFFICIENT_SCOPE' using errcode = '42501';
  end if;

  perform 1
  from public.stock_locations location
  where location.id = v_source_location_id
    and location.organization_id = p_organization_id
    and location.status = 'active';

  if not found then
    raise exception 'STOCK_LOCATION_NOT_AVAILABLE' using errcode = '23503';
  end if;

  select coalesce(sum(return_item.quantity), 0)::numeric(18,3)
    into v_returned_before
  from public.stock_movements return_movement
  join public.stock_movement_items return_item
    on return_item.movement_id = return_movement.id
   and return_item.organization_id = return_movement.organization_id
  where return_movement.organization_id = p_organization_id
    and return_movement.movement_type = 'return_in'
    and return_movement.status = 'confirmed'
    and return_movement.reversal_of_movement_id = p_withdrawal_movement_id
    and return_item.stock_item_id = v_stock_item_id;

  v_remaining_returnable := v_original_quantity - v_returned_before;
  if p_quantity > v_remaining_returnable then
    raise exception 'RETURN_EXCEEDS_WITHDRAWAL' using errcode = '22023';
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
    v_source_location_id,
    0,
    0
  )
  on conflict (organization_id, stock_item_id, stock_location_id) do nothing;

  select balance.quantity_on_hand, balance.average_cost
    into v_current_quantity, v_current_cost
  from public.inventory_balances balance
  where balance.organization_id = p_organization_id
    and balance.stock_item_id = v_stock_item_id
    and balance.stock_location_id = v_source_location_id
  for update;

  v_next_quantity := v_current_quantity + p_quantity;
  v_next_cost := case
    when v_next_quantity = 0 then 0
    when v_current_quantity <= 0 then v_original_unit_cost
    else round(
      ((v_current_quantity * v_current_cost) + (p_quantity * v_original_unit_cost))
      / v_next_quantity,
      2
    )
  end;

  if v_track_batch or v_track_expiration then
    if coalesce((
      select sum(allocation.quantity)
      from public.stock_movement_batch_allocations allocation
      where allocation.organization_id = p_organization_id
        and allocation.movement_item_id = v_original_item_id
    ), 0) <> v_original_quantity then
      raise exception 'RETURN_BATCH_LINEAGE_INCOMPLETE' using errcode = '22023';
    end if;

    perform 1
    from public.inventory_batches batch
    where batch.organization_id = p_organization_id
      and batch.id in (
        select allocation.batch_id
        from public.stock_movement_batch_allocations allocation
        where allocation.organization_id = p_organization_id
          and allocation.movement_item_id = v_original_item_id
      )
    order by batch.id
    for update;
  end if;

  insert into public.stock_movements (
    id,
    organization_id,
    movement_type,
    occurred_at,
    destination_location_id,
    responsible_user_id,
    reason_code,
    notes,
    status,
    reversal_of_movement_id
  ) values (
    p_command_id,
    p_organization_id,
    'return_in',
    now(),
    v_source_location_id,
    v_user_id,
    'withdrawal_return',
    nullif(trim(p_notes), ''),
    'confirmed',
    p_withdrawal_movement_id
  );

  v_return_item_id := gen_random_uuid();
  insert into public.stock_movement_items (
    id,
    organization_id,
    movement_id,
    stock_item_id,
    quantity,
    unit_cost_snapshot
  ) values (
    v_return_item_id,
    p_organization_id,
    p_command_id,
    v_stock_item_id,
    p_quantity,
    v_original_unit_cost
  );

  if v_track_batch or v_track_expiration then
    v_remaining := p_quantity;

    for v_allocation in
      select allocation.batch_id,
             sum(allocation.quantity)::numeric(18,3) as withdrawn_quantity
      from public.stock_movement_batch_allocations allocation
      where allocation.organization_id = p_organization_id
        and allocation.movement_item_id = v_original_item_id
      group by allocation.batch_id
      order by min(allocation.created_at), allocation.batch_id
    loop
      exit when v_remaining = 0;

      select coalesce(sum(return_allocation.quantity), 0)::numeric(18,3)
        into v_returned_total
      from public.stock_movements return_movement
      join public.stock_movement_items return_item
        on return_item.movement_id = return_movement.id
       and return_item.organization_id = return_movement.organization_id
      join public.stock_movement_batch_allocations return_allocation
        on return_allocation.movement_item_id = return_item.id
       and return_allocation.organization_id = return_item.organization_id
      where return_movement.organization_id = p_organization_id
        and return_movement.movement_type = 'return_in'
        and return_movement.status = 'confirmed'
        and return_movement.reversal_of_movement_id = p_withdrawal_movement_id
        and return_item.stock_item_id = v_stock_item_id
        and return_allocation.batch_id = v_allocation.batch_id;

      v_available := v_allocation.withdrawn_quantity - v_returned_total;
      if v_available <= 0 then
        continue;
      end if;

      v_take := least(v_available, v_remaining);

      select batch.remaining_quantity, batch.original_quantity, batch.status
        into v_batch_remaining, v_batch_original, v_batch_status
      from public.inventory_batches batch
      where batch.id = v_allocation.batch_id
        and batch.organization_id = p_organization_id;

      if not found or v_batch_status = 'cancelled' then
        raise exception 'RETURN_BATCH_NOT_AVAILABLE' using errcode = '22023';
      end if;

      if v_batch_remaining + v_take > v_batch_original then
        raise exception 'RETURN_BATCH_CAPACITY_EXCEEDED' using errcode = '23514';
      end if;

      update public.inventory_batches
      set remaining_quantity = remaining_quantity + v_take,
          status = case when status = 'depleted' then 'active' else status end,
          updated_at = now()
      where id = v_allocation.batch_id
        and organization_id = p_organization_id;

      insert into public.stock_movement_batch_allocations (
        organization_id,
        movement_item_id,
        batch_id,
        quantity
      ) values (
        p_organization_id,
        v_return_item_id,
        v_allocation.batch_id,
        v_take
      );

      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining <> 0 then
      raise exception 'RETURN_BATCH_LINEAGE_INCOMPLETE' using errcode = '22023';
    end if;
  end if;

  update public.inventory_balances
  set quantity_on_hand = v_next_quantity,
      average_cost = v_next_cost,
      updated_at = now()
  where organization_id = p_organization_id
    and stock_item_id = v_stock_item_id
    and stock_location_id = v_source_location_id;

  v_returned_total := v_returned_before + p_quantity;
  v_remaining_returnable := v_original_quantity - v_returned_total;

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
    'stock_return.recorded',
    'stock_movement',
    p_command_id,
    jsonb_build_object(
      'withdrawal_movement_id', p_withdrawal_movement_id,
      'stock_item_id', v_stock_item_id,
      'stock_location_id', v_source_location_id,
      'quantity', p_quantity,
      'unit_cost_snapshot', v_original_unit_cost,
      'returned_before', v_returned_before,
      'returned_total', v_returned_total,
      'remaining_returnable_quantity', v_remaining_returnable,
      'previous_quantity', v_current_quantity,
      'quantity_on_hand', v_next_quantity,
      'average_cost', v_next_cost
    ),
    jsonb_build_object(
      'source', 'record_stock_return_rpc',
      'relationship', 'reversal_of_movement_id'
    )
  );

  return query
  select p_command_id,
         p_withdrawal_movement_id,
         v_stock_item_id,
         v_source_location_id,
         p_quantity::numeric,
         v_remaining_returnable::numeric,
         v_next_quantity::numeric,
         v_next_cost::numeric;
end;
$$;

revoke all on function private.record_stock_return(uuid,uuid,uuid,numeric,text)
  from public, anon, authenticated;

create or replace function public.record_stock_return(
  p_command_id uuid,
  p_organization_id uuid,
  p_withdrawal_movement_id uuid,
  p_quantity numeric,
  p_notes text default null
)
returns table (
  movement_id uuid,
  withdrawal_movement_id uuid,
  stock_item_id uuid,
  stock_location_id uuid,
  returned_quantity numeric,
  remaining_returnable_quantity numeric,
  quantity_on_hand numeric,
  average_cost numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source_location_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if not private.has_org_role(
    p_organization_id,
    array['owner', 'admin', 'manager', 'inventory']
  ) then
    raise exception 'INSUFFICIENT_ROLE' using errcode = '42501';
  end if;

  select movement.source_location_id
    into v_source_location_id
  from public.stock_movements movement
  where movement.id = p_withdrawal_movement_id
    and movement.organization_id = p_organization_id
    and movement.movement_type = 'withdrawal'
    and movement.status = 'confirmed';

  if not found or v_source_location_id is null then
    raise exception 'WITHDRAWAL_NOT_RETURNABLE' using errcode = '22023';
  end if;

  if not private.has_stock_location_role(
    p_organization_id,
    v_source_location_id,
    array['owner', 'admin', 'manager', 'inventory']
  ) then
    raise exception 'INSUFFICIENT_SCOPE' using errcode = '42501';
  end if;

  return query
  select *
  from private.record_stock_return(
    p_command_id,
    p_organization_id,
    p_withdrawal_movement_id,
    p_quantity,
    p_notes
  );
end;
$$;

revoke all on function public.record_stock_return(uuid,uuid,uuid,numeric,text)
  from public, anon, authenticated;
grant execute on function public.record_stock_return(uuid,uuid,uuid,numeric,text)
  to authenticated;
