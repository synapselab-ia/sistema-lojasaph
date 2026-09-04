-- Issue #187: average_cost remains an auxiliary analytical cache.
-- Layer allocations are authoritative for economic costing, but output events do not
-- revalue this cache merely because a physical layer was consumed. This preserves the
-- existing weighted-average analytical semantics while removing it from output pricing.

drop trigger if exists inventory_balances_layer_cost_guard on public.inventory_balances;
drop trigger if exists inventory_batches_refresh_balance_cost on public.inventory_batches;
