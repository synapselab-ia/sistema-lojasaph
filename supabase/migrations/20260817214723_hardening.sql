-- Historical supplier prices are append-only from the client perspective.
drop policy if exists supplier_prices_purchases_update on public.supplier_prices;
revoke update on public.supplier_prices from authenticated;

-- Helper functions must not be callable by PUBLIC/anon. The membership helpers
-- are SECURITY DEFINER because they need to inspect membership rows while RLS is
-- evaluating another table; execution is restricted to authenticated/service roles.
revoke execute on function public.set_updated_at() from public;
revoke execute on function public.is_org_member(uuid) from public;
revoke execute on function public.has_org_role(uuid, text[]) from public;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;
grant execute on function public.has_org_role(uuid, text[]) to authenticated, service_role;

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
