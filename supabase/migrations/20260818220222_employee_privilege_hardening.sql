-- Hardening provider-specific default privileges and FK indexes after remote validation.

revoke all on public.employees from anon;
revoke delete, truncate, references, trigger on public.employees from authenticated;
grant select, insert, update on public.employees to authenticated;

create index employees_auth_user_fk_idx
  on public.employees(auth_user_id);

create index employees_default_unit_org_fk_idx
  on public.employees(default_unit_id, organization_id);

create index employees_default_sector_org_fk_idx
  on public.employees(default_sector_id, organization_id);
