-- Issue #187 follow-up: finalize layers immediately at the correct ledger boundary.
-- Existing tracked flows already allocate after inserting the movement item; non-tracked
-- outflows need their hidden economic layer consumed immediately, while inbound entries
-- can be finalized when their command audit is written (after any explicit batch logic).

drop trigger if exists stock_movement_items_ensure_cost_layers on public.stock_movement_items;

create or replace function private.ensure_inbound_movement_cost_layer(
  p_organization_id uuid,
  p_movement_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_movement record;
  v_item record;
  v_allocated numeric(18,3);
  v_batch_id uuid;
  v_source_type text;
begin
  select movement.destination_location_id,
         movement.reference_type,
         movement.reference_id,
         movement.movement_type,
         movement.status
    into v_movement
  from public.stock_movements movement
  where movement.organization_id = p_organization_id
    and movement.id = p_movement_id;

  if not found or v_movement.status <> 'confirmed' or v_movement.destination_location_id is null then
    return;
  end if;

  for v_item in
    select item.id, item.stock_item_id, item.quantity, item.unit_cost_snapshot
    from public.stock_movement_items item
    where item.organization_id = p_organization_id
      and item.movement_id = p_movement_id
    order by item.id
  loop
    select coalesce(sum(allocation.quantity), 0)::numeric(18,3)
      into v_allocated
    from public.stock_movement_batch_allocations allocation
    where allocation.organization_id = p_organization_id
      and allocation.movement_item_id = v_item.id;

    if v_allocated = v_item.quantity then
      perform private.sync_stock_movement_item_cost(v_item.id, p_organization_id);
      continue;
    end if;

    if v_allocated <> 0 then
      raise exception 'STOCK_COST_LAYER_ALLOCATION_MISMATCH' using errcode = '23514';
    end if;

    v_batch_id := gen_random_uuid();
    v_source_type := case
      when v_movement.movement_type = 'opening_balance' then 'opening_balance'
      when v_movement.movement_type in (
        'inventory_adjustment',
        'inventory_adjustment_positive',
        'manual_adjustment_positive'
      ) then 'inventory_adjustment'
      when v_movement.reference_type = 'purchase_receipt'
        or v_movement.movement_type = 'purchase_receipt'
      then 'purchase_receipt'
      else 'entry'
    end;

    insert into public.inventory_batches(
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
      status,
      cost_basis
    ) values (
      v_batch_id,
      p_organization_id,
      v_item.stock_item_id,
      v_movement.destination_location_id,
      null,
      null,
      now(),
      v_item.quantity,
      v_item.quantity,
      v_item.unit_cost_snapshot,
      v_source_type,
      coalesce(v_movement.reference_id, p_movement_id),
      'active',
      'traceable'
    );

    insert into public.stock_movement_batch_allocations(
      organization_id,
      movement_item_id,
      batch_id,
      quantity,
      unit_cost_snapshot,
      cost_basis
    ) values (
      p_organization_id,
      v_item.id,
      v_batch_id,
      v_item.quantity,
      0,
      'traceable'
    );
  end loop;
end;
$$;

revoke all on function private.ensure_inbound_movement_cost_layer(uuid, uuid)
  from public, anon, authenticated;

create or replace function private.stock_transfer_allocation_capture_cost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select batch.unit_cost, batch.cost_basis
    into new.unit_cost_snapshot, new.cost_basis
  from public.inventory_batches batch
  where batch.id = new.source_batch_id
    and batch.organization_id = new.organization_id;

  if not found then
    raise exception 'TRANSFER_COST_LAYER_NOT_FOUND' using errcode = '23503';
  end if;

  return new;
end;
$$;

revoke all on function private.stock_transfer_allocation_capture_cost()
  from public, anon, authenticated;

drop trigger if exists stock_transfer_allocations_capture_cost on public.stock_transfer_batch_allocations;
create trigger stock_transfer_allocations_capture_cost
before insert or update of source_batch_id, organization_id
on public.stock_transfer_batch_allocations
for each row execute function private.stock_transfer_allocation_capture_cost();

create or replace function private.sync_stock_transfer_item_cost(
  p_transfer_item_id uuid,
  p_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quantity numeric(18,3);
  v_value numeric;
  v_basis text;
begin
  select coalesce(sum(allocation.quantity), 0)::numeric(18,3),
         coalesce(sum(allocation.quantity * allocation.unit_cost_snapshot), 0),
         case
           when count(*) = 0 then null
           when bool_and(allocation.cost_basis = 'traceable') then 'layer_allocation'
           when bool_and(allocation.cost_basis = 'legacy_estimate') then 'legacy_estimate'
           else 'mixed_estimate'
         end
    into v_quantity, v_value, v_basis
  from public.stock_transfer_batch_allocations allocation
  where allocation.organization_id = p_organization_id
    and allocation.transfer_item_id = p_transfer_item_id;

  if v_quantity > 0 then
    update public.stock_transfer_items item
    set unit_cost_snapshot = round(v_value / v_quantity, 2),
        cost_basis = v_basis
    where item.id = p_transfer_item_id
      and item.organization_id = p_organization_id;
  end if;
end;
$$;

revoke all on function private.sync_stock_transfer_item_cost(uuid, uuid)
  from public, anon, authenticated;

create or replace function private.stock_transfer_allocation_sync_item_cost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.sync_stock_transfer_item_cost(old.transfer_item_id, old.organization_id);
  else
    perform private.sync_stock_transfer_item_cost(new.transfer_item_id, new.organization_id);
  end if;
  return null;
end;
$$;

revoke all on function private.stock_transfer_allocation_sync_item_cost()
  from public, anon, authenticated;

drop trigger if exists stock_transfer_allocations_sync_item_cost on public.stock_transfer_batch_allocations;
create trigger stock_transfer_allocations_sync_item_cost
after insert or update of quantity, unit_cost_snapshot, cost_basis, transfer_item_id or delete
on public.stock_transfer_batch_allocations
for each row execute function private.stock_transfer_allocation_sync_item_cost();

create or replace function private.ensure_stock_movement_cost_layers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_movement_type text;
  v_source_location_id uuid;
  v_destination_location_id uuid;
  v_reference_type text;
  v_reference_id uuid;
  v_reversal_id uuid;
  v_status text;
  v_track_batch boolean;
  v_track_expiration boolean;
  v_allocated numeric(18,3);
  v_remaining numeric(18,3);
  v_take numeric(18,3);
  v_batch record;
  v_batch_id uuid;
  v_transfer_item_id uuid;
  v_transfer_order integer;
  v_original_item_id uuid;
  v_original_quantity numeric(18,3);
  v_returned numeric(18,3);
  v_available numeric(18,3);
  v_explicit_adjustment_cost numeric(18,2);
begin
  select movement.movement_type,
         movement.source_location_id,
         movement.destination_location_id,
         movement.reference_type,
         movement.reference_id,
         movement.reversal_of_movement_id,
         movement.status,
         stock_item.track_batch,
         stock_item.track_expiration
    into v_movement_type,
         v_source_location_id,
         v_destination_location_id,
         v_reference_type,
         v_reference_id,
         v_reversal_id,
         v_status,
         v_track_batch,
         v_track_expiration
  from public.stock_movements movement
  join public.stock_items stock_item
    on stock_item.id = new.stock_item_id
   and stock_item.organization_id = new.organization_id
  where movement.id = new.movement_id
    and movement.organization_id = new.organization_id;

  if not found or v_status <> 'confirmed' then
    return null;
  end if;

  -- Explicit/visible entry-layer creation happens after the movement item in the
  -- existing entry RPCs. Finalize those at audit time instead of racing them here.
  if v_movement_type in ('entry', 'purchase_receipt', 'opening_balance') then
    return null;
  end if;

  -- Existing tracked flows already implement FEFO/preferred allocation after the
  -- movement item insert. Allocation triggers will overwrite their aggregate cost.
  if v_track_batch or v_track_expiration then
    return null;
  end if;

  select coalesce(sum(allocation.quantity), 0)::numeric(18,3)
    into v_allocated
  from public.stock_movement_batch_allocations allocation
  where allocation.organization_id = new.organization_id
    and allocation.movement_item_id = new.id;

  if v_movement_type in (
       'withdrawal',
       'sector_withdrawal',
       'loss',
       'expiration',
       'return_out',
       'loan_out',
       'inventory_adjustment_negative',
       'manual_adjustment_negative'
     )
     or (v_movement_type = 'inventory_adjustment' and v_source_location_id is not null)
     or v_movement_type = 'transfer_out'
  then
    if v_source_location_id is null then
      raise exception 'STOCK_COST_LAYER_SOURCE_REQUIRED' using errcode = '22023';
    end if;

    if v_allocated <> 0 then
      if v_allocated <> new.quantity then
        raise exception 'STOCK_COST_LAYER_ALLOCATION_MISMATCH' using errcode = '23514';
      end if;
      return null;
    end if;

    if coalesce((
      select sum(batch.remaining_quantity)
      from public.inventory_batches batch
      where batch.organization_id = new.organization_id
        and batch.stock_item_id = new.stock_item_id
        and batch.stock_location_id = v_source_location_id
        and batch.status = 'active'
        and batch.remaining_quantity > 0
    ), 0) < new.quantity then
      raise exception 'STOCK_COST_LAYER_REQUIRED' using errcode = '22023';
    end if;

    perform 1
    from public.inventory_batches batch
    where batch.organization_id = new.organization_id
      and batch.stock_item_id = new.stock_item_id
      and batch.stock_location_id = v_source_location_id
      and batch.status = 'active'
      and batch.remaining_quantity > 0
    order by batch.id
    for update;

    v_remaining := new.quantity;
    for v_batch in
      select batch.id,
             batch.remaining_quantity
      from public.inventory_batches batch
      where batch.organization_id = new.organization_id
        and batch.stock_item_id = new.stock_item_id
        and batch.stock_location_id = v_source_location_id
        and batch.status = 'active'
        and batch.remaining_quantity > 0
      order by batch.expiration_date asc nulls last,
               batch.received_at asc,
               batch.id asc
    loop
      exit when v_remaining = 0;
      v_take := least(v_batch.remaining_quantity, v_remaining);
      if v_take <= 0 then continue; end if;

      update public.inventory_batches batch
      set remaining_quantity = batch.remaining_quantity - v_take,
          status = case
            when batch.remaining_quantity - v_take = 0 then 'depleted'
            else batch.status
          end,
          updated_at = now()
      where batch.id = v_batch.id
        and batch.organization_id = new.organization_id;

      insert into public.stock_movement_batch_allocations(
        organization_id,
        movement_item_id,
        batch_id,
        quantity,
        unit_cost_snapshot,
        cost_basis
      ) values (
        new.organization_id,
        new.id,
        v_batch.id,
        v_take,
        0,
        'traceable'
      );

      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining <> 0 then
      raise exception 'STOCK_COST_LAYER_REQUIRED' using errcode = '22023';
    end if;

    if v_movement_type = 'transfer_out' then
      select item.id
        into v_transfer_item_id
      from public.stock_transfer_items item
      where item.organization_id = new.organization_id
        and item.transfer_id = new.movement_id
        and item.stock_item_id = new.stock_item_id;

      if not found then
        raise exception 'TRANSFER_ITEM_SHAPE_UNSUPPORTED' using errcode = '22023';
      end if;

      if not exists (
        select 1
        from public.stock_transfer_batch_allocations allocation
        where allocation.organization_id = new.organization_id
          and allocation.transfer_item_id = v_transfer_item_id
      ) then
        v_transfer_order := 0;
        for v_batch in
          select allocation.batch_id,
                 allocation.quantity,
                 allocation.unit_cost_snapshot,
                 batch.batch_code,
                 batch.expiration_date
          from public.stock_movement_batch_allocations allocation
          join public.inventory_batches batch
            on batch.id = allocation.batch_id
           and batch.organization_id = allocation.organization_id
          where allocation.organization_id = new.organization_id
            and allocation.movement_item_id = new.id
          order by allocation.created_at, allocation.id
        loop
          v_transfer_order := v_transfer_order + 1;
          insert into public.stock_transfer_batch_allocations(
            organization_id,
            transfer_item_id,
            source_batch_id,
            destination_batch_id,
            quantity,
            received_quantity,
            batch_code_snapshot,
            expiration_date_snapshot,
            unit_cost_snapshot,
            allocation_order,
            cost_basis
          ) values (
            new.organization_id,
            v_transfer_item_id,
            v_batch.batch_id,
            null,
            v_batch.quantity,
            0,
            v_batch.batch_code,
            v_batch.expiration_date,
            v_batch.unit_cost_snapshot,
            v_transfer_order,
            'traceable'
          );
        end loop;
      end if;
    end if;

    return null;
  end if;

  if v_movement_type = 'return_in' then
    if v_allocated <> 0 then
      if v_allocated <> new.quantity then
        raise exception 'RETURN_COST_LAYER_ALLOCATION_MISMATCH' using errcode = '23514';
      end if;
      return null;
    end if;

    if v_reversal_id is null then
      raise exception 'RETURN_COST_LINEAGE_REQUIRED' using errcode = '22023';
    end if;

    select item.id, item.quantity
      into v_original_item_id, v_original_quantity
    from public.stock_movement_items item
    where item.organization_id = new.organization_id
      and item.movement_id = v_reversal_id
      and item.stock_item_id = new.stock_item_id;

    if not found then
      raise exception 'RETURN_COST_LINEAGE_REQUIRED' using errcode = '22023';
    end if;

    if coalesce((
      select sum(allocation.quantity)
      from public.stock_movement_batch_allocations allocation
      where allocation.organization_id = new.organization_id
        and allocation.movement_item_id = v_original_item_id
    ), 0) <> v_original_quantity then
      raise exception 'RETURN_COST_LINEAGE_INCOMPLETE' using errcode = '22023';
    end if;

    v_remaining := new.quantity;
    for v_batch in
      select allocation.batch_id,
             allocation.quantity as withdrawn_quantity
      from public.stock_movement_batch_allocations allocation
      where allocation.organization_id = new.organization_id
        and allocation.movement_item_id = v_original_item_id
      order by allocation.created_at, allocation.id
    loop
      exit when v_remaining = 0;

      select coalesce(sum(return_allocation.quantity), 0)::numeric(18,3)
        into v_returned
      from public.stock_movements return_movement
      join public.stock_movement_items return_item
        on return_item.movement_id = return_movement.id
       and return_item.organization_id = return_movement.organization_id
      join public.stock_movement_batch_allocations return_allocation
        on return_allocation.movement_item_id = return_item.id
       and return_allocation.organization_id = return_item.organization_id
      where return_movement.organization_id = new.organization_id
        and return_movement.movement_type = 'return_in'
        and return_movement.status = 'confirmed'
        and return_movement.reversal_of_movement_id = v_reversal_id
        and return_item.stock_item_id = new.stock_item_id
        and return_movement.id <> new.movement_id
        and return_allocation.batch_id = v_batch.batch_id;

      v_available := v_batch.withdrawn_quantity - v_returned;
      if v_available <= 0 then continue; end if;
      v_take := least(v_available, v_remaining);

      update public.inventory_batches batch
      set remaining_quantity = batch.remaining_quantity + v_take,
          status = case when batch.status = 'depleted' then 'active' else batch.status end,
          updated_at = now()
      where batch.id = v_batch.batch_id
        and batch.organization_id = new.organization_id
        and batch.status <> 'cancelled'
        and batch.remaining_quantity + v_take <= batch.original_quantity;

      if not found then
        raise exception 'RETURN_COST_LAYER_NOT_AVAILABLE' using errcode = '23514';
      end if;

      insert into public.stock_movement_batch_allocations(
        organization_id,
        movement_item_id,
        batch_id,
        quantity,
        unit_cost_snapshot,
        cost_basis
      ) values (
        new.organization_id,
        new.id,
        v_batch.batch_id,
        v_take,
        0,
        'traceable'
      );

      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining <> 0 then
      raise exception 'RETURN_COST_LINEAGE_INCOMPLETE' using errcode = '22023';
    end if;

    return null;
  end if;

  -- Transfer-in is created before the current receive RPC finishes restoring its
  -- destination allocations. Those allocation triggers become authoritative.
  if v_movement_type = 'transfer_in' then
    return null;
  end if;

  if v_movement_type in (
       'inventory_adjustment_positive',
       'manual_adjustment_positive'
     )
     or (v_movement_type = 'inventory_adjustment' and v_destination_location_id is not null)
  then
    if v_destination_location_id is null then
      raise exception 'STOCK_COST_LAYER_DESTINATION_REQUIRED' using errcode = '22023';
    end if;

    if v_allocated <> 0 then
      if v_allocated <> new.quantity then
        raise exception 'STOCK_COST_LAYER_ALLOCATION_MISMATCH' using errcode = '23514';
      end if;
      return null;
    end if;

    if v_movement_type = 'inventory_adjustment'
      and v_reference_type = 'inventory_count'
    then
      select line.adjustment_unit_cost
        into v_explicit_adjustment_cost
      from public.inventory_count_lines line
      where line.organization_id = new.organization_id
        and line.inventory_count_id = v_reference_id
        and line.stock_item_id = new.stock_item_id;

      if v_explicit_adjustment_cost is null then
        raise exception 'POSITIVE_ADJUSTMENT_COST_REQUIRED' using errcode = '22023';
      end if;

      new.unit_cost_snapshot := v_explicit_adjustment_cost;
      update public.stock_movement_items item
      set unit_cost_snapshot = v_explicit_adjustment_cost
      where item.id = new.id
        and item.organization_id = new.organization_id;
    end if;

    v_batch_id := gen_random_uuid();
    insert into public.inventory_batches(
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
      status,
      cost_basis
    ) values (
      v_batch_id,
      new.organization_id,
      new.stock_item_id,
      v_destination_location_id,
      null,
      null,
      now(),
      new.quantity,
      new.quantity,
      new.unit_cost_snapshot,
      'inventory_adjustment',
      coalesce(v_reference_id, new.movement_id),
      'active',
      'traceable'
    );

    insert into public.stock_movement_batch_allocations(
      organization_id,
      movement_item_id,
      batch_id,
      quantity,
      unit_cost_snapshot,
      cost_basis
    ) values (
      new.organization_id,
      new.id,
      v_batch_id,
      new.quantity,
      0,
      'traceable'
    );
  end if;

  return null;
end;
$$;

revoke all on function private.ensure_stock_movement_cost_layers()
  from public, anon, authenticated;

create trigger stock_movement_items_ensure_cost_layers
after insert on public.stock_movement_items
for each row execute function private.ensure_stock_movement_cost_layers();

create or replace function private.audit_finalize_inventory_cost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receipt_item record;
  v_item record;
  v_unit_cost numeric(18,2);
  v_total_cost numeric(18,2);
  v_cost_basis text;
  v_layer_count integer;
  v_transfer_item record;
begin
  if new.action = 'stock_entry.recorded'
     and new.entity_type = 'stock_movement'
  then
    perform private.ensure_inbound_movement_cost_layer(new.organization_id, new.entity_id);
  elsif new.action = 'purchase_order.received'
     and new.entity_type = 'purchase_receipt'
  then
    for v_receipt_item in
      select receipt_item.stock_movement_id
      from public.purchase_receipt_items receipt_item
      where receipt_item.organization_id = new.organization_id
        and receipt_item.purchase_receipt_id = new.entity_id
      order by receipt_item.id
    loop
      perform private.ensure_inbound_movement_cost_layer(
        new.organization_id,
        v_receipt_item.stock_movement_id
      );
    end loop;
  end if;

  if new.entity_type = 'stock_movement' then
    select item.id, item.unit_cost_snapshot, item.cost_basis
      into v_item
    from public.stock_movement_items item
    where item.organization_id = new.organization_id
      and item.movement_id = new.entity_id
    order by item.id
    limit 1;

    if found then
      perform private.sync_stock_movement_item_cost(v_item.id, new.organization_id);

      select item.unit_cost_snapshot, item.cost_basis
        into v_unit_cost, v_cost_basis
      from public.stock_movement_items item
      where item.organization_id = new.organization_id
        and item.id = v_item.id;

      select coalesce(sum(allocation.total_cost_snapshot), 0)::numeric(18,2),
             count(*)::integer
        into v_total_cost, v_layer_count
      from public.stock_movement_batch_allocations allocation
      where allocation.organization_id = new.organization_id
        and allocation.movement_item_id = v_item.id;

      if v_layer_count > 0 then
        new.after_data := coalesce(new.after_data, '{}'::jsonb) || jsonb_build_object(
          'unit_cost_snapshot', v_unit_cost,
          'total_cost_snapshot', v_total_cost,
          'cost_basis', v_cost_basis,
          'cost_layer_count', v_layer_count
        );
      end if;
    end if;
  elsif new.action = 'stock_transfer.dispatched'
        and new.entity_type = 'stock_transfer'
  then
    select item.id, item.unit_cost_snapshot, item.cost_basis
      into v_transfer_item
    from public.stock_transfer_items item
    where item.organization_id = new.organization_id
      and item.transfer_id = new.entity_id
    order by item.id
    limit 1;

    if found then
      perform private.sync_stock_transfer_item_cost(v_transfer_item.id, new.organization_id);

      select item.unit_cost_snapshot, item.cost_basis
        into v_unit_cost, v_cost_basis
      from public.stock_transfer_items item
      where item.organization_id = new.organization_id
        and item.id = v_transfer_item.id;

      select coalesce(sum(round(allocation.quantity * allocation.unit_cost_snapshot, 2)), 0)::numeric(18,2),
             count(*)::integer
        into v_total_cost, v_layer_count
      from public.stock_transfer_batch_allocations allocation
      where allocation.organization_id = new.organization_id
        and allocation.transfer_item_id = v_transfer_item.id;

      if v_layer_count > 0 then
        new.after_data := coalesce(new.after_data, '{}'::jsonb) || jsonb_build_object(
          'unit_cost_snapshot', v_unit_cost,
          'total_cost_snapshot', v_total_cost,
          'cost_basis', v_cost_basis,
          'cost_layer_count', v_layer_count
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.audit_finalize_inventory_cost()
  from public, anon, authenticated;

drop trigger if exists audit_logs_finalize_inventory_cost on public.audit_logs;
create trigger audit_logs_finalize_inventory_cost
before insert on public.audit_logs
for each row execute function private.audit_finalize_inventory_cost();
