-- Fase 57 / Issue #187: make inventory cost layers authoritative for runtime costing.
-- Average cost remains a derived balance cache; exact economic trace lives in batches/allocations.

alter table public.inventory_batches
  add column if not exists cost_basis text not null default 'traceable';

alter table public.inventory_batches
  drop constraint if exists inventory_batches_cost_basis_check;
alter table public.inventory_batches
  add constraint inventory_batches_cost_basis_check
  check (cost_basis in ('traceable', 'legacy_estimate'));

alter table public.stock_movement_items
  add column if not exists cost_basis text not null default 'legacy_snapshot';

alter table public.stock_movement_items
  drop constraint if exists stock_movement_items_cost_basis_check;
alter table public.stock_movement_items
  add constraint stock_movement_items_cost_basis_check
  check (cost_basis in ('legacy_snapshot', 'layer_allocation', 'legacy_estimate', 'mixed_estimate'));

alter table public.stock_transfer_items
  add column if not exists cost_basis text not null default 'legacy_snapshot';

alter table public.stock_transfer_items
  drop constraint if exists stock_transfer_items_cost_basis_check;
alter table public.stock_transfer_items
  add constraint stock_transfer_items_cost_basis_check
  check (cost_basis in ('legacy_snapshot', 'layer_allocation', 'legacy_estimate', 'mixed_estimate'));

alter table public.stock_transfer_batch_allocations
  add column if not exists cost_basis text not null default 'traceable';

alter table public.stock_transfer_batch_allocations
  drop constraint if exists stock_transfer_batch_allocations_cost_basis_check;
alter table public.stock_transfer_batch_allocations
  add constraint stock_transfer_batch_allocations_cost_basis_check
  check (cost_basis in ('traceable', 'legacy_estimate'));

alter table public.stock_movement_batch_allocations
  add column if not exists unit_cost_snapshot numeric(18,2),
  add column if not exists cost_basis text not null default 'traceable';

update public.stock_movement_batch_allocations allocation
set unit_cost_snapshot = batch.unit_cost,
    cost_basis = batch.cost_basis
from public.inventory_batches batch
where batch.id = allocation.batch_id
  and batch.organization_id = allocation.organization_id
  and allocation.unit_cost_snapshot is null;

alter table public.stock_movement_batch_allocations
  alter column unit_cost_snapshot set not null;

alter table public.stock_movement_batch_allocations
  drop constraint if exists stock_movement_batch_allocations_unit_cost_nonnegative,
  drop constraint if exists stock_movement_batch_allocations_cost_basis_check;

alter table public.stock_movement_batch_allocations
  add constraint stock_movement_batch_allocations_unit_cost_nonnegative
    check (unit_cost_snapshot >= 0),
  add constraint stock_movement_batch_allocations_cost_basis_check
    check (cost_basis in ('traceable', 'legacy_estimate'));

alter table public.stock_movement_batch_allocations
  add column if not exists total_cost_snapshot numeric(18,2)
    generated always as (round(quantity * unit_cost_snapshot, 2)) stored;

