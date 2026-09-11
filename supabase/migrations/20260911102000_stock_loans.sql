-- Fase 54 / Issue #183: empréstimos distintos de transferências, com
-- restituição física e/ou monetária e valor histórico formado pelas camadas
-- efetivamente emprestadas.

create table public.stock_loans (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  source_location_id uuid not null,
  stock_item_id uuid not null,
  loan_out_movement_id uuid not null,
  counterparty text not null check (length(trim(counterparty)) between 1 and 200),
  original_quantity numeric(18,3) not null check (original_quantity > 0),
  original_value numeric(18,2) not null check (original_value >= 0),
  physical_returned_quantity numeric(18,3) not null default 0 check (physical_returned_quantity >= 0),
  physical_returned_value numeric(18,2) not null default 0 check (physical_returned_value >= 0),
  monetary_settled_amount numeric(18,2) not null default 0 check (monetary_settled_amount >= 0),
  remaining_physical_quantity numeric(18,3)
    generated always as (original_quantity - physical_returned_quantity) stored,
  remaining_value numeric(18,2)
    generated always as (original_value - physical_returned_value - monetary_settled_amount) stored,
  preferred_batch_id uuid,
  status text not null default 'open' check (status in ('open', 'partial', 'settled')),
  loaned_at timestamptz not null default now(),
  settled_at timestamptz,
  responsible_user_id uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (loan_out_movement_id, organization_id),
  foreign key (source_location_id, organization_id)
    references public.stock_locations(id, organization_id) on delete restrict,
  foreign key (stock_item_id, organization_id)
    references public.stock_items(id, organization_id) on delete restrict,
  foreign key (loan_out_movement_id, organization_id)
    references public.stock_movements(id, organization_id) on delete restrict,
  foreign key (preferred_batch_id, organization_id)
    references public.inventory_batches(id, organization_id) on delete restrict,
  check (physical_returned_quantity <= original_quantity),
  check (physical_returned_value + monetary_settled_amount <= original_value),
  check (
    (status = 'settled' and settled_at is not null)
    or (status <> 'settled' and settled_at is null)
  )
);

create index stock_loans_org_status_idx
  on public.stock_loans(organization_id, status, loaned_at desc);
create index stock_loans_source_idx
  on public.stock_loans(organization_id, source_location_id, loaned_at desc);

create table public.stock_loan_restitutions (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  stock_loan_id uuid not null,
  physical_quantity numeric(18,3) not null default 0 check (physical_quantity >= 0),
  physical_value numeric(18,2) not null default 0 check (physical_value >= 0),
  monetary_amount numeric(18,2) not null default 0 check (monetary_amount >= 0),
  physical_movement_id uuid,
  remaining_physical_quantity_after numeric(18,3) not null check (remaining_physical_quantity_after >= 0),
  remaining_value_after numeric(18,2) not null check (remaining_value_after >= 0),
  occurred_at timestamptz not null default now(),
  responsible_user_id uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (stock_loan_id, organization_id)
    references public.stock_loans(id, organization_id) on delete restrict,
  foreign key (physical_movement_id, organization_id)
    references public.stock_movements(id, organization_id) on delete restrict,
  check (physical_quantity > 0 or monetary_amount > 0),
  check (
    (physical_quantity = 0 and physical_value = 0 and physical_movement_id is null)
    or (physical_quantity > 0 and physical_movement_id is not null)
  )
);

create index stock_loan_restitutions_loan_idx
  on public.stock_loan_restitutions(organization_id, stock_loan_id, occurred_at, id);

create trigger stock_loans_updated_at
before update on public.stock_loans
for each row execute function public.set_updated_at();

alter table public.stock_loans enable row level security;
alter table public.stock_loan_restitutions enable row level security;

revoke all on public.stock_loans, public.stock_loan_restitutions from public, anon, authenticated;
grant select on public.stock_loans, public.stock_loan_restitutions to authenticated;

create policy stock_loans_scope_select
on public.stock_loans for select to authenticated
using (private.can_read_stock_location(organization_id, source_location_id));

create policy stock_loan_restitutions_scope_select
on public.stock_loan_restitutions for select to authenticated
using (
  exists (
    select 1
    from public.stock_loans loan
    where loan.id = stock_loan_restitutions.stock_loan_id
      and loan.organization_id = stock_loan_restitutions.organization_id
      and private.can_read_stock_location(loan.organization_id, loan.source_location_id)
  )
);

