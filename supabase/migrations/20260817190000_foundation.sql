create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  timezone text not null default 'America/Sao_Paulo',
  currency text not null default 'BRL' check (length(currency) = 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  code text not null check (length(trim(code)) > 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table public.legal_entities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  legal_name text not null check (length(trim(legal_name)) > 0),
  trade_name text,
  tax_id text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, tax_id),
  unique (id, organization_id)
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  business_id uuid not null,
  legal_entity_id uuid,
  name text not null check (length(trim(name)) > 0),
  code text not null check (length(trim(code)) > 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  foreign key (business_id, organization_id)
    references public.businesses(id, organization_id) on delete restrict,
  foreign key (legal_entity_id, organization_id)
    references public.legal_entities(id, organization_id) on delete restrict
);

create table public.sectors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  unit_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  code text not null check (length(trim(code)) > 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, code),
  unique (id, organization_id),
  foreign key (unit_id, organization_id)
    references public.units(id, organization_id) on delete restrict
);

create table public.stock_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  unit_id uuid not null,
  sector_id uuid,
  name text not null check (length(trim(name)) > 0),
  code text not null check (length(trim(code)) > 0),
  location_type text not null default 'warehouse'
    check (location_type in ('warehouse', 'kitchen', 'kiosk', 'store_floor', 'temporary', 'external')),
  allow_negative_stock boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, code),
  unique (id, organization_id),
  foreign key (unit_id, organization_id)
    references public.units(id, organization_id) on delete restrict,
  foreign key (sector_id, organization_id)
    references public.sectors(id, organization_id) on delete restrict
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'manager', 'finance', 'purchases', 'inventory', 'cashier', 'viewer')),
  business_id uuid,
  unit_id uuid,
  sector_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id, role, business_id, unit_id, sector_id),
  foreign key (business_id, organization_id)
    references public.businesses(id, organization_id) on delete cascade,
  foreign key (unit_id, organization_id)
    references public.units(id, organization_id) on delete cascade,
  foreign key (sector_id, organization_id)
    references public.sectors(id, organization_id) on delete cascade
);

create index organization_memberships_user_idx
  on public.organization_memberships(user_id, organization_id)
  where active;

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.active
  );
$$;

create or replace function public.has_org_role(target_organization_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.active
      and membership.role = any(allowed_roles)
  );
$$;

create table public.item_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  code text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table public.units_of_measure (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null check (length(trim(code)) > 0),
  name text not null check (length(trim(name)) > 0),
  decimal_scale smallint not null default 3 check (decimal_scale between 0 and 6),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id)
);

create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  category_id uuid,
  base_unit_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  internal_code text,
  item_type text not null check (item_type in ('consumable', 'merchandise', 'reusable', 'supply')),
  ean text,
  ncm text,
  cest text,
  active boolean not null default true,
  track_expiration boolean not null default false,
  track_batch boolean not null default false,
  is_returnable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, internal_code),
  unique (organization_id, ean),
  unique (id, organization_id),
  foreign key (category_id, organization_id)
    references public.item_categories(id, organization_id) on delete restrict,
  foreign key (base_unit_id, organization_id)
    references public.units_of_measure(id, organization_id) on delete restrict
);

create index stock_items_name_idx on public.stock_items(organization_id, name);

create table public.item_aliases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stock_item_id uuid not null,
  alias text not null check (length(trim(alias)) > 0),
  source text,
  created_at timestamptz not null default now(),
  unique (organization_id, stock_item_id, alias),
  foreign key (stock_item_id, organization_id)
    references public.stock_items(id, organization_id) on delete cascade
);

create index item_aliases_alias_idx on public.item_aliases(organization_id, alias);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  legal_name text,
  trade_name text not null check (length(trim(trade_name)) > 0),
  tax_id text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, tax_id),
  unique (id, organization_id)
);

create table public.supplier_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  role_title text,
  phone text,
  email text,
  whatsapp text,
  is_primary boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (supplier_id, organization_id)
    references public.suppliers(id, organization_id) on delete cascade
);

create unique index supplier_contacts_one_primary_idx
  on public.supplier_contacts(supplier_id)
  where is_primary and active;

create table public.supplier_terms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  minimum_order_value numeric(18,2) check (minimum_order_value is null or minimum_order_value >= 0),
  payment_terms text,
  order_schedule text,
  delivery_schedule text,
  valid_from date not null default current_date,
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_to >= valid_from),
  foreign key (supplier_id, organization_id)
    references public.suppliers(id, organization_id) on delete cascade
);

create table public.supplier_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null,
  stock_item_id uuid not null,
  supplier_sku text,
  purchase_unit text,
  units_per_package numeric(18,3) check (units_per_package is null or units_per_package > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, supplier_id, stock_item_id, supplier_sku),
  unique (id, organization_id),
  foreign key (supplier_id, organization_id)
    references public.suppliers(id, organization_id) on delete cascade,
  foreign key (stock_item_id, organization_id)
    references public.stock_items(id, organization_id) on delete restrict
);

create table public.supplier_prices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_item_id uuid not null,
  unit_price numeric(18,2) not null check (unit_price >= 0),
  package_price numeric(18,2) check (package_price is null or package_price >= 0),
  observed_at timestamptz not null default now(),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  foreign key (supplier_item_id, organization_id)
    references public.supplier_items(id, organization_id) on delete cascade
);

create index supplier_prices_latest_idx
  on public.supplier_prices(supplier_item_id, observed_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  occurred_at timestamptz not null default now(),
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index audit_logs_entity_idx
  on public.audit_logs(organization_id, entity_type, entity_id, occurred_at desc);

create trigger organizations_updated_at before update on public.organizations
for each row execute function public.set_updated_at();
create trigger businesses_updated_at before update on public.businesses
for each row execute function public.set_updated_at();
create trigger legal_entities_updated_at before update on public.legal_entities
for each row execute function public.set_updated_at();
create trigger units_updated_at before update on public.units
for each row execute function public.set_updated_at();
create trigger sectors_updated_at before update on public.sectors
for each row execute function public.set_updated_at();
create trigger stock_locations_updated_at before update on public.stock_locations
for each row execute function public.set_updated_at();
create trigger organization_memberships_updated_at before update on public.organization_memberships
for each row execute function public.set_updated_at();
create trigger item_categories_updated_at before update on public.item_categories
for each row execute function public.set_updated_at();
create trigger units_of_measure_updated_at before update on public.units_of_measure
for each row execute function public.set_updated_at();
create trigger stock_items_updated_at before update on public.stock_items
for each row execute function public.set_updated_at();
create trigger suppliers_updated_at before update on public.suppliers
for each row execute function public.set_updated_at();
create trigger supplier_contacts_updated_at before update on public.supplier_contacts
for each row execute function public.set_updated_at();
create trigger supplier_terms_updated_at before update on public.supplier_terms
for each row execute function public.set_updated_at();
create trigger supplier_items_updated_at before update on public.supplier_items
for each row execute function public.set_updated_at();