create or replace function private.refresh_inventory_balance_layer_cost(
  p_organization_id uuid,
  p_stock_item_id uuid,
  p_stock_location_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance_quantity numeric(18,3);
  v_layer_quantity numeric(18,3);
  v_layer_value numeric;
  v_layer_average numeric(18,2);
begin
  select balance.quantity_on_hand
    into v_balance_quantity
  from public.inventory_balances balance
  where balance.organization_id = p_organization_id
    and balance.stock_item_id = p_stock_item_id
    and balance.stock_location_id = p_stock_location_id;

  if not found then return; end if;

  select coalesce(sum(batch.remaining_quantity), 0)::numeric(18,3),
         coalesce(sum(batch.remaining_quantity * batch.unit_cost), 0)
    into v_layer_quantity, v_layer_value
  from public.inventory_batches batch
  where batch.organization_id = p_organization_id
    and batch.stock_item_id = p_stock_item_id
    and batch.stock_location_id = p_stock_location_id
    and batch.status in ('active', 'blocked')
    and batch.remaining_quantity > 0;

  if v_balance_quantity = 0 then
    v_layer_average := 0;
  elsif v_layer_quantity = v_balance_quantity and v_layer_quantity > 0 then
    v_layer_average := round(v_layer_value / v_layer_quantity, 2);
  else
    return;
  end if;

  update public.inventory_balances balance
  set average_cost = v_layer_average,
      updated_at = now()
  where balance.organization_id = p_organization_id
    and balance.stock_item_id = p_stock_item_id
    and balance.stock_location_id = p_stock_location_id
    and balance.average_cost is distinct from v_layer_average;
end;
$$;

revoke all on function private.refresh_inventory_balance_layer_cost(uuid, uuid, uuid)
  from public, anon, authenticated;

create or replace function private.inventory_balance_layer_cost_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_layer_quantity numeric(18,3);
  v_layer_value numeric;
begin
  if new.quantity_on_hand = 0 then
    new.average_cost := 0;
    return new;
  end if;

  select coalesce(sum(batch.remaining_quantity), 0)::numeric(18,3),
         coalesce(sum(batch.remaining_quantity * batch.unit_cost), 0)
    into v_layer_quantity, v_layer_value
  from public.inventory_batches batch
  where batch.organization_id = new.organization_id
    and batch.stock_item_id = new.stock_item_id
    and batch.stock_location_id = new.stock_location_id
    and batch.status in ('active', 'blocked')
    and batch.remaining_quantity > 0;

  if v_layer_quantity = new.quantity_on_hand and v_layer_quantity > 0 then
    new.average_cost := round(v_layer_value / v_layer_quantity, 2);
  end if;

  return new;
end;
$$;

revoke all on function private.inventory_balance_layer_cost_guard()
  from public, anon, authenticated;

drop trigger if exists inventory_balances_layer_cost_guard on public.inventory_balances;
create trigger inventory_balances_layer_cost_guard
before insert or update of quantity_on_hand, average_cost
on public.inventory_balances
for each row execute function private.inventory_balance_layer_cost_guard();

create or replace function private.inventory_batch_refresh_balance_cost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_inventory_balance_layer_cost(old.organization_id, old.stock_item_id, old.stock_location_id);
  else
    perform private.refresh_inventory_balance_layer_cost(new.organization_id, new.stock_item_id, new.stock_location_id);
  end if;
  return null;
end;
$$;

revoke all on function private.inventory_batch_refresh_balance_cost()
  from public, anon, authenticated;

drop trigger if exists inventory_batches_refresh_balance_cost on public.inventory_batches;
create trigger inventory_batches_refresh_balance_cost
after insert or update of remaining_quantity, unit_cost, status or delete
on public.inventory_batches
for each row execute function private.inventory_batch_refresh_balance_cost();

create or replace function private.stock_movement_allocation_capture_cost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select batch.unit_cost, batch.cost_basis
    into new.unit_cost_snapshot, new.cost_basis
  from public.inventory_batches batch
  where batch.id = new.batch_id
    and batch.organization_id = new.organization_id;

  if not found then
    raise exception 'STOCK_COST_LAYER_NOT_FOUND' using errcode = '23503';
  end if;
  return new;
end;
$$;

revoke all on function private.stock_movement_allocation_capture_cost()
  from public, anon, authenticated;

drop trigger if exists stock_movement_allocations_capture_cost on public.stock_movement_batch_allocations;
create trigger stock_movement_allocations_capture_cost
before insert or update of batch_id, organization_id
on public.stock_movement_batch_allocations
for each row execute function private.stock_movement_allocation_capture_cost();

create or replace function private.stock_transfer_allocation_propagate_cost_basis()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.destination_batch_id is not null then
    update public.inventory_batches batch
    set cost_basis = new.cost_basis,
        updated_at = now()
    where batch.id = new.destination_batch_id
      and batch.organization_id = new.organization_id
      and batch.cost_basis is distinct from new.cost_basis;
  end if;
  return null;
end;
$$;

revoke all on function private.stock_transfer_allocation_propagate_cost_basis()
  from public, anon, authenticated;

drop trigger if exists stock_transfer_allocations_propagate_cost_basis on public.stock_transfer_batch_allocations;
create trigger stock_transfer_allocations_propagate_cost_basis
after insert or update of destination_batch_id, cost_basis
on public.stock_transfer_batch_allocations
for each row execute function private.stock_transfer_allocation_propagate_cost_basis();

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

create or replace function private.stock_movement_allocation_sync_item_cost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.sync_stock_movement_item_cost(old.movement_item_id, old.organization_id);
  else
    perform private.sync_stock_movement_item_cost(new.movement_item_id, new.organization_id);
  end if;
  return null;
end;
$$;

revoke all on function private.stock_movement_allocation_sync_item_cost()
  from public, anon, authenticated;

drop trigger if exists stock_movement_allocations_sync_item_cost on public.stock_movement_batch_allocations;
create trigger stock_movement_allocations_sync_item_cost
after insert or update of quantity, unit_cost_snapshot, cost_basis, movement_item_id or delete
on public.stock_movement_batch_allocations
for each row execute function private.stock_movement_allocation_sync_item_cost();

create or replace function private.sync_stock_movement_cost_audit(
  p_movement_item_id uuid,
  p_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_movement_id uuid;
  v_unit_cost numeric(18,2);
  v_cost_basis text;
  v_total_cost numeric(18,2);
  v_layer_count integer;
begin
  select item.movement_id, item.unit_cost_snapshot, item.cost_basis
    into v_movement_id, v_unit_cost, v_cost_basis
  from public.stock_movement_items item
  where item.id = p_movement_item_id
    and item.organization_id = p_organization_id;
  if not found then return; end if;

  select coalesce(sum(allocation.total_cost_snapshot), 0)::numeric(18,2), count(*)::integer
    into v_total_cost, v_layer_count
  from public.stock_movement_batch_allocations allocation
  where allocation.organization_id = p_organization_id
    and allocation.movement_item_id = p_movement_item_id;

  update public.audit_logs audit
  set after_data = audit.after_data || jsonb_build_object(
        'unit_cost_snapshot', v_unit_cost,
        'total_cost_snapshot', v_total_cost,
        'cost_basis', v_cost_basis,
        'cost_layer_count', v_layer_count
      )
  where audit.organization_id = p_organization_id
    and audit.entity_type = 'stock_movement'
    and audit.entity_id = v_movement_id;

  update public.audit_logs audit
  set after_data = audit.after_data || jsonb_build_object(
        'unit_cost_snapshot', v_unit_cost,
        'total_cost_snapshot', v_total_cost,
        'cost_basis', v_cost_basis,
        'cost_layer_count', v_layer_count
      )
  where audit.organization_id = p_organization_id
    and audit.entity_type = 'stock_transfer'
    and audit.entity_id = v_movement_id
    and audit.action = 'stock_transfer.dispatched';
end;
$$;

revoke all on function private.sync_stock_movement_cost_audit(uuid, uuid)
  from public, anon, authenticated;

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
  v_allocated numeric(18,3);
  v_remaining numeric(18,3);
  v_take numeric(18,3);
  v_batch record;
  v_batch_id uuid;
  v_source_type text;
  v_transfer_item_id uuid;
  v_transfer_allocation_count integer;
  v_transfer_order integer;
  v_transfer_cost numeric(18,2);
  v_transfer_basis text;
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
         movement.status
    into v_movement_type,
         v_source_location_id,
         v_destination_location_id,
         v_reference_type,
         v_reference_id,
         v_reversal_id,
         v_status
  from public.stock_movements movement
  where movement.id = new.movement_id
    and movement.organization_id = new.organization_id;

  if not found or v_status <> 'confirmed' then return null; end if;

  select coalesce(sum(allocation.quantity), 0)::numeric(18,3)
    into v_allocated
  from public.stock_movement_batch_allocations allocation
  where allocation.organization_id = new.organization_id
    and allocation.movement_item_id = new.id;

  if v_movement_type in (
       'withdrawal', 'sector_withdrawal', 'loss', 'expiration', 'return_out',
       'loan_out', 'inventory_adjustment_negative', 'manual_adjustment_negative'
     )
     or (v_movement_type = 'inventory_adjustment' and v_source_location_id is not null)
     or v_movement_type = 'transfer_out'
  then
    if v_source_location_id is null then
      raise exception 'STOCK_COST_LAYER_SOURCE_REQUIRED' using errcode = '22023';
    end if;

    if v_allocated = 0 then
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
            status = case when batch.remaining_quantity - v_take = 0 then 'depleted' else batch.status end,
            updated_at = now()
        where batch.id = v_batch.id
          and batch.organization_id = new.organization_id;

        insert into public.stock_movement_batch_allocations(
          organization_id, movement_item_id, batch_id, quantity, unit_cost_snapshot, cost_basis
        ) values (
          new.organization_id, new.id, v_batch.id, v_take, 0, 'traceable'
        );
        v_remaining := v_remaining - v_take;
      end loop;

      if v_remaining <> 0 then
        raise exception 'STOCK_COST_LAYER_REQUIRED' using errcode = '22023';
      end if;
    elsif v_allocated <> new.quantity then
      raise exception 'STOCK_COST_LAYER_ALLOCATION_MISMATCH' using errcode = '23514';
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

      select count(*)::integer
        into v_transfer_allocation_count
      from public.stock_transfer_batch_allocations allocation
      where allocation.organization_id = new.organization_id
        and allocation.transfer_item_id = v_transfer_item_id;

      if v_transfer_allocation_count = 0 then
        v_transfer_order := 0;
        for v_batch in
          select allocation.batch_id,
                 allocation.quantity,
                 allocation.unit_cost_snapshot,
                 allocation.cost_basis,
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
            organization_id, transfer_item_id, source_batch_id, destination_batch_id,
            quantity, received_quantity, batch_code_snapshot, expiration_date_snapshot,
            unit_cost_snapshot, allocation_order, cost_basis
          ) values (
            new.organization_id, v_transfer_item_id, v_batch.batch_id, null,
            v_batch.quantity, 0, v_batch.batch_code, v_batch.expiration_date,
            v_batch.unit_cost_snapshot, v_transfer_order, v_batch.cost_basis
          );
        end loop;
      end if;

      select round(sum(allocation.quantity * allocation.unit_cost_snapshot) / sum(allocation.quantity), 2),
             case
               when bool_and(allocation.cost_basis = 'traceable') then 'layer_allocation'
               when bool_and(allocation.cost_basis = 'legacy_estimate') then 'legacy_estimate'
               else 'mixed_estimate'
             end
        into v_transfer_cost, v_transfer_basis
      from public.stock_transfer_batch_allocations allocation
      where allocation.organization_id = new.organization_id
        and allocation.transfer_item_id = v_transfer_item_id;

      update public.stock_transfer_items item
      set unit_cost_snapshot = v_transfer_cost,
          cost_basis = v_transfer_basis
      where item.id = v_transfer_item_id
        and item.organization_id = new.organization_id;
    end if;

    perform private.sync_stock_movement_item_cost(new.id, new.organization_id);
    perform private.sync_stock_movement_cost_audit(new.id, new.organization_id);
    return null;
  end if;

  if v_movement_type = 'return_in' then
    if v_allocated = 0 then
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

        perform 1
        from public.inventory_batches batch
        where batch.id = v_batch.batch_id
          and batch.organization_id = new.organization_id
        for update;
        if not found then
          raise exception 'RETURN_COST_LAYER_NOT_FOUND' using errcode = '23503';
        end if;

        update public.inventory_batches batch
        set remaining_quantity = batch.remaining_quantity + v_take,
            status = case when batch.status = 'depleted' then 'active' else batch.status end,
            updated_at = now()
        where batch.id = v_batch.batch_id
          and batch.organization_id = new.organization_id
          and batch.remaining_quantity + v_take <= batch.original_quantity;
        if not found then
          raise exception 'RETURN_COST_LAYER_CAPACITY_EXCEEDED' using errcode = '23514';
        end if;

        insert into public.stock_movement_batch_allocations(
          organization_id, movement_item_id, batch_id, quantity, unit_cost_snapshot, cost_basis
        ) values (
          new.organization_id, new.id, v_batch.batch_id, v_take, 0, 'traceable'
        );
        v_remaining := v_remaining - v_take;
      end loop;

      if v_remaining <> 0 then
        raise exception 'RETURN_COST_LINEAGE_INCOMPLETE' using errcode = '22023';
      end if;
    elsif v_allocated <> new.quantity then
      raise exception 'RETURN_COST_LAYER_ALLOCATION_MISMATCH' using errcode = '23514';
    end if;

    perform private.sync_stock_movement_item_cost(new.id, new.organization_id);
    perform private.sync_stock_movement_cost_audit(new.id, new.organization_id);
    return null;
  end if;

  if v_movement_type = 'transfer_in' then
    if v_allocated <> new.quantity then
      raise exception 'TRANSFER_COST_LAYER_REQUIRED' using errcode = '22023';
    end if;
    perform private.sync_stock_movement_item_cost(new.id, new.organization_id);
    perform private.sync_stock_movement_cost_audit(new.id, new.organization_id);
    return null;
  end if;

  if v_movement_type in (
       'opening_balance', 'purchase_receipt', 'entry',
       'inventory_adjustment_positive', 'manual_adjustment_positive'
     )
     or (v_movement_type = 'inventory_adjustment' and v_destination_location_id is not null)
  then
    if v_destination_location_id is null then
      raise exception 'STOCK_COST_LAYER_DESTINATION_REQUIRED' using errcode = '22023';
    end if;

    if v_allocated = 0 then
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
      end if;

      v_batch_id := gen_random_uuid();
      v_source_type := case
        when v_movement_type = 'opening_balance' then 'opening_balance'
        when v_movement_type = 'inventory_adjustment' then 'inventory_adjustment'
        when v_movement_type in ('inventory_adjustment_positive', 'manual_adjustment_positive') then 'inventory_adjustment'
        when v_reference_type = 'purchase_receipt' or v_movement_type = 'purchase_receipt' then 'purchase_receipt'
        else 'entry'
      end;

      insert into public.inventory_batches(
        id, organization_id, stock_item_id, stock_location_id, batch_code, expiration_date,
        received_at, original_quantity, remaining_quantity, unit_cost, source_type,
        source_reference_id, status, cost_basis
      ) values (
        v_batch_id, new.organization_id, new.stock_item_id, v_destination_location_id, null, null,
        now(), new.quantity, new.quantity, new.unit_cost_snapshot, v_source_type,
        coalesce(v_reference_id, new.movement_id), 'active', 'traceable'
      );

      insert into public.stock_movement_batch_allocations(
        organization_id, movement_item_id, batch_id, quantity, unit_cost_snapshot, cost_basis
      ) values (
        new.organization_id, new.id, v_batch_id, new.quantity, 0, 'traceable'
      );
    elsif v_allocated <> new.quantity then
      raise exception 'STOCK_COST_LAYER_ALLOCATION_MISMATCH' using errcode = '23514';
    end if;

    perform private.sync_stock_movement_item_cost(new.id, new.organization_id);
    perform private.sync_stock_movement_cost_audit(new.id, new.organization_id);
    return null;
  end if;

  return null;
end;
$$;

revoke all on function private.ensure_stock_movement_cost_layers()
  from public, anon, authenticated;

drop trigger if exists stock_movement_items_ensure_cost_layers on public.stock_movement_items;
create constraint trigger stock_movement_items_ensure_cost_layers
after insert on public.stock_movement_items
deferrable initially deferred
for each row execute function private.ensure_stock_movement_cost_layers();

update public.stock_transfer_batch_allocations allocation
set cost_basis = batch.cost_basis
from public.inventory_batches batch
where batch.id = allocation.source_batch_id
  and batch.organization_id = allocation.organization_id;

with missing as (
  select balance.id as balance_id,
         balance.organization_id,
         balance.stock_item_id,
         balance.stock_location_id,
         balance.quantity_on_hand,
         balance.average_cost,
         gen_random_uuid() as batch_id
  from public.inventory_balances balance
  where balance.quantity_on_hand > 0
    and not exists (
      select 1
      from public.inventory_batches batch
      where batch.organization_id = balance.organization_id
        and batch.stock_item_id = balance.stock_item_id
        and batch.stock_location_id = balance.stock_location_id
        and batch.remaining_quantity > 0
        and batch.status in ('active', 'blocked')
    )
), inserted as (
  insert into public.inventory_batches(
    id, organization_id, stock_item_id, stock_location_id, batch_code, expiration_date,
    received_at, original_quantity, remaining_quantity, unit_cost, source_type,
    source_reference_id, status, cost_basis
  )
  select missing.batch_id, missing.organization_id, missing.stock_item_id, missing.stock_location_id,
         null, null, now(), missing.quantity_on_hand, missing.quantity_on_hand,
         missing.average_cost, 'opening_balance', missing.balance_id, 'active', 'legacy_estimate'
  from missing
  returning id, organization_id, source_reference_id, original_quantity, unit_cost, cost_basis
)
insert into public.audit_logs(
  organization_id, actor_user_id, action, entity_type, entity_id, after_data, metadata
)
select inserted.organization_id,
       null,
       'inventory_cost_layer.legacy_backfilled',
       'inventory_balance',
       inserted.source_reference_id,
       jsonb_build_object(
         'batch_id', inserted.id,
         'quantity', inserted.original_quantity,
         'estimated_unit_cost', inserted.unit_cost,
         'cost_basis', inserted.cost_basis
       ),
       jsonb_build_object(
         'source', '20260904101500_layer_costing_runtime',
         'reason', 'pre_layer_positive_balance'
       )
from inserted;

select private.sync_stock_movement_item_cost(allocation.movement_item_id, allocation.organization_id)
from public.stock_movement_batch_allocations allocation
group by allocation.movement_item_id, allocation.organization_id;

update public.stock_transfer_items item
set unit_cost_snapshot = derived.unit_cost,
    cost_basis = derived.cost_basis
from (
  select allocation.organization_id,
         allocation.transfer_item_id,
         round(sum(allocation.quantity * allocation.unit_cost_snapshot) / sum(allocation.quantity), 2)::numeric(18,2) as unit_cost,
         case
           when bool_and(allocation.cost_basis = 'traceable') then 'layer_allocation'
           when bool_and(allocation.cost_basis = 'legacy_estimate') then 'legacy_estimate'
           else 'mixed_estimate'
         end as cost_basis
  from public.stock_transfer_batch_allocations allocation
  group by allocation.organization_id, allocation.transfer_item_id
) derived
where item.organization_id = derived.organization_id
  and item.id = derived.transfer_item_id;
