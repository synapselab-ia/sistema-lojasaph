-- Issue #183: preserve the exact layer-consumption order used by stock outflows
-- so partial physical loan restitutions restore the same historical layers.
-- Legacy allocations remain nullable; all new allocations receive a stable order.

alter table public.stock_movement_batch_allocations
  add column allocation_order integer;

alter table public.stock_movement_batch_allocations
  add constraint stock_movement_batch_allocations_order_positive
  check (allocation_order is null or allocation_order > 0);

create unique index stock_movement_batch_allocations_order_unique
  on public.stock_movement_batch_allocations(
    organization_id,
    movement_item_id,
    allocation_order
  )
  where allocation_order is not null;

create or replace function private.assign_stock_movement_allocation_order()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.allocation_order is null then
    select coalesce(max(allocation.allocation_order), 0) + 1
      into new.allocation_order
    from public.stock_movement_batch_allocations allocation
    where allocation.organization_id = new.organization_id
      and allocation.movement_item_id = new.movement_item_id;
  end if;

  return new;
end;
$$;

revoke all on function private.assign_stock_movement_allocation_order()
  from public, anon, authenticated;

create trigger stock_movement_allocations_assign_order
before insert on public.stock_movement_batch_allocations
for each row execute function private.assign_stock_movement_allocation_order();

-- Defensive backfill for any loan allocation created between the two migrations.
-- For historical non-loan movements we intentionally do not infer an order.
with ranked as (
  select allocation.id,
         row_number() over (
           partition by allocation.organization_id, allocation.movement_item_id
           order by
             case when batch.id = loan.preferred_batch_id then 0 else 1 end,
             batch.expiration_date asc nulls last,
             batch.received_at asc,
             batch.id asc
         ) as allocation_order
  from public.stock_movement_batch_allocations allocation
  join public.stock_movement_items item
    on item.id = allocation.movement_item_id
   and item.organization_id = allocation.organization_id
  join public.stock_loans loan
    on loan.loan_out_movement_id = item.movement_id
   and loan.organization_id = item.organization_id
  join public.inventory_batches batch
    on batch.id = allocation.batch_id
   and batch.organization_id = allocation.organization_id
  where allocation.allocation_order is null
)
update public.stock_movement_batch_allocations allocation
set allocation_order = ranked.allocation_order
from ranked
where ranked.id = allocation.id;

