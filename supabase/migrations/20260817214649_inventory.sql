create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  movement_type text not null check (
    movement_type in (
      'opening_balance',
      'purchase_receipt',
      'entry',
      'sector_withdrawal',
      'withdrawal',
      'transfer_out',
      'transfer_in',
      'return_in',
      'return_out',
      'loan_out',
      'loan_return',
      'loss',
      'expiration',
      'inventory_adjustment_positive',
      'inventory_adjustment_negative',
      'manual_adjustment_positive',
      'manual_adjustment_negative'
    )
  ),
  occurred_at timestamptz not null default now(),
  source_location_id uuid,
  destination_location_id uuid,
  sector_id uuid,
  responsible_user_id uuid references auth.users(id) on delete set null,
  reason_code text,
  reference_type text,
  reference_id uuid,
  notes text,
  status text not null default 'confirmed' check (status in ('draft', 'confirmed', 'reversed', 'cancelled')),
  reversal_of_movement_id uuid,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (source_location_id, organization_id)
    references public.stock_locations(id, organization_id) on delete restrict,
  foreign key (destination_location_id, organization_id)
    references public.stock_locations(id, organization_id) on delete restrict,
  foreign key (sector_id, organization_id)
    references public.sectors(id, organization_id) on delete restrict,
  foreign key (reversal_of_movement_id, organization_id)
    references public.stock_movements(id, organization_id) on delete restrict,
  check (source_location_id is null or destination_location_id is null or source_location_id <> destination_location_id),
  check (reversal_of_movement_id is null or reversal_of_movement_id <> id)
);

create index stock_movements_org_occurred_idx
  on public.stock_movements(organization_id, occurred_at desc);
create index stock_movements_source_idx
  on public.stock_movements(source_location_id, occurred_at desc)
  where source_location_id is not null;
create index stock_movements_destination_idx
  on public.stock_movements(destination_location_id, occurred_at desc)
  where destination_location_id is not null;

create table public.stock_movement_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  movement_id uuid not null,
  stock_item_id uuid not null,
  quantity numeric(18,3) not null check (quantity > 0),
  unit_cost_snapshot numeric(18,2) not null check (unit_cost_snapshot >= 0),
  total_cost_snapshot numeric(18,2) generated always as (round(quantity * unit_cost_snapshot, 2)) stored,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (movement_id, organization_id)
    references public.stock_movements(id, organization_id) on delete restrict,
  foreign key (stock_item_id, organization_id)
    references public.stock_items(id, organization_id) on delete restrict
);

create index stock_movement_items_item_idx
  on public.stock_movement_items(organization_id, stock_item_id, movement_id);

create table public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  stock_item_id uuid not null,
  stock_location_id uuid not null,
  batch_code text,
  expiration_date date,
  received_at timestamptz not null default now(),
  original_quantity numeric(18,3) not null check (original_quantity > 0),
  remaining_quantity numeric(18,3) not null check (remaining_quantity >= 0),
  unit_cost numeric(18,2) not null check (unit_cost >= 0),
  source_type text not null check (source_type in ('opening_balance', 'entry', 'purchase_receipt', 'transfer', 'inventory_adjustment')),
  source_reference_id uuid,
  status text not null default 'active' check (status in ('active', 'depleted', 'blocked', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (stock_item_id, organization_id)
    references public.stock_items(id, organization_id) on delete restrict,
  foreign key (stock_location_id, organization_id)
    references public.stock_locations(id, organization_id) on delete restrict,
  check (remaining_quantity <= original_quantity)
);

create index inventory_batches_fefo_idx
  on public.inventory_batches(organization_id, stock_location_id, stock_item_id, expiration_date, received_at)
  where remaining_quantity > 0 and status = 'active';

create table public.stock_movement_batch_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  movement_item_id uuid not null,
  batch_id uuid not null,
  quantity numeric(18,3) not null check (quantity > 0),
  created_at timestamptz not null default now(),
  foreign key (movement_item_id, organization_id)
    references public.stock_movement_items(id, organization_id) on delete restrict,
  foreign key (batch_id, organization_id)
    references public.inventory_batches(id, organization_id) on delete restrict
);

