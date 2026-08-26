\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email)
values
  ('93000000-0000-4000-8000-000000000001', 'protection-org-a@example.invalid'),
  ('93000000-0000-4000-8000-000000000002', 'protection-org-b@example.invalid'),
  ('93000000-0000-4000-8000-000000000003', 'protection-outsider@example.invalid');

insert into public.organizations (id, name, timezone, currency)
values
  ('93000000-0000-4000-8000-000000000100', 'Protection Org A', 'America/Sao_Paulo', 'BRL'),
  ('93000000-0000-4000-8000-000000000200', 'Protection Org B', 'America/Sao_Paulo', 'BRL');

insert into public.businesses (id, organization_id, name, code)
values (
  '93000000-0000-4000-8000-000000000110',
  '93000000-0000-4000-8000-000000000100',
  'Protection Business A',
  'protection-a'
);

insert into public.units (id, organization_id, business_id, name, code)
values (
  '93000000-0000-4000-8000-000000000120',
  '93000000-0000-4000-8000-000000000100',
  '93000000-0000-4000-8000-000000000110',
  'Protection Unit A',
  'protection-a-unit'
);

insert into public.organization_memberships (
  organization_id,
  user_id,
  role,
  unit_id,
  active
) values
  (
    '93000000-0000-4000-8000-000000000100',
    '93000000-0000-4000-8000-000000000001',
    'viewer',
    '93000000-0000-4000-8000-000000000120',
    true
  ),
  (
    '93000000-0000-4000-8000-000000000200',
    '93000000-0000-4000-8000-000000000002',
    'viewer',
    null,
    true
  );

-- The server-side boundary is executable by service_role, while direct table
-- mutation remains closed even to service_role.
set local role service_role;

select private.begin_protection_run(
  'ci:protection:success:1',
  'automatic_database',
  'postgres',
  'cloudflare_r2',
  's3_compatible_offsite'
);

-- Start is idempotent for an identical execution reference/payload.
select private.begin_protection_run(
  'ci:protection:success:1',
  'automatic_database',
  'postgres',
  'cloudflare_r2',
  's3_compatible_offsite'
);

select private.complete_protection_run(
  'ci:protection:success:1',
  'succeeded',
  '2026-08-26T20:00:00Z',
  true,
  53185,
  null
);

-- Finalization is also idempotent for an identical terminal payload.
select private.complete_protection_run(
  'ci:protection:success:1',
  'succeeded',
  '2026-08-26T20:00:00Z',
  true,
  53185,
  null
);

select private.begin_protection_run(
  'ci:protection:failure:1',
  'automatic_database',
  'postgres',
  'cloudflare_r2',
  's3_compatible_offsite'
);

select private.complete_protection_run(
  'ci:protection:failure:1',
  'failed',
  null,
  false,
  null,
  'Synthetic CI failure without secret material.'
);

reset role;

-- Global automatic runs cover Organizations by relation rather than duplicated
-- physical backups.
do $$
declare
  v_run_id uuid;
begin
  select id into v_run_id
  from public.protection_runs
  where execution_reference = 'ci:protection:success:1';

  if v_run_id is null then
    raise exception 'successful protection run was not persisted';
  end if;

  if (select count(*) from public.protection_runs where execution_reference = 'ci:protection:success:1') <> 1 then
    raise exception 'idempotent start duplicated protection run';
  end if;

  if not exists (
    select 1
    from public.protection_run_organizations
    where run_id = v_run_id
      and organization_id = '93000000-0000-4000-8000-000000000100'
  ) then
    raise exception 'global run did not cover Organization A';
  end if;

  if not exists (
    select 1
    from public.protection_run_organizations
    where run_id = v_run_id
      and organization_id = '93000000-0000-4000-8000-000000000200'
  ) then
    raise exception 'global run did not cover Organization B';
  end if;
end;
$$;

-- A changed terminal replay must conflict rather than silently rewriting history.
do $$
begin
  set local role service_role;
  begin
    perform private.complete_protection_run(
      'ci:protection:success:1',
      'succeeded',
      '2026-08-26T20:00:00Z',
      true,
      53186,
      null
    );
    raise exception 'changed protection completion replay unexpectedly succeeded';
  exception when unique_violation then null;
  end;
  reset role;
end;
$$;

-- Create a synthetic Organization-specific run only to prove the RLS boundary
-- for future manual exports. Production automatic_database uses the global
-- begin_protection_run command above.
insert into public.protection_runs (
  id,
  protection_type,
  status,
  started_at,
  finished_at,
  valid_copy_at,
  integrity_verified,
  size_bytes,
  provider,
  destination,
  coverage,
  execution_reference
) values (
  '93000000-0000-4000-8000-000000000900',
  'manual_export',
  'succeeded',
  '2026-08-26T20:00:00Z',
  '2026-08-26T20:01:00Z',
  '2026-08-26T20:00:30Z',
  true,
  1024,
  'lojasaph',
  'organization_export',
  'organization_export',
  'ci:protection:org-a-only:1'
);

