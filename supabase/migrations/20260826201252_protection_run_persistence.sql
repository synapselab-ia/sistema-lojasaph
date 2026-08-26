-- Issue #75 / REQ-PLAT-005: authoritative, sanitized protection-run persistence.
-- Recovery artifacts remain off-site; this schema stores only operational evidence.

create table public.protection_runs (
  id uuid primary key default gen_random_uuid(),
  protection_type text not null
    check (protection_type in (
      'automatic_database',
      'automatic_storage',
      'manual_export',
      'restore_drill'
    )),
  status text not null
    check (status in ('running', 'succeeded', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  valid_copy_at timestamptz,
  integrity_verified boolean not null default false,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  provider text
    check (
      provider is null
      or (
        provider = btrim(provider)
        and length(provider) between 1 and 64
        and provider !~ '[[:cntrl:]]'
      )
    ),
  destination text
    check (
      destination is null
      or (
        destination = btrim(destination)
        and length(destination) between 1 and 128
        and destination !~ '[[:cntrl:]]'
      )
    ),
  coverage text not null
    check (coverage in ('postgres', 'storage', 'organization_export')),
  execution_reference text not null unique
    check (
      execution_reference = btrim(execution_reference)
      and length(execution_reference) between 1 and 200
      and execution_reference !~ '[[:cntrl:]]'
    ),
  error_summary text
    check (
      error_summary is null
      or (
        error_summary = btrim(error_summary)
        and length(error_summary) between 1 and 500
        and error_summary !~ '[[:cntrl:]]'
      )
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'running' and finished_at is null)
    or (status <> 'running' and finished_at is not null)
  ),
  check (finished_at is null or finished_at >= started_at),
  check (
    status <> 'running'
    or (
      valid_copy_at is null
      and not integrity_verified
      and size_bytes is null
      and error_summary is null
    )
  ),
  check (
    status <> 'succeeded'
    or (
      valid_copy_at is not null
      and integrity_verified
      and size_bytes is not null
      and error_summary is null
    )
  ),
  check (status <> 'failed' or error_summary is not null)
);

create index protection_runs_recent_idx
  on public.protection_runs(protection_type, status, started_at desc);

create table public.protection_run_organizations (
  run_id uuid not null references public.protection_runs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (run_id, organization_id)
);

create index protection_run_organizations_org_idx
  on public.protection_run_organizations(organization_id, run_id);

create trigger protection_runs_set_updated_at
before update on public.protection_runs
for each row execute function public.set_updated_at();

alter table public.protection_runs enable row level security;
alter table public.protection_run_organizations enable row level security;

-- Tables are read-only to API roles. Mutations are performed through the
-- privileged server-side command functions defined below.
revoke all on public.protection_runs
  from public, anon, authenticated, service_role;
revoke all on public.protection_run_organizations
  from public, anon, authenticated, service_role;
grant select on public.protection_runs
  to authenticated, service_role;
grant select on public.protection_run_organizations
  to authenticated, service_role;

create or replace function private.can_read_protection_run(target_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.protection_run_organizations coverage
    join public.organization_memberships membership
      on membership.organization_id = coverage.organization_id
    where coverage.run_id = target_run_id
      and membership.user_id = auth.uid()
      and membership.active
  );
$$;

revoke all on function private.can_read_protection_run(uuid)
  from public, anon;
grant execute on function private.can_read_protection_run(uuid)
  to authenticated, service_role;

create policy protection_runs_member_select
  on public.protection_runs
  for select
  to authenticated
  using (private.can_read_protection_run(id));

create policy protection_run_organizations_member_select
  on public.protection_run_organizations
  for select
  to authenticated
  using (private.is_org_member(organization_id));

create or replace function private.begin_protection_run(
  p_execution_reference text,
  p_protection_type text,
  p_coverage text,
  p_provider text,
  p_destination text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_execution_reference text := btrim(p_execution_reference);
  v_provider text := nullif(btrim(p_provider), '');
  v_destination text := nullif(btrim(p_destination), '');
  v_existing public.protection_runs%rowtype;
  v_run_id uuid;
begin
  if v_execution_reference is null
     or length(v_execution_reference) = 0
     or length(v_execution_reference) > 200
     or v_execution_reference ~ '[[:cntrl:]]' then
    raise exception 'INVALID_PROTECTION_EXECUTION_REFERENCE' using errcode = '22023';
  end if;

  if p_protection_type is null
     or p_protection_type not in (
       'automatic_database',
       'automatic_storage',
       'manual_export',
       'restore_drill'
     ) then
    raise exception 'INVALID_PROTECTION_TYPE' using errcode = '22023';
  end if;

  if p_coverage is null
     or p_coverage not in ('postgres', 'storage', 'organization_export') then
    raise exception 'INVALID_PROTECTION_COVERAGE' using errcode = '22023';
  end if;

  if v_provider is null
     or length(v_provider) > 64
     or v_provider ~ '[[:cntrl:]]' then
    raise exception 'INVALID_PROTECTION_PROVIDER' using errcode = '22023';
  end if;

  if v_destination is null
     or length(v_destination) > 128
     or v_destination ~ '[[:cntrl:]]' then
    raise exception 'INVALID_PROTECTION_DESTINATION' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_execution_reference, 0)
  );

  select *
  into v_existing
  from public.protection_runs run
  where run.execution_reference = v_execution_reference;

  if found then
    if v_existing.protection_type <> p_protection_type
       or v_existing.coverage <> p_coverage
       or v_existing.provider is distinct from v_provider
       or v_existing.destination is distinct from v_destination then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;

    return v_existing.id;
  end if;

  insert into public.protection_runs (
    protection_type,
    status,
    integrity_verified,
    provider,
    destination,
    coverage,
    execution_reference
  ) values (
    p_protection_type,
    'running',
    false,
    v_provider,
    v_destination,
    p_coverage,
    v_execution_reference
  )
  returning id into v_run_id;

  -- Database/storage protection runs are global by environment. Persist the
  -- Organizations present when the run begins rather than duplicating backups.
  insert into public.protection_run_organizations (run_id, organization_id)
  select v_run_id, organization.id
  from public.organizations organization
  on conflict do nothing;

  return v_run_id;