-- Extend the existing transaction-safe stock-outflow primitive with loan_out.
-- All existing withdrawal/loss semantics remain unchanged; #187 triggers continue
-- making layer allocations authoritative for cost snapshots.
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

  if p_movement_type not in ('withdrawal', 'loss', 'expiration', 'loan_out') then
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
    organization_id, actor_user_id, action, entity_type, entity_id, after_data, metadata
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
    jsonb_build_object('source', p_audit_source, 'allow_negative_stock', v_allow_negative)
  );

  return query
  select p_command_id,
         v_next_quantity,
         case when v_next_quantity = 0 then 0::numeric else v_current_cost end;
end;
$$;

revoke all on function private.record_stock_outflow(uuid,uuid,uuid,uuid,numeric,uuid,text,text,text,text,text)
  from public, anon, authenticated;

create or replace function private.record_stock_loan(
  p_command_id uuid,
  p_organization_id uuid,
  p_stock_item_id uuid,
  p_source_location_id uuid,
  p_counterparty text,
  p_quantity numeric,
  p_preferred_batch_id uuid default null,
  p_notes text default null
)
returns table (
  loan_id uuid,
  stock_item_id uuid,
  source_location_id uuid,
  original_quantity numeric,
  original_value numeric,
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
  v_counterparty text := nullif(trim(p_counterparty), '');
  v_notes text := nullif(trim(p_notes), '');
  v_existing public.stock_loans%rowtype;
  v_balance_quantity numeric(18,3);
  v_balance_cost numeric(18,2);
  v_movement_item_id uuid;
  v_allocated_quantity numeric(18,3);
  v_original_value numeric(18,2);
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if v_counterparty is null or length(v_counterparty) > 200 then
    raise exception 'STOCK_LOAN_COUNTERPARTY_REQUIRED' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity <= 0 or scale(p_quantity) > 3 then
    raise exception 'INVALID_STOCK_QUANTITY' using errcode = '22023';
  end if;
  if not private.has_stock_location_role(
    p_organization_id,
    p_source_location_id,
    array['owner', 'admin', 'manager', 'inventory']
  ) then
    raise exception 'INSUFFICIENT_SCOPE' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('stock-loan-command:' || p_command_id::text, 0)
  );

  select * into v_existing
  from public.stock_loans loan
  where loan.id = p_command_id;

  if found then
    if v_existing.organization_id <> p_organization_id
      or v_existing.stock_item_id <> p_stock_item_id
      or v_existing.source_location_id <> p_source_location_id
      or v_existing.counterparty <> v_counterparty
      or v_existing.original_quantity <> p_quantity
      or v_existing.preferred_batch_id is distinct from p_preferred_batch_id
      or v_existing.notes is distinct from v_notes
    then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;

    return query
    select loan.id,
           loan.stock_item_id,
           loan.source_location_id,
           loan.original_quantity,
           loan.original_value,
           loan.remaining_physical_quantity,
           loan.remaining_value,
           loan.status,
           balance.quantity_on_hand,
           balance.average_cost
    from public.stock_loans loan
    join public.inventory_balances balance
      on balance.organization_id = loan.organization_id
     and balance.stock_item_id = loan.stock_item_id
     and balance.stock_location_id = loan.source_location_id
    where loan.id = p_command_id
      and loan.organization_id = p_organization_id;
    return;
  end if;

  if exists (select 1 from public.stock_movements movement where movement.id = p_command_id) then
    raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
  end if;

  select outflow.quantity_on_hand, outflow.average_cost
    into v_balance_quantity, v_balance_cost
  from private.record_stock_outflow(
    p_command_id,
    p_organization_id,
    p_stock_item_id,
    p_source_location_id,
    p_quantity,
    p_preferred_batch_id,
    v_notes,
    'loan_out',
    'stock_loan',
    'stock_loan.outflow_recorded',
    'record_stock_loan_rpc'
  ) outflow;

  select item.id into v_movement_item_id
  from public.stock_movement_items item
  where item.organization_id = p_organization_id
    and item.movement_id = p_command_id
    and item.stock_item_id = p_stock_item_id;

  if not found then
    raise exception 'STOCK_LOAN_COST_LINEAGE_INCOMPLETE' using errcode = '23514';
  end if;

  select coalesce(sum(allocation.quantity), 0)::numeric(18,3),
         coalesce(sum(allocation.total_cost_snapshot), 0)::numeric(18,2)
    into v_allocated_quantity, v_original_value
  from public.stock_movement_batch_allocations allocation
  where allocation.organization_id = p_organization_id
    and allocation.movement_item_id = v_movement_item_id;

  if v_allocated_quantity <> p_quantity then
    raise exception 'STOCK_LOAN_COST_LINEAGE_INCOMPLETE' using errcode = '23514';
  end if;

  update public.stock_movements movement
  set reference_type = 'stock_loan', reference_id = p_command_id
  where movement.id = p_command_id
    and movement.organization_id = p_organization_id;

  insert into public.stock_loans(
    id, organization_id, source_location_id, stock_item_id, loan_out_movement_id,
    counterparty, original_quantity, original_value, preferred_batch_id,
    status, loaned_at, responsible_user_id, notes
  ) values (
    p_command_id, p_organization_id, p_source_location_id, p_stock_item_id, p_command_id,
    v_counterparty, p_quantity, v_original_value, p_preferred_batch_id,
    'open', now(), v_user_id, v_notes
  );

  insert into public.audit_logs(
    organization_id, actor_user_id, action, entity_type, entity_id, after_data, metadata
  ) values (
    p_organization_id,
    v_user_id,
    'stock_loan.created',
    'stock_loan',
    p_command_id,
    jsonb_build_object(
      'stock_item_id', p_stock_item_id,
      'source_location_id', p_source_location_id,
      'counterparty', v_counterparty,
      'original_quantity', p_quantity,
      'original_value', v_original_value,
      'remaining_physical_quantity', p_quantity,
      'remaining_value', v_original_value,
      'preferred_batch_id', p_preferred_batch_id,
      'status', 'open'
    ),
    jsonb_build_object(
      'source', 'record_stock_loan_rpc',
      'loan_out_movement_id', p_command_id,
      'valuation', 'physical_layer_allocations'
    )
  );

  return query
  select p_command_id,
         p_stock_item_id,
         p_source_location_id,
         p_quantity::numeric,
         v_original_value::numeric,
         p_quantity::numeric,
         v_original_value::numeric,
         'open'::text,
         v_balance_quantity::numeric,
         v_balance_cost::numeric;
