-- Issue #132 / REQ-STK-011: cover composite FKs reported by the Production performance advisor.

create index stock_minimum_policies_item_org_fk_idx
  on public.stock_minimum_policies(stock_item_id, organization_id);

create index stock_minimum_policies_location_org_fk_idx
  on public.stock_minimum_policies(stock_location_id, organization_id);
