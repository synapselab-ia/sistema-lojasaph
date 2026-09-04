-- Issue #187: explicit, auditable costing fallback for configured negative stock.
-- Known physical/economic layers remain authoritative. Only the quantity that cannot
-- be associated with an existing layer is valued as an explicit negative estimate.

alter table public.inventory_batches
  drop constraint if exists inventory_batches_cost_basis_check;
alter table public.inventory_batches
  add constraint inventory_batches_cost_basis_check
  check (cost_basis in ('traceable', 'legacy_estimate', 'negative_estimate'));

alter table public.stock_movement_batch_allocations
  drop constraint if exists stock_movement_batch_allocations_cost_basis_check;
alter table public.stock_movement_batch_allocations
  add constraint stock_movement_batch_allocations_cost_basis_check
  check (cost_basis in ('traceable', 'legacy_estimate', 'negative_estimate'));

alter table public.stock_movement_items
  drop constraint if exists stock_movement_items_cost_basis_check;
alter table public.stock_movement_items
  add constraint stock_movement_items_cost_basis_check
  check (cost_basis in (
    'legacy_snapshot', 'layer_allocation', 'legacy_estimate',
    'negative_estimate', 'mixed_estimate'
  ));

create or replace function private.sync_stock_movement_item_cost(
  p_movement_item_id uuid,
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
           when bool_and(allocation.cost_basis = 'negative_estimate') then 'negative_estimate'
           else 'mixed_estimate'
         end
    into v_quantity, v_value, v_basis
  from public.stock_movement_batch_allocations allocation
  where allocation.organization_id = p_organization_id
    and allocation.movement_item_id = p_movement_item_id;

  if v_quantity > 0 then
    update public.stock_movement_items item
    set unit_cost_snapshot = round(v_value / v_quantity, 2),
        cost_basis = v_basis
    where item.id = p_movement_item_id
      and item.organization_id = p_organization_id;
  end if;
end;
$$;

revoke all on function private.sync_stock_movement_item_cost(uuid, uuid)
  from public, anon, authenticated;

create or replace function private.prepare_negative_stock_cost_fallback()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_movement_type text;
  v_source_location_id uuid;
  v_status text;
  v_allow_negative boolean;
  v_track_batch boolean;
  v_track_expiration boolean;
  v_balance_id uuid;
  v_balance_quantity numeric(18,3);
  v_layer_quantity numeric(18,3);
  v_unlayered_quantity numeric(18,3);
  v_remaining numeric(18,3);
  v_take numeric(18,3);
  v_batch_id uuid;
  v_batch record;
begin
  select movement.movement_type,
         movement.source_location_id,
         movement.status,
         location.allow_negative_stock,
         stock_item.track_batch,
         stock_item.track_expiration
    into v_movement_type,
         v_source_location_id,
         v_status,
         v_allow_negative,
         v_track_batch,
         v_track_expiration
  from public.stock_movements movement
  join public.stock_items stock_item
    on stock_item.id = new.stock_item_id
   and stock_item.organization_id = new.organization_id
  left join public.stock_locations location
    on location.id = movement.source_location_id
   and location.organization_id = movement.organization_id
  where movement.id = new.movement_id
    and movement.organization_id = new.organization_id;

  if not found
     or v_status <> 'confirmed'
     or v_source_location_id is null
     or v_track_batch
     or v_track_expiration
     or not coalesce(v_allow_negative, false)
  then
    return null;
  end if;

  if not (
    v_movement_type in (
      'withdrawal', 'sector_withdrawal', 'loss', 'expiration', 'return_out',
      'loan_out', 'inventory_adjustment_negative', 'manual_adjustment_negative'
    )
    or v_movement_type = 'transfer_out'
    or v_movement_type = 'inventory_adjustment'
  ) then
    return null;
  end if;

  if exists (
    select 1
    from public.stock_movement_batch_allocations allocation
    where allocation.organization_id = new.organization_id
      and allocation.movement_item_id = new.id
  ) then
    return null;
  end if;

  select balance.id, balance.quantity_on_hand
    into v_balance_id, v_balance_quantity
  from public.inventory_balances balance
  where balance.organization_id = new.organization_id
    and balance.stock_item_id = new.stock_item_id
    and balance.stock_location_id = v_source_location_id
  for update;

  if not found then
    return null;
  end if;

  select coalesce(sum(batch.remaining_quantity), 0)::numeric(18,3)
    into v_layer_quantity
  from public.inventory_batches batch
  where batch.organization_id = new.organization_id
    and batch.stock_item_id = new.stock_item_id
    and batch.stock_location_id = v_source_location_id
    and batch.status = 'active'
    and batch.remaining_quantity > 0;

  -- Runtime repair for a positive legacy/untracked balance that arrived without an
  -- economic layer (for example an old import or deterministic CI seed). The estimate
  -- is explicit and audited instead of being silently treated as an exact layer.
  v_unlayered_quantity := greatest(v_balance_quantity - v_layer_quantity, 0);
  if v_unlayered_quantity > 0 then
    v_batch_id := gen_random_uuid();
    insert into public.inventory_batches(
      id, organization_id, stock_item_id, stock_location_id,
      batch_code, expiration_date, received_at,
      original_quantity, remaining_quantity, unit_cost,
      source_type, source_reference_id, status, cost_basis
    ) values (
      v_batch_id, new.organization_id, new.stock_item_id, v_source_location_id,
      null, null, now(),
      v_unlayered_quantity, v_unlayered_quantity, new.unit_cost_snapshot,
      'opening_balance', v_balance_id, 'active', 'legacy_estimate'
    );

    insert into public.audit_logs(
      organization_id, actor_user_id, action, entity_type, entity_id, after_data, metadata
    ) values (
      new.organization_id,
      auth.uid(),
      'inventory_cost_layer.legacy_runtime_backfilled',
      'inventory_balance',
      v_balance_id,
      jsonb_build_object(
        'batch_id', v_batch_id,
        'quantity', v_unlayered_quantity,
        'estimated_unit_cost', new.unit_cost_snapshot,
        'cost_basis', 'legacy_estimate'
      ),
      jsonb_build_object(
        'source', 'negative_stock_cost_fallback',
        'reason', 'positive_balance_missing_layer_at_outflow',
        'movement_id', new.movement_id
      )
    );

    v_layer_quantity := v_layer_quantity + v_unlayered_quantity;
  end if;

  -- If the repaired/known layers cover the requested output, the regular layer
  -- allocator that runs immediately after this trigger remains authoritative.
  if v_layer_quantity >= new.quantity then
    return null;
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
    select batch.id, batch.remaining_quantity
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
      organization_id, movement_item_id, batch_id, quantity,
      unit_cost_snapshot, cost_basis
    ) values (
      new.organization_id, new.id, v_batch.id, v_take, 0, 'traceable'
    );

    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    v_batch_id := gen_random_uuid();
    insert into public.inventory_batches(
      id, organization_id, stock_item_id, stock_location_id,
      batch_code, expiration_date, received_at,
      original_quantity, remaining_quantity, unit_cost,
      source_type, source_reference_id, status, cost_basis
    ) values (
      v_batch_id, new.organization_id, new.stock_item_id, v_source_location_id,
      null, null, now(),
      v_remaining, 0, new.unit_cost_snapshot,
      'inventory_adjustment', new.movement_id, 'depleted', 'negative_estimate'
    );

    insert into public.stock_movement_batch_allocations(
      organization_id, movement_item_id, batch_id, quantity,
      unit_cost_snapshot, cost_basis
    ) values (
      new.organization_id, new.id, v_batch_id, v_remaining, 0, 'negative_estimate'
    );
  end if;

  perform private.sync_stock_movement_item_cost(new.id, new.organization_id);
  return null;