create table public.inventory_balances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  stock_item_id uuid not null,
  stock_location_id uuid not null,
  quantity_on_hand numeric(18,3) not null default 0 check (quantity_on_hand >= 0),
  average_cost numeric(18,2) not null default 0 check (average_cost >= 0),
  rebuilt_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (organization_id, stock_item_id, stock_location_id),
  foreign key (stock_item_id, organization_id)
    references public.stock_items(id, organization_id) on delete restrict,
  foreign key (stock_location_id, organization_id)
    references public.stock_locations(id, organization_id) on delete restrict
);

create index inventory_balances_location_idx
  on public.inventory_balances(organization_id, stock_location_id, stock_item_id);

create table public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  source_location_id uuid not null,
  destination_location_id uuid not null,
  status text not null default 'draft'
    check (status in ('draft', 'requested', 'dispatched', 'partially_received', 'received', 'cancelled')),
  requested_at timestamptz not null default now(),
  dispatched_at timestamptz,
  received_at timestamptz,
  responsible_user_id uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (source_location_id, organization_id)
    references public.stock_locations(id, organization_id) on delete restrict,
  foreign key (destination_location_id, organization_id)
    references public.stock_locations(id, organization_id) on delete restrict,
  check (source_location_id <> destination_location_id),
  check (received_at is null or dispatched_at is not null),
  check (received_at is null or received_at >= dispatched_at)
);

create table public.stock_transfer_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  transfer_id uuid not null,
  stock_item_id uuid not null,
  requested_quantity numeric(18,3) not null check (requested_quantity > 0),
  dispatched_quantity numeric(18,3) not null default 0 check (dispatched_quantity >= 0),
  received_quantity numeric(18,3) not null default 0 check (received_quantity >= 0),
  unit_cost_snapshot numeric(18,2) not null default 0 check (unit_cost_snapshot >= 0),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (transfer_id, organization_id)
    references public.stock_transfers(id, organization_id) on delete restrict,
  foreign key (stock_item_id, organization_id)
    references public.stock_items(id, organization_id) on delete restrict,
  check (dispatched_quantity <= requested_quantity),
  check (received_quantity <= dispatched_quantity)
);

create table public.stock_transfer_batch_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  transfer_item_id uuid not null,
  source_batch_id uuid not null,
  destination_batch_id uuid,
  quantity numeric(18,3) not null check (quantity > 0),
  received_quantity numeric(18,3) not null default 0 check (received_quantity >= 0),
  batch_code_snapshot text,
  expiration_date_snapshot date,
  unit_cost_snapshot numeric(18,2) not null check (unit_cost_snapshot >= 0),
  created_at timestamptz not null default now(),
  foreign key (transfer_item_id, organization_id)
    references public.stock_transfer_items(id, organization_id) on delete restrict,
  foreign key (source_batch_id, organization_id)
    references public.inventory_batches(id, organization_id) on delete restrict,
  foreign key (destination_batch_id, organization_id)
    references public.inventory_batches(id, organization_id) on delete restrict,
  check (received_quantity <= quantity)
);

create table public.inventory_counts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  stock_location_id uuid not null,
  status text not null default 'counting' check (status in ('counting', 'review', 'confirmed', 'cancelled')),
  started_at timestamptz not null default now(),
  confirmed_at timestamptz,
  responsible_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (stock_location_id, organization_id)
    references public.stock_locations(id, organization_id) on delete restrict,
  check (confirmed_at is null or confirmed_at >= started_at)
);

create unique index inventory_counts_one_open_per_location_idx
  on public.inventory_counts(organization_id, stock_location_id)
  where status in ('counting', 'review');

create table public.inventory_count_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  inventory_count_id uuid not null,
  stock_item_id uuid not null,
  expected_quantity numeric(18,3) not null check (expected_quantity >= 0),
  counted_quantity numeric(18,3) check (counted_quantity is null or counted_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (inventory_count_id, stock_item_id),
  foreign key (inventory_count_id, organization_id)
    references public.inventory_counts(id, organization_id) on delete restrict,
  foreign key (stock_item_id, organization_id)
    references public.stock_items(id, organization_id) on delete restrict
);

create trigger inventory_batches_updated_at before update on public.inventory_batches
for each row execute function public.set_updated_at();
create trigger inventory_balances_updated_at before update on public.inventory_balances
for each row execute function public.set_updated_at();
create trigger stock_transfers_updated_at before update on public.stock_transfers
for each row execute function public.set_updated_at();
create trigger inventory_counts_updated_at before update on public.inventory_counts
for each row execute function public.set_updated_at();
create trigger inventory_count_lines_updated_at before update on public.inventory_count_lines
for each row execute function public.set_updated_at();
