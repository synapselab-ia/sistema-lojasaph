alter table public.inventory_count_lines
  drop constraint if exists inventory_count_lines_expected_quantity_check;

alter table public.inventory_count_lines
  add column if not exists expected_average_cost numeric(18,2) not null default 0,
  add column if not exists adjustment_unit_cost numeric(18,2);

alter table public.inventory_count_lines
  add constraint inventory_count_lines_expected_average_cost_nonnegative
  check (expected_average_cost >= 0),
  add constraint inventory_count_lines_adjustment_unit_cost_nonnegative
  check (adjustment_unit_cost is null or adjustment_unit_cost >= 0);

create unique index if not exists inventory_counts_one_counting_per_location_idx
  on public.inventory_counts(organization_id, stock_location_id)
  where status = 'counting';

create or replace function public.start_inventory_count(
  p_command_id uuid,
  p_organization_id uuid,
  p_stock_location_id uuid
)
returns table (
  inventory_count_id uuid,
  inventory_count_status text,
  line_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_org uuid;
  v_existing_location uuid;
  v_existing_status text;
  v_line_count integer;
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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_command_id::text, 0)
  );

  select inventory_count.organization_id,
         inventory_count.stock_location_id,
         inventory_count.status
    into v_existing_org,
         v_existing_location,
         v_existing_status
  from public.inventory_counts inventory_count
  where inventory_count.id = p_command_id;

  if found then
    if v_existing_org <> p_organization_id
      or v_existing_location <> p_stock_location_id
    then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;

    select count(*)::integer
      into v_line_count
    from public.inventory_count_lines line
    where line.inventory_count_id = p_command_id
      and line.organization_id = p_organization_id;

    return query
    select p_command_id, v_existing_status, v_line_count;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'inventory_count:' || p_organization_id::text || ':' || p_stock_location_id::text,
      0
    )
  );

  perform 1
  from public.stock_locations location
  where location.id = p_stock_location_id
    and location.organization_id = p_organization_id
    and location.status = 'active';

  if not found then
    raise exception 'STOCK_LOCATION_NOT_AVAILABLE' using errcode = '23503';
  end if;

  if exists (
    select 1
    from public.inventory_counts inventory_count
    where inventory_count.organization_id = p_organization_id
      and inventory_count.stock_location_id = p_stock_location_id
      and inventory_count.status = 'counting'
  ) then
    raise exception 'INVENTORY_COUNT_ALREADY_OPEN' using errcode = '23505';
  end if;

  insert into public.inventory_counts (
    id,
    organization_id,
    stock_location_id,
    status,
    started_at,
    responsible_user_id
  ) values (
    p_command_id,
    p_organization_id,
    p_stock_location_id,
    'counting',
    now(),
    v_user_id
  );

  insert into public.inventory_count_lines (
    organization_id,
    inventory_count_id,
    stock_item_id,
    expected_quantity,
    expected_average_cost,
    counted_quantity,
    adjustment_unit_cost
  )
  select
    p_organization_id,
    p_command_id,
    item.id,
    coalesce(balance.quantity_on_hand, 0),
    coalesce(balance.average_cost, 0),
    null,
    null
  from public.stock_items item
  left join public.inventory_balances balance
    on balance.organization_id = item.organization_id
   and balance.stock_item_id = item.id
   and balance.stock_location_id = p_stock_location_id
  where item.organization_id = p_organization_id
    and item.active
  order by item.id;

  get diagnostics v_line_count = row_count;

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
    'inventory_count.started',
    'inventory_count',
    p_command_id,
    jsonb_build_object(
      'stock_location_id', p_stock_location_id,
      'status', 'counting',
      'line_count', v_line_count
    ),
    jsonb_build_object(
      'source', 'start_inventory_count_rpc',
      'command_id', p_command_id
    )
  );

  return query
  select p_command_id, 'counting'::text, v_line_count;
end;
$$;

