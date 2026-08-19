-- Issue #54: least-privilege hardening for the exposed public schema.
-- RLS remains the row-level boundary; object privileges are reduced to the
-- commands that have explicit authenticated policies.

-- Anonymous/Public access to application relations is deny-by-default.
revoke all privileges on all tables in schema public from public, anon;
revoke all privileges on all sequences in schema public from public, anon;

-- Remove provider/default grants and rebuild authenticated table access from
-- the policies that actually exist. Critical writes remain RPC-only when no
-- direct INSERT/UPDATE policy exists.
revoke all privileges on all tables in schema public from authenticated;
revoke all privileges on all sequences in schema public from authenticated;

do $$
declare
  policy_surface record;
begin
  for policy_surface in
    select
      tablename,
      bool_or(cmd in ('SELECT', 'ALL')) as allow_select,
      bool_or(cmd in ('INSERT', 'ALL')) as allow_insert,
      bool_or(cmd in ('UPDATE', 'ALL')) as allow_update
    from pg_policies
    where schemaname = 'public'
      and (
        'authenticated'::name = any(roles)
        or 'public'::name = any(roles)
      )
    group by tablename
  loop
    if policy_surface.allow_select then
      execute format('grant select on table public.%I to authenticated', policy_surface.tablename);
    end if;

    if policy_surface.allow_insert then
      execute format('grant insert on table public.%I to authenticated', policy_surface.tablename);
    end if;

    if policy_surface.allow_update then
      execute format('grant update on table public.%I to authenticated', policy_surface.tablename);
    end if;
  end loop;
end;
$$;

-- The only public view is intentionally exposed read-only and executes with
-- the caller privileges so underlying-table RLS still applies.
grant select on table public.payable_installment_summary to authenticated;

-- Trigger helpers are not public RPCs. Existing triggers do not require API
-- roles to call the trigger function directly.
revoke execute on function public.set_updated_at() from public, anon, authenticated, service_role;

-- App migrations are owned by postgres. New public objects must start closed
-- and receive explicit grants in the migration that exposes them.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all privileges on sequences from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all privileges on functions from public, anon, authenticated, service_role;
