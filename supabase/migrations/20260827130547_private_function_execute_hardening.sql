-- Issue #123: remove historical PUBLIC EXECUTE from private SECURITY DEFINER helpers.
--
-- PostgreSQL grants EXECUTE on functions to PUBLIC by default. The global
-- default was already closed by 20260819141546_rls_grant_hardening.sql, but
-- helpers created before that migration retained their old ACLs. Keep the
-- private schema deny-by-default and make the RLS dependency explicit.

-- Remove inherited API-role execution from every existing private function.
-- Explicit grants to authenticated/service roles are preserved by REVOKE.
revoke execute on all functions in schema private from public, anon;

-- These helpers are referenced directly by public RLS policies. Policies run
-- in the caller context, so authenticated needs EXECUTE explicitly after the
-- historical PUBLIC grant is removed.
grant execute on function private.can_read_business(uuid, uuid) to authenticated;
grant execute on function private.can_read_cash_session(uuid, uuid) to authenticated;
grant execute on function private.can_read_inventory_count(uuid, uuid) to authenticated;
grant execute on function private.can_read_payable_document(uuid, uuid) to authenticated;
grant execute on function private.can_read_purchase_order(uuid, uuid) to authenticated;
grant execute on function private.can_read_sector(uuid, uuid) to authenticated;
grant execute on function private.can_read_stock_location(uuid, uuid) to authenticated;
grant execute on function private.can_read_stock_movement(uuid, uuid) to authenticated;
grant execute on function private.can_read_transfer(uuid, uuid) to authenticated;
grant execute on function private.can_read_unit(uuid, uuid) to authenticated;
grant execute on function private.has_business_role(uuid, uuid, text[]) to authenticated;
grant execute on function private.has_cash_register_role(uuid, uuid, text[]) to authenticated;
grant execute on function private.has_org_wide_role(uuid, text[]) to authenticated;
grant execute on function private.has_sector_role(uuid, uuid, text[]) to authenticated;
grant execute on function private.has_stock_location_role(uuid, uuid, text[]) to authenticated;
grant execute on function private.has_target_scope_role(uuid, uuid, uuid, text[]) to authenticated;
grant execute on function private.has_unit_role(uuid, uuid, text[]) to authenticated;

-- Helpers only called from other SECURITY DEFINER functions and the
-- validate_membership_scope_hierarchy trigger function intentionally remain
-- without API-role EXECUTE grants. Function defaults for role postgres are
-- already owner-only, so new private functions do not reintroduce PUBLIC ACLs.