end;
$$;

revoke all on function private.prepare_negative_stock_cost_fallback()
  from public, anon, authenticated;

drop trigger if exists a_stock_movement_items_negative_cost_fallback
  on public.stock_movement_items;
create trigger a_stock_movement_items_negative_cost_fallback
after insert on public.stock_movement_items
for each row execute function private.prepare_negative_stock_cost_fallback();

create or replace function private.audit_mark_estimated_inventory_cost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item_id uuid;
  v_negative_quantity numeric(18,3);
  v_legacy_quantity numeric(18,3);
begin
  if new.entity_type <> 'stock_movement' then
    return new;
  end if;

  select item.id
    into v_item_id
  from public.stock_movement_items item
  where item.organization_id = new.organization_id
    and item.movement_id = new.entity_id
  order by item.id
  limit 1;

  if not found then
    return new;
  end if;

  select coalesce(sum(allocation.quantity) filter (
           where allocation.cost_basis = 'negative_estimate'
         ), 0)::numeric(18,3),
         coalesce(sum(allocation.quantity) filter (
           where allocation.cost_basis = 'legacy_estimate'
         ), 0)::numeric(18,3)
    into v_negative_quantity, v_legacy_quantity
  from public.stock_movement_batch_allocations allocation
  where allocation.organization_id = new.organization_id
    and allocation.movement_item_id = v_item_id;

  if v_negative_quantity > 0 then
    new.after_data := coalesce(new.after_data, '{}'::jsonb) || jsonb_build_object(
      'cost_warning', 'negative_stock_estimate',
      'negative_estimated_quantity', v_negative_quantity,
      'legacy_estimated_quantity', v_legacy_quantity
    );
  elsif v_legacy_quantity > 0 then
    new.after_data := coalesce(new.after_data, '{}'::jsonb) || jsonb_build_object(
      'cost_warning', 'legacy_cost_estimate',
      'legacy_estimated_quantity', v_legacy_quantity
    );
  end if;

  return new;
end;
$$;

revoke all on function private.audit_mark_estimated_inventory_cost()
  from public, anon, authenticated;

drop trigger if exists audit_logs_mark_estimated_inventory_cost on public.audit_logs;
create trigger audit_logs_mark_estimated_inventory_cost
before insert on public.audit_logs
for each row execute function private.audit_mark_estimated_inventory_cost();