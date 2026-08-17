drop policy if exists memberships_visible_to_self_or_admin on public.organization_memberships;
create policy memberships_visible_to_self_or_admin
  on public.organization_memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.has_org_role(organization_id, array['owner', 'admin'])
  );

create index if not exists inventory_balances_item_org_idx
  on public.inventory_balances(stock_item_id, organization_id);
create index if not exists inventory_balances_location_org_idx
  on public.inventory_balances(stock_location_id, organization_id);
create index if not exists inventory_batches_item_org_idx
  on public.inventory_batches(stock_item_id, organization_id);
create index if not exists inventory_batches_location_org_idx
  on public.inventory_batches(stock_location_id, organization_id);
create index if not exists stock_movement_items_movement_org_idx
  on public.stock_movement_items(movement_id, organization_id);
create index if not exists stock_movement_items_item_org_idx
  on public.stock_movement_items(stock_item_id, organization_id);
create index if not exists stock_transfers_source_org_idx
  on public.stock_transfers(source_location_id, organization_id);
create index if not exists stock_transfers_destination_org_idx
  on public.stock_transfers(destination_location_id, organization_id);
create index if not exists stock_transfer_items_transfer_org_idx
  on public.stock_transfer_items(transfer_id, organization_id);
create index if not exists supplier_contacts_supplier_org_idx
  on public.supplier_contacts(supplier_id, organization_id);
create index if not exists supplier_items_supplier_org_idx
  on public.supplier_items(supplier_id, organization_id);
create index if not exists supplier_items_item_org_idx
  on public.supplier_items(stock_item_id, organization_id);
create index if not exists supplier_prices_supplier_item_org_idx
  on public.supplier_prices(supplier_item_id, organization_id);
create index if not exists inventory_count_lines_count_org_idx
  on public.inventory_count_lines(inventory_count_id, organization_id);
create index if not exists inventory_count_lines_item_org_idx
  on public.inventory_count_lines(stock_item_id, organization_id);
create index if not exists inventory_counts_location_org_idx
  on public.inventory_counts(stock_location_id, organization_id);

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

  select movement.organization_id, movement.movement_type
    into v_existing_org, v_existing_type
  from public.stock_movements movement
  where movement.id = p_command_id;

  if found then
    if v_existing_org <> p_organization_id or v_existing_type <> 'entry' then
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
  v_next_cost := case
    when v_current_quantity = 0 then round(p_unit_cost, 2)
    else round(
      ((v_current_quantity * v_current_cost) + (p_quantity * p_unit_cost))
      / v_next_quantity,
      2
    )
  end;

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

revoke all on function public.record_stock_entry(uuid, uuid, uuid, uuid, numeric, numeric, text, date, text) from public, anon;
grant execute on function public.record_stock_entry(uuid, uuid, uuid, uuid, numeric, numeric, text, date, text) to authenticated;
