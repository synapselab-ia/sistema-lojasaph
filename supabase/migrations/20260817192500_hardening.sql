-- Historical supplier prices are append-only from the client perspective.
drop policy if exists supplier_prices_purchases_update on public.supplier_prices;
revoke update on public.supplier_prices from authenticated;

-- Helper functions are intentionally available only to authenticated users and
-- the database owner/service roles used by trusted server-side operations.
revoke execute on function public.set_updated_at() from public;

-- Fast lookup for scopes and active memberships.
create index if not exists organization_memberships_scope_idx
  on public.organization_memberships(organization_id, role, business_id, unit_id, sector_id)
  where active;

-- Batch quality/expiry queries.
create index if not exists inventory_batches_expiration_idx
  on public.inventory_batches(organization_id, expiration_date)
  where remaining_quantity > 0 and status = 'active';

-- Prevent multiple active supplier-item rows with no supplier SKU for the same pair.
create unique index if not exists supplier_items_default_pair_unique_idx
  on public.supplier_items(organization_id, supplier_id, stock_item_id)
  where supplier_sku is null and active;
