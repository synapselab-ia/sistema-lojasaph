-- Issue #80: keep membership self-visibility semantically unchanged while
-- allowing PostgreSQL to evaluate auth.uid() once per statement via initPlan.

alter policy memberships_visible_to_self_or_admin
  on public.organization_memberships
  using (
    user_id = (select auth.uid())
    or private.has_org_wide_role(
      organization_id,
      array['owner'::text, 'admin'::text]
    )
  );