end;
$$;

revoke all on function private.record_stock_loan(uuid,uuid,uuid,uuid,text,numeric,uuid,text)
  from public, anon, authenticated;

create or replace function public.record_stock_loan(
  p_command_id uuid,
  p_organization_id uuid,
  p_stock_item_id uuid,
  p_source_location_id uuid,
  p_counterparty text,
  p_quantity numeric,
  p_preferred_batch_id uuid default null,
  p_notes text default null
)
returns table (
  loan_id uuid,
  stock_item_id uuid,
  source_location_id uuid,
  original_quantity numeric,
  original_value numeric,
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
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if not private.has_stock_location_role(
    p_organization_id,
    p_source_location_id,
    array['owner', 'admin', 'manager', 'inventory']
  ) then
    raise exception 'INSUFFICIENT_SCOPE' using errcode = '42501';
  end if;

  return query
  select * from private.record_stock_loan(
    p_command_id, p_organization_id, p_stock_item_id, p_source_location_id,
    p_counterparty, p_quantity, p_preferred_batch_id, p_notes
  );
end;
$$;

revoke all on function public.record_stock_loan(uuid,uuid,uuid,uuid,text,numeric,uuid,text)
  from public, anon, authenticated;
grant execute on function public.record_stock_loan(uuid,uuid,uuid,uuid,text,numeric,uuid,text)
  to authenticated;

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
  ), 0) <> v_loan.original_quantity then
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
             allocation.created_at,
             allocation.id
      from public.stock_movement_batch_allocations allocation
      where allocation.organization_id = p_organization_id
        and allocation.movement_item_id = v_original_movement_item_id
      order by allocation.created_at, allocation.id
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

create or replace function public.record_stock_loan_restitution(
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
  v_source_location_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select loan.source_location_id into v_source_location_id
  from public.stock_loans loan
  where loan.id = p_stock_loan_id
    and loan.organization_id = p_organization_id;

  if not found then
    raise exception 'STOCK_LOAN_NOT_AVAILABLE' using errcode = '23503';
  end if;

  if not private.has_stock_location_role(
    p_organization_id,
    v_source_location_id,
    array['owner', 'admin', 'manager', 'inventory']
  ) then
    raise exception 'INSUFFICIENT_SCOPE' using errcode = '42501';
  end if;

  return query
  select * from private.record_stock_loan_restitution(
    p_command_id, p_organization_id, p_stock_loan_id,
    p_physical_quantity, p_monetary_amount, p_notes
  );
end;
$$;

revoke all on function public.record_stock_loan_restitution(uuid,uuid,uuid,numeric,numeric,text)
  from public, anon, authenticated;
grant execute on function public.record_stock_loan_restitution(uuid,uuid,uuid,numeric,numeric,text)
  to authenticated;