create or replace function private.record_stock_loan_restitution(
  p_command_id uuid,
  p_organization_id uuid,
  p_stock_loan_id uuid,
  p_physical_quantity numeric default 0,
  p_monetary_amount numeric default 0,
  p_notes text default null
)
returns table (
  restitution_id uuid,
  loan_id uuid,
  physical_quantity numeric,
  physical_value numeric,
  monetary_amount numeric,
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
declare
  v_user_id uuid := auth.uid();
  v_physical_quantity numeric(18,3) := coalesce(p_physical_quantity, 0);
  v_monetary_amount numeric(18,2) := coalesce(p_monetary_amount, 0);
  v_notes text := nullif(trim(p_notes), '');
  v_existing public.stock_loan_restitutions%rowtype;
  v_loan public.stock_loans%rowtype;
  v_original_movement_item_id uuid;
  v_return_movement_item_id uuid;
  v_current_quantity numeric(18,3);
  v_current_cost numeric(18,2);
  v_next_quantity numeric(18,3);
  v_remaining_to_return numeric(18,3);
  v_prior_returned_quantity numeric(18,3);
  v_available numeric(18,3);
  v_take numeric(18,3);
  v_physical_value numeric(18,2) := 0;
  v_increment_value numeric(18,2);
  v_new_physical_returned_quantity numeric(18,3);
  v_new_physical_returned_value numeric(18,2);
  v_new_monetary_settled numeric(18,2);
  v_new_remaining_physical numeric(18,3);
  v_new_remaining_value numeric(18,2);
  v_new_status text;
  v_settled_at timestamptz;
  v_allocation record;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if v_physical_quantity < 0 or scale(v_physical_quantity) > 3 then
    raise exception 'INVALID_STOCK_QUANTITY' using errcode = '22023';
  end if;
  if v_monetary_amount < 0 or scale(v_monetary_amount) > 2 then
    raise exception 'INVALID_STOCK_LOAN_AMOUNT' using errcode = '22023';
  end if;
  if v_physical_quantity = 0 and v_monetary_amount = 0 then
    raise exception 'STOCK_LOAN_RESTITUTION_REQUIRED' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('stock-loan-restitution-command:' || p_command_id::text, 0)
  );

  select * into v_existing
  from public.stock_loan_restitutions restitution
  where restitution.id = p_command_id;

  if found then
    if v_existing.organization_id <> p_organization_id
      or v_existing.stock_loan_id <> p_stock_loan_id
      or v_existing.physical_quantity <> v_physical_quantity
      or v_existing.monetary_amount <> v_monetary_amount
      or v_existing.notes is distinct from v_notes
    then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;

    return query
    select restitution.id,
           loan.id,
           restitution.physical_quantity,
           restitution.physical_value,
           restitution.monetary_amount,
           loan.remaining_physical_quantity,
           loan.remaining_value,
           loan.status,
           balance.quantity_on_hand,
           balance.average_cost
    from public.stock_loan_restitutions restitution
    join public.stock_loans loan
      on loan.id = restitution.stock_loan_id
     and loan.organization_id = restitution.organization_id
    join public.inventory_balances balance
      on balance.organization_id = loan.organization_id
     and balance.stock_item_id = loan.stock_item_id
     and balance.stock_location_id = loan.source_location_id
    where restitution.id = p_command_id
      and restitution.organization_id = p_organization_id;
    return;
  end if;

  select * into v_loan
  from public.stock_loans loan
  where loan.id = p_stock_loan_id
    and loan.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'STOCK_LOAN_NOT_AVAILABLE' using errcode = '23503';
  end if;

  if not private.has_stock_location_role(
    p_organization_id,
    v_loan.source_location_id,
    array['owner', 'admin', 'manager', 'inventory']
  ) then
    raise exception 'INSUFFICIENT_SCOPE' using errcode = '42501';
  end if;

  if v_loan.status = 'settled' then
    raise exception 'STOCK_LOAN_ALREADY_SETTLED' using errcode = '22023';
  end if;

  if v_physical_quantity > v_loan.remaining_physical_quantity then
    raise exception 'STOCK_LOAN_PHYSICAL_OVER_RETURN' using errcode = '22023';
  end if;

  select item.id into v_original_movement_item_id
  from public.stock_movement_items item
  where item.organization_id = p_organization_id
    and item.movement_id = v_loan.loan_out_movement_id
    and item.stock_item_id = v_loan.stock_item_id;

  if not found then
    raise exception 'STOCK_LOAN_COST_LINEAGE_INCOMPLETE' using errcode = '23514';
  end if;

  if coalesce((
    select sum(allocation.quantity)
    from public.stock_movement_batch_allocations allocation
    where allocation.organization_id = p_organization_id
      and allocation.movement_item_id = v_original_movement_item_id
  ), 0) <> v_loan.original_quantity
  or exists (
    select 1
    from public.stock_movement_batch_allocations allocation
    where allocation.organization_id = p_organization_id
      and allocation.movement_item_id = v_original_movement_item_id
      and allocation.allocation_order is null
  ) then
    raise exception 'STOCK_LOAN_COST_LINEAGE_INCOMPLETE' using errcode = '23514';
  end if;

  insert into public.inventory_balances(
    organization_id, stock_item_id, stock_location_id, quantity_on_hand, average_cost
  ) values (
    p_organization_id, v_loan.stock_item_id, v_loan.source_location_id, 0, 0
  ) on conflict (organization_id, stock_item_id, stock_location_id) do nothing;

  select balance.quantity_on_hand, balance.average_cost
    into v_current_quantity, v_current_cost
  from public.inventory_balances balance
  where balance.organization_id = p_organization_id
    and balance.stock_item_id = v_loan.stock_item_id
    and balance.stock_location_id = v_loan.source_location_id
  for update;

  if v_physical_quantity > 0 then
    if exists (select 1 from public.stock_movements movement where movement.id = p_command_id) then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;

    perform 1
    from public.inventory_batches batch
    where batch.organization_id = p_organization_id
      and batch.id in (
        select allocation.batch_id
        from public.stock_movement_batch_allocations allocation
        where allocation.organization_id = p_organization_id
          and allocation.movement_item_id = v_original_movement_item_id
      )
    order by batch.id
    for update;

    insert into public.stock_movements(
      id, organization_id, movement_type, occurred_at, destination_location_id,
      responsible_user_id, reason_code, reference_type, reference_id, notes,
      status, reversal_of_movement_id
    ) values (
      p_command_id, p_organization_id, 'loan_return', now(), v_loan.source_location_id,
      v_user_id, 'stock_loan_return', 'stock_loan', p_stock_loan_id, v_notes,
      'confirmed', v_loan.loan_out_movement_id
    );

    v_return_movement_item_id := gen_random_uuid();
    insert into public.stock_movement_items(
      id, organization_id, movement_id, stock_item_id, quantity, unit_cost_snapshot
    ) values (
      v_return_movement_item_id, p_organization_id, p_command_id,
      v_loan.stock_item_id, v_physical_quantity, 0
    );

    v_remaining_to_return := v_physical_quantity;

    for v_allocation in
      select allocation.batch_id,
             allocation.quantity as loaned_quantity,
             allocation.unit_cost_snapshot,
             allocation.allocation_order
      from public.stock_movement_batch_allocations allocation
      where allocation.organization_id = p_organization_id
        and allocation.movement_item_id = v_original_movement_item_id
      order by allocation.allocation_order
    loop
      exit when v_remaining_to_return = 0;

      select coalesce(sum(return_allocation.quantity), 0)::numeric(18,3)
        into v_prior_returned_quantity
      from public.stock_movements return_movement
      join public.stock_movement_items return_item
        on return_item.movement_id = return_movement.id
       and return_item.organization_id = return_movement.organization_id
      join public.stock_movement_batch_allocations return_allocation
        on return_allocation.movement_item_id = return_item.id
       and return_allocation.organization_id = return_item.organization_id
      where return_movement.organization_id = p_organization_id
        and return_movement.movement_type = 'loan_return'
        and return_movement.status = 'confirmed'
        and return_movement.reference_type = 'stock_loan'
        and return_movement.reference_id = p_stock_loan_id
        and return_movement.id <> p_command_id
        and return_allocation.batch_id = v_allocation.batch_id;

      v_available := v_allocation.loaned_quantity - v_prior_returned_quantity;
      if v_available <= 0 then
        continue;
      end if;

      v_take := least(v_available, v_remaining_to_return);
      v_increment_value :=
        round((v_prior_returned_quantity + v_take) * v_allocation.unit_cost_snapshot, 2)
        - round(v_prior_returned_quantity * v_allocation.unit_cost_snapshot, 2);

      update public.inventory_batches batch
      set remaining_quantity = batch.remaining_quantity + v_take,
          status = case when batch.status = 'depleted' then 'active' else batch.status end,
          updated_at = now()
      where batch.id = v_allocation.batch_id
        and batch.organization_id = p_organization_id
        and batch.status <> 'cancelled'
        and batch.remaining_quantity + v_take <= batch.original_quantity;

      if not found then
        raise exception 'STOCK_LOAN_RETURN_LAYER_NOT_AVAILABLE' using errcode = '23514';
      end if;

      insert into public.stock_movement_batch_allocations(
        organization_id, movement_item_id, batch_id, quantity,
        unit_cost_snapshot, cost_basis
      ) values (
        p_organization_id, v_return_movement_item_id, v_allocation.batch_id, v_take,
        v_allocation.unit_cost_snapshot, 'traceable'
      );

      v_physical_value := v_physical_value + v_increment_value;
      v_remaining_to_return := v_remaining_to_return - v_take;
    end loop;

    if v_remaining_to_return <> 0 then
      raise exception 'STOCK_LOAN_RETURN_LINEAGE_INCOMPLETE' using errcode = '23514';
    end if;

    v_next_quantity := v_current_quantity + v_physical_quantity;
    update public.inventory_balances balance
    set quantity_on_hand = v_next_quantity,
        average_cost = v_current_cost,
        updated_at = now()
    where balance.organization_id = p_organization_id
      and balance.stock_item_id = v_loan.stock_item_id
      and balance.stock_location_id = v_loan.source_location_id;
  else
    v_next_quantity := v_current_quantity;
  end if;

  if v_physical_value + v_monetary_amount > v_loan.remaining_value then
    raise exception 'STOCK_LOAN_SETTLEMENT_EXCEEDS_BALANCE' using errcode = '22023';
  end if;

  v_new_physical_returned_quantity := v_loan.physical_returned_quantity + v_physical_quantity;
  v_new_physical_returned_value := v_loan.physical_returned_value + v_physical_value;
  v_new_monetary_settled := v_loan.monetary_settled_amount + v_monetary_amount;
  v_new_remaining_physical := v_loan.original_quantity - v_new_physical_returned_quantity;
  v_new_remaining_value := v_loan.original_value - v_new_physical_returned_value - v_new_monetary_settled;

  if v_new_remaining_physical = 0
     or (v_loan.original_value > 0 and v_new_remaining_value = 0)
  then
    v_new_status := 'settled';
    v_settled_at := now();
  else
    v_new_status := 'partial';
    v_settled_at := null;
  end if;

  insert into public.stock_loan_restitutions(
    id, organization_id, stock_loan_id, physical_quantity, physical_value,
    monetary_amount, physical_movement_id, remaining_physical_quantity_after,
    remaining_value_after, occurred_at, responsible_user_id, notes
  ) values (
    p_command_id, p_organization_id, p_stock_loan_id, v_physical_quantity,
    v_physical_value, v_monetary_amount,
    case when v_physical_quantity > 0 then p_command_id else null end,
    v_new_remaining_physical, v_new_remaining_value, now(), v_user_id, v_notes
  );

  update public.stock_loans loan
  set physical_returned_quantity = v_new_physical_returned_quantity,
      physical_returned_value = v_new_physical_returned_value,
      monetary_settled_amount = v_new_monetary_settled,
      status = v_new_status,
      settled_at = v_settled_at,
      updated_at = now()
  where loan.id = p_stock_loan_id
    and loan.organization_id = p_organization_id;

  insert into public.audit_logs(
    organization_id, actor_user_id, action, entity_type, entity_id, after_data, metadata
  ) values (
    p_organization_id,
    v_user_id,
    'stock_loan.restitution_recorded',
    'stock_loan_restitution',
    p_command_id,
    jsonb_build_object(
      'stock_loan_id', p_stock_loan_id,
      'physical_quantity', v_physical_quantity,
      'physical_value', v_physical_value,
      'monetary_amount', v_monetary_amount,
      'remaining_physical_quantity', v_new_remaining_physical,
      'remaining_value', v_new_remaining_value,
      'status', v_new_status,
      'physical_movement_id', case when v_physical_quantity > 0 then p_command_id else null end
    ),
    jsonb_build_object(
      'source', 'record_stock_loan_restitution_rpc',
      'loan_out_movement_id', v_loan.loan_out_movement_id,
      'monetary_boundary', 'loan_only_no_cash_or_finance_posting'
    )
  );

  return query
  select p_command_id,
         p_stock_loan_id,
         v_physical_quantity::numeric,
         v_physical_value::numeric,
         v_monetary_amount::numeric,
         v_new_remaining_physical::numeric,
         v_new_remaining_value::numeric,
         v_new_status,
         v_next_quantity::numeric,
         balance.average_cost
  from public.inventory_balances balance
  where balance.organization_id = p_organization_id
    and balance.stock_item_id = v_loan.stock_item_id
    and balance.stock_location_id = v_loan.source_location_id;
end;
$$;

revoke all on function private.record_stock_loan_restitution(uuid,uuid,uuid,numeric,numeric,text)
  from public, anon, authenticated;