insert into public.protection_run_organizations (run_id, organization_id)
values (
  '93000000-0000-4000-8000-000000000900',
  '93000000-0000-4000-8000-000000000100'
);

-- Organization A member is scoped to a Unit but may read Organization-level
-- protection state. Only Organization A mapping rows are visible.
set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  v_global_run_id uuid;
begin
  if (select count(*) from public.protection_runs where execution_reference = 'ci:protection:success:1') <> 1 then
    raise exception 'Organization A member could not read covered global run';
  end if;

  if (select count(*) from public.protection_runs where execution_reference = 'ci:protection:org-a-only:1') <> 1 then
    raise exception 'Organization A member could not read Organization-specific run';
  end if;

  select id into v_global_run_id
  from public.protection_runs
  where execution_reference = 'ci:protection:success:1';

  if (
    select count(*)
    from public.protection_run_organizations
    where run_id = v_global_run_id
  ) <> 1 then
    raise exception 'Organization A member saw foreign Organization coverage rows';
  end if;
end;
$$;

-- Common authenticated users cannot forge or rewrite protection evidence.
do $$
begin
  begin
    insert into public.protection_runs (
      protection_type,
      status,
      provider,
      destination,
      coverage,
      execution_reference
    ) values (
      'automatic_database',
      'running',
      'fake',
      'fake',
      'postgres',
      'ci:forged:insert'
    );
    raise exception 'authenticated user unexpectedly inserted protection run';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.protection_runs
    set status = 'failed',
        finished_at = now(),
        error_summary = 'forged'
    where execution_reference = 'ci:protection:success:1';
    raise exception 'authenticated user unexpectedly updated protection run';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.protection_runs
    where execution_reference = 'ci:protection:success:1';
    raise exception 'authenticated user unexpectedly deleted protection run';
  exception when insufficient_privilege then null;
  end;

  begin
    perform private.begin_protection_run(
      'ci:forged:rpc',
      'automatic_database',
      'postgres',
      'fake',
      'fake'
    );
    raise exception 'authenticated user unexpectedly executed privileged protection command';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Organization B can read the same genuinely global run because it covers B,
-- but cannot read Organization A-only evidence or Organization A mappings.
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000002', true);

do $$
declare
  v_global_run_id uuid;
begin
  if (select count(*) from public.protection_runs where execution_reference = 'ci:protection:success:1') <> 1 then
    raise exception 'Organization B member could not read covered global run';
  end if;

  if (select count(*) from public.protection_runs where execution_reference = 'ci:protection:org-a-only:1') <> 0 then
    raise exception 'Organization B member read Organization A-only protection run';
  end if;

  select id into v_global_run_id
  from public.protection_runs
  where execution_reference = 'ci:protection:success:1';

  if (
    select count(*)
    from public.protection_run_organizations
    where run_id = v_global_run_id
  ) <> 1 then
    raise exception 'Organization B member saw foreign Organization coverage rows';
  end if;
end;
$$;

-- An authenticated outsider sees no protection state.
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000003', true);

do $$
begin
  if (select count(*) from public.protection_runs) <> 0 then
    raise exception 'outsider unexpectedly read protection runs';
  end if;

  if (select count(*) from public.protection_run_organizations) <> 0 then
    raise exception 'outsider unexpectedly read protection coverage';
  end if;
end;
$$;

reset role;

-- Grant surface: service_role may use the command functions but cannot mutate
-- the tables directly; authenticated/anon cannot execute the commands.
do $$
begin
  if not has_function_privilege(
    'service_role',
    'private.begin_protection_run(text,text,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'service_role lost begin_protection_run execute privilege';
  end if;

  if has_function_privilege(
    'authenticated',
    'private.begin_protection_run(text,text,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated unexpectedly has begin_protection_run execute privilege';
  end if;

  if has_function_privilege(
    'anon',
    'private.begin_protection_run(text,text,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'anon unexpectedly has begin_protection_run execute privilege';
  end if;

  if has_table_privilege('service_role', 'public.protection_runs', 'INSERT')
     or has_table_privilege('service_role', 'public.protection_runs', 'UPDATE')
     or has_table_privilege('service_role', 'public.protection_runs', 'DELETE') then
    raise exception 'service_role unexpectedly has direct protection_runs mutation privilege';
  end if;
end;
$$;

set local role anon;

do $$
begin
  begin
    perform count(*) from public.protection_runs;
    raise exception 'anon unexpectedly read protection runs';
  exception when insufficient_privilege then null;
  end;

  begin
    perform private.complete_protection_run(
      'ci:protection:success:1',
      'failed',
      null,
      false,
      null,
      'forged'
    );
    raise exception 'anon unexpectedly executed protection completion command';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;