end;
$$;

create or replace function private.complete_protection_run(
  p_execution_reference text,
  p_status text,
  p_valid_copy_at timestamptz,
  p_integrity_verified boolean,
  p_size_bytes bigint,
  p_error_summary text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_execution_reference text := btrim(p_execution_reference);
  v_error_summary text := nullif(btrim(p_error_summary), '');
  v_existing public.protection_runs%rowtype;
  v_finished_at timestamptz := clock_timestamp();
begin
  if v_execution_reference is null
     or length(v_execution_reference) = 0
     or length(v_execution_reference) > 200
     or v_execution_reference ~ '[[:cntrl:]]' then
    raise exception 'INVALID_PROTECTION_EXECUTION_REFERENCE' using errcode = '22023';
  end if;

  if p_status is null or p_status not in ('succeeded', 'failed') then
    raise exception 'INVALID_PROTECTION_FINAL_STATUS' using errcode = '22023';
  end if;

  if p_size_bytes is not null and p_size_bytes < 0 then
    raise exception 'INVALID_PROTECTION_SIZE' using errcode = '22023';
  end if;

  if v_error_summary is not null
     and (length(v_error_summary) > 500 or v_error_summary ~ '[[:cntrl:]]') then
    raise exception 'INVALID_PROTECTION_ERROR_SUMMARY' using errcode = '22023';
  end if;

  if p_status = 'succeeded' then
    if p_valid_copy_at is null
       or p_integrity_verified is distinct from true
       or p_size_bytes is null
       or v_error_summary is not null then
      raise exception 'INVALID_SUCCESSFUL_PROTECTION_RUN' using errcode = '22023';
    end if;
  else
    if v_error_summary is null then
      raise exception 'FAILED_PROTECTION_RUN_REQUIRES_ERROR_SUMMARY' using errcode = '22023';
    end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_execution_reference, 0)
  );

  select *
  into v_existing
  from public.protection_runs run
  where run.execution_reference = v_execution_reference
  for update;

  if not found then
    raise exception 'PROTECTION_RUN_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_existing.status <> 'running' then
    if v_existing.status <> p_status
       or v_existing.valid_copy_at is distinct from p_valid_copy_at
       or v_existing.integrity_verified is distinct from p_integrity_verified
       or v_existing.size_bytes is distinct from p_size_bytes
       or v_existing.error_summary is distinct from v_error_summary then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;

    return v_existing.id;
  end if;

  update public.protection_runs
  set status = p_status,
      finished_at = v_finished_at,
      valid_copy_at = p_valid_copy_at,
      integrity_verified = p_integrity_verified,
      size_bytes = p_size_bytes,
      error_summary = v_error_summary
  where id = v_existing.id;

  return v_existing.id;
end;
$$;

revoke all on function private.begin_protection_run(text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function private.complete_protection_run(text, text, timestamptz, boolean, bigint, text)
  from public, anon, authenticated;
grant execute on function private.begin_protection_run(text, text, text, text, text)
  to service_role;
grant execute on function private.complete_protection_run(text, text, timestamptz, boolean, bigint, text)
  to service_role;