revoke all on function public.start_inventory_count(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.start_inventory_count(uuid, uuid, uuid)
  to authenticated;

create or replace function public.set_inventory_count_line(
  p_command_id uuid,
  p_organization_id uuid,
  p_inventory_count_id uuid,
  p_stock_item_id uuid,
  p_counted_quantity numeric,
  p_adjustment_unit_cost numeric default null
)
returns table (
  inventory_count_id uuid,
  stock_item_id uuid,
  counted_quantity numeric,
  adjustment_unit_cost numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count_status text;
  v_previous_quantity numeric(18,3);
  v_previous_cost numeric(18,2);
  v_existing_count_id uuid;
  v_existing_item_id uuid;
  v_existing_quantity numeric(18,3);
  v_existing_cost numeric(18,2);
  v_existing_audit boolean;
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

  if p_counted_quantity is null
    or p_counted_quantity < 0
    or scale(p_counted_quantity) > 3
  then
    raise exception 'INVALID_COUNTED_QUANTITY' using errcode = '22023';
  end if;

  if p_adjustment_unit_cost is not null
    and (p_adjustment_unit_cost < 0 or scale(p_adjustment_unit_cost) > 2)
  then
    raise exception 'INVALID_ADJUSTMENT_COST' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_command_id::text, 0)
  );

  select
    (audit.metadata ->> 'inventory_count_id')::uuid,
    (audit.metadata ->> 'stock_item_id')::uuid,
    (audit.after_data ->> 'counted_quantity')::numeric,
    nullif(audit.after_data ->> 'adjustment_unit_cost', '')::numeric,
    true
  into
    v_existing_count_id,
    v_existing_item_id,
    v_existing_quantity,
    v_existing_cost,
    v_existing_audit
  from public.audit_logs audit
  where audit.organization_id = p_organization_id
    and audit.action = 'inventory_count.line_counted'
    and audit.metadata ->> 'command_id' = p_command_id::text
  order by audit.occurred_at desc
  limit 1;

  if found then
    if not v_existing_audit
      or v_existing_count_id <> p_inventory_count_id
      or v_existing_item_id <> p_stock_item_id
      or v_existing_quantity is distinct from p_counted_quantity
      or v_existing_cost is distinct from p_adjustment_unit_cost
    then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;

    return query
    select
      p_inventory_count_id,
      p_stock_item_id,
      v_existing_quantity,
      v_existing_cost;
    return;
  end if;

  select inventory_count.status
    into v_count_status
  from public.inventory_counts inventory_count
  where inventory_count.id = p_inventory_count_id
    and inventory_count.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'INVENTORY_COUNT_NOT_FOUND' using errcode = '23503';
  end if;

  if v_count_status <> 'counting' then
    raise exception 'INVENTORY_COUNT_NOT_EDITABLE' using errcode = '22023';
  end if;

  select line.counted_quantity,
         line.adjustment_unit_cost
    into v_previous_quantity,
         v_previous_cost
  from public.inventory_count_lines line
  where line.inventory_count_id = p_inventory_count_id
    and line.organization_id = p_organization_id
    and line.stock_item_id = p_stock_item_id
  for update;

  if not found then
    raise exception 'INVENTORY_COUNT_LINE_NOT_FOUND' using errcode = '23503';
  end if;

  update public.inventory_count_lines line
  set counted_quantity = p_counted_quantity,
      adjustment_unit_cost = p_adjustment_unit_cost,
      updated_at = now()
  where line.inventory_count_id = p_inventory_count_id
    and line.organization_id = p_organization_id
    and line.stock_item_id = p_stock_item_id;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    metadata
  )
  select
    p_organization_id,
    v_user_id,
    'inventory_count.line_counted',
    'inventory_count_line',
    line.id,
    jsonb_build_object(
      'counted_quantity', v_previous_quantity,
      'adjustment_unit_cost', v_previous_cost
    ),
    jsonb_build_object(
      'counted_quantity', p_counted_quantity,
      'adjustment_unit_cost', p_adjustment_unit_cost
    ),
    jsonb_build_object(
      'source', 'set_inventory_count_line_rpc',
      'command_id', p_command_id,
      'inventory_count_id', p_inventory_count_id,
      'stock_item_id', p_stock_item_id
    )
  from public.inventory_count_lines line
  where line.inventory_count_id = p_inventory_count_id
    and line.organization_id = p_organization_id
    and line.stock_item_id = p_stock_item_id;

  return query
  select
    p_inventory_count_id,
    p_stock_item_id,
    p_counted_quantity,
    p_adjustment_unit_cost;
end;
$$;

revoke all on function public.set_inventory_count_line(
  uuid, uuid, uuid, uuid, numeric, numeric
) from public, anon;
grant execute on function public.set_inventory_count_line(
  uuid, uuid, uuid, uuid, numeric, numeric
) to authenticated;

