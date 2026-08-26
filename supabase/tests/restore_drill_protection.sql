\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email)
values ('94000000-0000-4000-8000-000000000001', 'restore-drill@example.invalid');

insert into public.organizations (id, name, timezone, currency)
values (
  '94000000-0000-4000-8000-000000000100',
  'Restore Drill Organization',
  'America/Sao_Paulo',
  'BRL'
);

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  unit_id,
  active
) values (
  '94000000-0000-4000-8000-000000000100',
  '94000000-0000-4000-8000-000000000001',
  'viewer',
  null,
  true
);

set local role service_role;

select private.begin_protection_run(
  'ci:restore-drill:success:1',
  'restore_drill',
  'postgres',
  'cloudflare_r2',
  'isolated_supabase_postgres_restore'
);

-- Identical starts are idempotent.
select private.begin_protection_run(
  'ci:restore-drill:success:1',
  'restore_drill',
  'postgres',
  'cloudflare_r2',
  'isolated_supabase_postgres_restore'
);

select private.complete_protection_run(
  'ci:restore-drill:success:1',
  'succeeded',
  '2026-08-26T19:40:47Z',
  true,
  53185,
  null
);

-- Identical terminal replays are also idempotent.
select private.complete_protection_run(
  'ci:restore-drill:success:1',
  'succeeded',
  '2026-08-26T19:40:47Z',
  true,
  53185,
  null
);

select private.begin_protection_run(
  'ci:restore-drill:failure:1',
  'restore_drill',
  'postgres',
  'cloudflare_r2',
  'isolated_supabase_postgres_restore'
);

select private.complete_protection_run(
  'ci:restore-drill:failure:1',
  'failed',
  null,
  false,
  null,
  'Synthetic isolated restore failure.'
);

reset role;

do $$
declare
  success_run_id uuid;
begin
  select id into success_run_id
  from public.protection_runs
  where execution_reference = 'ci:restore-drill:success:1';

  if success_run_id is null then
    raise exception 'successful restore drill was not persisted';
  end if;

  if (
    select count(*)
    from public.protection_runs
    where execution_reference = 'ci:restore-drill:success:1'
      and protection_type = 'restore_drill'
      and coverage = 'postgres'
      and status = 'succeeded'
      and integrity_verified
      and valid_copy_at = '2026-08-26T19:40:47Z'::timestamptz
      and size_bytes = 53185
      and provider = 'cloudflare_r2'
      and destination = 'isolated_supabase_postgres_restore'
  ) <> 1 then
    raise exception 'successful restore drill evidence is inconsistent';
  end if;

  if not exists (
    select 1
    from public.protection_run_organizations
    where run_id = success_run_id
      and organization_id = '94000000-0000-4000-8000-000000000100'
  ) then
    raise exception 'restore drill did not map the covered Organization';
  end if;

  if (
    select count(*)
    from public.protection_runs
    where execution_reference = 'ci:restore-drill:failure:1'
      and protection_type = 'restore_drill'
      and status = 'failed'
      and error_summary = 'Synthetic isolated restore failure.'
  ) <> 1 then
    raise exception 'failed restore drill evidence is inconsistent';
  end if;
end;
$$;

-- Divergent terminal evidence must never rewrite an existing restore result.
do $$
begin
  set local role service_role;
  begin
    perform private.complete_protection_run(
      'ci:restore-drill:success:1',
      'succeeded',
      '2026-08-26T19:40:47Z',
      true,
      53186,
      null
    );
    raise exception 'divergent restore drill replay unexpectedly succeeded';
  exception when unique_violation then null;
  end;
  reset role;
end;
$$;

-- Common authenticated members can read covered restore evidence but cannot
-- execute the privileged mutation boundary.
set local role authenticated;
select set_config('request.jwt.claim.sub', '94000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
begin
  if (
    select count(*)
    from public.protection_runs
    where execution_reference = 'ci:restore-drill:success:1'
  ) <> 1 then
    raise exception 'covered member could not read restore drill evidence';
  end if;

  begin
    perform private.begin_protection_run(
      'ci:restore-drill:forged:1',
      'restore_drill',
      'postgres',
      'fake',
      'fake'
    );
    raise exception 'authenticated member unexpectedly started restore evidence';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;

select 'restore drill protection tests passed' as result;