create or replace function public.confirm_inventory_count(
  p_command_id uuid,
  p_organization_id uuid,
  p_inventory_count_id uuid
)
returns table (
  inventory_count_id uuid,
  inventory_count_status text,
  positive_adjustment_movement_id uuid,
  negative_adjustment_movement_id uuid,
  adjusted_line_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count_status text;
  v_stock_location_id uuid;
  v_positive_movement_id uuid;
  v_negative_movement_id uuid;
  v_positive_movement_item_id uuid;
  v_negative_movement_item_id uuid;
  v_adjusted_line_count integer := 0;
  v_difference numeric(18,3);
  v_adjustment_quantity numeric(18,3);
  v_incoming_cost numeric(18,2);
  v_next_average_cost numeric(18,2);
  v_remaining numeric(18,3);
  v_take numeric(18,3);
  v_batch record;
  v_line record;
  v_existing_count_id uuid;
  v_existing_positive_movement_id uuid;
  v_existing_negative_movement_id uuid;
  v_existing_adjusted_line_count integer;
  v_existing_audit boolean;
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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_command_id::text, 0)
  );

  select
    audit.entity_id,
    nullif(audit.metadata ->> 'positive_movement_id', '')::uuid,
    nullif(audit.metadata ->> 'negative_movement_id', '')::uuid,
    (audit.metadata ->> 'adjusted_line_count')::integer,
    true
  into
    v_existing_count_id,
    v_existing_positive_movement_id,
    v_existing_negative_movement_id,
    v_existing_adjusted_line_count,
    v_existing_audit
  from public.audit_logs audit
  where audit.organization_id = p_organization_id
    and audit.action = 'inventory_count.confirmed'
    and audit.metadata ->> 'command_id' = p_command_id::text
  order by audit.occurred_at desc
  limit 1;

  if found then
    if not v_existing_audit
      or v_existing_count_id <> p_inventory_count_id
    then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;

    return query
    select
      p_inventory_count_id,
      'confirmed'::text,
      v_existing_positive_movement_id,
      v_existing_negative_movement_id,
      v_existing_adjusted_line_count;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('inventory_count:' || p_inventory_count_id::text, 0)
  );

  select inventory_count.status,
         inventory_count.stock_location_id
    into v_count_status,
         v_stock_location_id
  from public.inventory_counts inventory_count
  where inventory_count.id = p_inventory_count_id
    and inventory_count.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'INVENTORY_COUNT_NOT_FOUND' using errcode = '23503';
  end if;

  if v_count_status <> 'counting' then
    raise exception 'INVENTORY_COUNT_NOT_CONFIRMABLE' using errcode = '22023';
  end if;

  perform 1
  from public.inventory_count_lines line
  where line.inventory_count_id = p_inventory_count_id
    and line.organization_id = p_organization_id
  order by line.stock_item_id
  for update;

  if exists (
    select 1
    from public.inventory_count_lines line
    where line.inventory_count_id = p_inventory_count_id
      and line.organization_id = p_organization_id
      and line.counted_quantity is null
  ) then
    raise exception 'INVENTORY_COUNT_INCOMPLETE' using errcode = '22023';
  end if;

  insert into public.inventory_balances (
    organization_id,
    stock_item_id,
    stock_location_id,
    quantity_on_hand,
    average_cost
  )
  select
    p_organization_id,
    line.stock_item_id,
    v_stock_location_id,
    0,
    0
  from public.inventory_count_lines line
  where line.inventory_count_id = p_inventory_count_id
    and line.organization_id = p_organization_id
  on conflict (organization_id, stock_item_id, stock_location_id) do nothing;

  perform 1
  from public.inventory_balances balance
  join public.inventory_count_lines line
    on line.organization_id = balance.organization_id
   and line.stock_item_id = balance.stock_item_id
   and line.inventory_count_id = p_inventory_count_id
  where balance.organization_id = p_organization_id
    and balance.stock_location_id = v_stock_location_id
  order by balance.stock_item_id
  for update of balance;

  if exists (
    select 1
    from public.inventory_count_lines line
    join public.inventory_balances balance
      on balance.organization_id = line.organization_id
     and balance.stock_item_id = line.stock_item_id
     and balance.stock_location_id = v_stock_location_id
    where line.inventory_count_id = p_inventory_count_id
      and line.organization_id = p_organization_id
      and (
        balance.quantity_on_hand is distinct from line.expected_quantity
        or balance.average_cost is distinct from line.expected_average_cost
      )
  ) then
    raise exception 'INVENTORY_COUNT_STALE' using errcode = '40001';
  end if;

  if exists (
    select 1
    from public.inventory_count_lines line
    join public.stock_items item
      on item.id = line.stock_item_id
     and item.organization_id = line.organization_id
    where line.inventory_count_id = p_inventory_count_id
      and line.organization_id = p_organization_id
      and line.counted_quantity > line.expected_quantity
      and (item.track_batch or item.track_expiration)
  ) then
    raise exception 'TRACKED_POSITIVE_ADJUSTMENT_REQUIRES_LOT' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.inventory_count_lines line
    where line.inventory_count_id = p_inventory_count_id
      and line.organization_id = p_organization_id
      and line.counted_quantity > line.expected_quantity
      and line.expected_quantity <= 0
      and line.adjustment_unit_cost is null
  ) then
    raise exception 'POSITIVE_ADJUSTMENT_COST_REQUIRED' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.inventory_count_lines line
    where line.inventory_count_id = p_inventory_count_id
      and line.organization_id = p_organization_id
      and line.counted_quantity > line.expected_quantity
  ) then
    v_positive_movement_id := gen_random_uuid();

    insert into public.stock_movements (
      id,
      organization_id,
      movement_type,
      occurred_at,
      destination_location_id,
      responsible_user_id,
      reference_type,
      reference_id,
      reason_code,
      notes,
      status
    ) values (
      v_positive_movement_id,
      p_organization_id,
      'inventory_adjustment',
      now(),
      v_stock_location_id,
      v_user_id,
      'inventory_count',
      p_inventory_count_id,
      'inventory_count_positive',
      'Ajuste positivo gerado por inventário físico',
      'confirmed'
    );
  end if;

  if exists (
    select 1
    from public.inventory_count_lines line
    where line.inventory_count_id = p_inventory_count_id
      and line.organization_id = p_organization_id
      and line.counted_quantity < line.expected_quantity
  ) then
    v_negative_movement_id := gen_random_uuid();

    insert into public.stock_movements (
      id,
      organization_id,
      movement_type,
      occurred_at,
      source_location_id,
      responsible_user_id,
      reference_type,
      reference_id,
      reason_code,
      notes,
      status
    ) values (
      v_negative_movement_id,
      p_organization_id,
      'inventory_adjustment',
      now(),
      v_stock_location_id,
      v_user_id,
      'inventory_count',
      p_inventory_count_id,
      'inventory_count_negative',
      'Ajuste negativo gerado por inventário físico',
      'confirmed'
    );
  end if;

  for v_line in
    select
      line.id,
      line.stock_item_id,
      line.expected_quantity,
      line.expected_average_cost,
      line.counted_quantity,
      line.adjustment_unit_cost,
      item.track_batch,
      item.track_expiration
    from public.inventory_count_lines line
    join public.stock_items item
      on item.id = line.stock_item_id
     and item.organization_id = line.organization_id
    where line.inventory_count_id = p_inventory_count_id
      and line.organization_id = p_organization_id
    order by line.stock_item_id
  loop
    v_difference := v_line.counted_quantity - v_line.expected_quantity;

    if v_difference = 0 then
      continue;
    end if;

    v_adjusted_line_count := v_adjusted_line_count + 1;

    if v_difference > 0 then
      v_adjustment_quantity := v_difference;
      v_incoming_cost := coalesce(
        v_line.adjustment_unit_cost,
        v_line.expected_average_cost
      );
      v_next_average_cost := private.replenishment_average_cost(
        v_line.expected_quantity,
        v_line.expected_average_cost,
        v_adjustment_quantity,
        v_incoming_cost
      );

      v_positive_movement_item_id := gen_random_uuid();
      insert into public.stock_movement_items (
        id,
        organization_id,
        movement_id,
        stock_item_id,
        quantity,
        unit_cost_snapshot
      ) values (
        v_positive_movement_item_id,
        p_organization_id,
        v_positive_movement_id,
        v_line.stock_item_id,
        v_adjustment_quantity,
        v_incoming_cost
      );

      update public.inventory_balances balance
      set quantity_on_hand = v_line.counted_quantity,
          average_cost = v_next_average_cost,
          updated_at = now()
      where balance.organization_id = p_organization_id
        and balance.stock_item_id = v_line.stock_item_id
        and balance.stock_location_id = v_stock_location_id;
    else
      v_adjustment_quantity := -v_difference;

      v_negative_movement_item_id := gen_random_uuid();
      insert into public.stock_movement_items (
        id,
        organization_id,
        movement_id,
        stock_item_id,
        quantity,
        unit_cost_snapshot
      ) values (
        v_negative_movement_item_id,
        p_organization_id,
        v_negative_movement_id,
        v_line.stock_item_id,
        v_adjustment_quantity,
        v_line.expected_average_cost
      );

      if v_line.track_batch or v_line.track_expiration then
        perform 1
        from public.inventory_batches batch
        where batch.organization_id = p_organization_id
          and batch.stock_item_id = v_line.stock_item_id
          and batch.stock_location_id = v_stock_location_id
          and batch.status = 'active'
          and batch.remaining_quantity > 0
        order by batch.id
        for update;

        if coalesce((
          select sum(batch.remaining_quantity)
          from public.inventory_batches batch
          where batch.organization_id = p_organization_id
            and batch.stock_item_id = v_line.stock_item_id
            and batch.stock_location_id = v_stock_location_id
            and batch.status = 'active'
            and batch.remaining_quantity > 0
        ), 0) < v_adjustment_quantity then
          raise exception 'INVENTORY_BATCH_STOCK_MISMATCH' using errcode = '22023';
        end if;

        v_remaining := v_adjustment_quantity;
        for v_batch in
          select batch.id,
                 batch.remaining_quantity
          from public.inventory_batches batch
          where batch.organization_id = p_organization_id
            and batch.stock_item_id = v_line.stock_item_id
            and batch.stock_location_id = v_stock_location_id
            and batch.status = 'active'
            and batch.remaining_quantity > 0
          order by
            batch.expiration_date asc nulls last,
            batch.received_at asc,
            batch.id asc
        loop
          exit when v_remaining = 0;
          v_take := least(v_batch.remaining_quantity, v_remaining);

          update public.inventory_batches batch
          set remaining_quantity = batch.remaining_quantity - v_take,
              status = case
                when batch.remaining_quantity - v_take = 0 then 'depleted'
                else batch.status
              end,
              updated_at = now()
          where batch.id = v_batch.id
            and batch.organization_id = p_organization_id;

          insert into public.stock_movement_batch_allocations (
            organization_id,
            movement_item_id,
            batch_id,
            quantity
          ) values (
            p_organization_id,
            v_negative_movement_item_id,
            v_batch.id,
            v_take
          );

          v_remaining := v_remaining - v_take;
        end loop;

        if v_remaining <> 0 then
          raise exception 'INVENTORY_BATCH_STOCK_MISMATCH' using errcode = '22023';
        end if;
      end if;

      update public.inventory_balances balance
      set quantity_on_hand = v_line.counted_quantity,
          average_cost = case
            when v_line.counted_quantity = 0 then 0
            else v_line.expected_average_cost
          end,
          updated_at = now()
      where balance.organization_id = p_organization_id
        and balance.stock_item_id = v_line.stock_item_id
        and balance.stock_location_id = v_stock_location_id;
    end if;
  end loop;

  update public.inventory_counts inventory_count
  set status = 'confirmed',
      confirmed_at = now(),
      updated_at = now()
  where inventory_count.id = p_inventory_count_id
    and inventory_count.organization_id = p_organization_id;

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
    'inventory_count.confirmed',
    'inventory_count',
    p_inventory_count_id,
    jsonb_build_object(
      'status', 'confirmed',
      'stock_location_id', v_stock_location_id,
      'adjusted_line_count', v_adjusted_line_count
    ),
    jsonb_build_object(
      'source', 'confirm_inventory_count_rpc',
      'command_id', p_command_id,
      'positive_movement_id', v_positive_movement_id,
      'negative_movement_id', v_negative_movement_id,
      'adjusted_line_count', v_adjusted_line_count
    )
  );

  return query
  select
    p_inventory_count_id,
    'confirmed'::text,
    v_positive_movement_id,
    v_negative_movement_id,
    v_adjusted_line_count;
end;
$$;

revoke all on function public.confirm_inventory_count(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.confirm_inventory_count(uuid, uuid, uuid)
  to authenticated;
