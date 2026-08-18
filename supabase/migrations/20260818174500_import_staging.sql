-- Fase 15: traceable import staging and dry-run preview foundation.
-- This migration intentionally does not write to operational target tables.

create table public.import_batches (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  source_type text not null check (length(trim(source_type)) > 0),
  source_file text not null check (length(trim(source_file)) > 0),
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  batch_key text not null check (batch_key ~ '^[0-9a-f]{64}$'),
  transformation_version text not null check (length(trim(transformation_version)) > 0),
  mode text not null default 'dry_run' check (mode = 'dry_run'),
  status text not null default 'staged'
    check (status in ('staged', 'review_required', 'ready')),
  requested_by_user_id uuid not null references auth.users(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  preview_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, batch_key),
  unique (id, organization_id)
);

create index import_batches_org_created_idx
  on public.import_batches(organization_id, created_at desc);

create table public.import_rows (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  import_batch_id uuid not null,
  source_sheet text not null check (length(trim(source_sheet)) > 0),
  source_row integer not null check (source_row > 0),
  source_raw_identifier text,
  raw_payload jsonb not null check (jsonb_typeof(raw_payload) = 'object'),
  raw_sha256 text not null check (raw_sha256 ~ '^[0-9a-f]{64}$'),
  idempotency_key text not null check (idempotency_key ~ '^[0-9a-f]{64}$'),
  normalized_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(normalized_payload) = 'object'),
  target_entity text check (target_entity is null or length(trim(target_entity)) > 0),
  target_entity_id uuid,
  resolution text,
  state text not null
    check (state in ('accepted', 'duplicate', 'warning', 'rejected', 'pending_mapping')),
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  errors jsonb not null default '[]'::jsonb check (jsonb_typeof(errors) = 'array'),
  created_at timestamptz not null default now(),
  unique (organization_id, import_batch_id, source_sheet, source_row),
  foreign key (import_batch_id, organization_id)
    references public.import_batches(id, organization_id) on delete restrict
);

create index import_rows_batch_state_idx
  on public.import_rows(organization_id, import_batch_id, state);

create index import_rows_idempotency_idx
  on public.import_rows(organization_id, idempotency_key);

create trigger import_batches_updated_at
before update on public.import_batches
for each row execute function public.set_updated_at();

alter table public.import_batches enable row level security;
alter table public.import_rows enable row level security;

create policy import_batches_orgwide_select
  on public.import_batches for select to authenticated
  using (
    private.has_org_wide_role(
      organization_id,
      array['owner', 'admin', 'manager']
    )
  );

create policy import_rows_orgwide_select
  on public.import_rows for select to authenticated
  using (
    private.has_org_wide_role(
      organization_id,
      array['owner', 'admin', 'manager']
    )
  );

grant select on public.import_batches to authenticated;
grant select on public.import_rows to authenticated;

create or replace function public.stage_import_batch(
  p_id uuid,
  p_organization_id uuid,
  p_source_type text,
  p_source_file text,
  p_source_sha256 text,
  p_transformation_version text,
  p_metadata jsonb
)
returns public.import_batches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.import_batches%rowtype;
  v_batch_key text;
  v_inserted boolean := false;
begin
  if auth.uid() is null
     or not private.has_org_wide_role(
       p_organization_id,
       array['owner', 'admin', 'manager']
     ) then
    raise exception 'IMPORT_SCOPE_NOT_ALLOWED' using errcode = '42501';
  end if;

  if p_id is null then
    raise exception 'IMPORT_BATCH_ID_REQUIRED' using errcode = '22023';
  end if;

  if p_source_type is null or length(trim(p_source_type)) = 0 then
    raise exception 'IMPORT_SOURCE_TYPE_REQUIRED' using errcode = '22023';
  end if;

  if p_source_file is null or length(trim(p_source_file)) = 0 then
    raise exception 'IMPORT_SOURCE_FILE_REQUIRED' using errcode = '22023';
  end if;

  if p_source_sha256 is null or lower(p_source_sha256) !~ '^[0-9a-f]{64}$' then
    raise exception 'IMPORT_SOURCE_SHA256_INVALID' using errcode = '22023';
  end if;

  if p_transformation_version is null or length(trim(p_transformation_version)) = 0 then
    raise exception 'IMPORT_TRANSFORMATION_VERSION_REQUIRED' using errcode = '22023';
  end if;

  if p_metadata is not null and jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'IMPORT_METADATA_MUST_BE_OBJECT' using errcode = '22023';
  end if;

  v_batch_key := encode(
    extensions.digest(
      concat_ws(
        chr(31),
        p_organization_id::text,
        lower(trim(p_source_type)),
        lower(trim(p_source_file)),
        lower(p_source_sha256),
        trim(p_transformation_version)
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.import_batches (
    id,
    organization_id,
    source_type,
    source_file,
    source_sha256,
    batch_key,
    transformation_version,
    requested_by_user_id,
    metadata
  )
  values (
    p_id,
    p_organization_id,
    trim(p_source_type),
    trim(p_source_file),
    lower(p_source_sha256),
    v_batch_key,
    trim(p_transformation_version),
    auth.uid(),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (organization_id, batch_key) do nothing
  returning * into v_batch;

  v_inserted := found;

  if not v_inserted then
    select *
      into v_batch
    from public.import_batches
    where organization_id = p_organization_id
      and batch_key = v_batch_key;

    if not found then
      raise exception 'IMPORT_BATCH_ID_CONFLICT' using errcode = '23505';
    end if;
  end if;

  if v_inserted then
    insert into public.audit_logs (
      organization_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      after_data,
      metadata
    )
    values (
      p_organization_id,
      auth.uid(),
      'import_batch_staged',
      'import_batch',
      v_batch.id,
      to_jsonb(v_batch),
      jsonb_build_object(
        'mode', 'dry_run',
        'batch_key', v_batch.batch_key
      )
    );
  end if;

  return v_batch;
end;
$$;

create or replace function public.stage_import_row(
  p_id uuid,
  p_organization_id uuid,
  p_import_batch_id uuid,
  p_source_sheet text,
  p_source_row integer,
  p_source_raw_identifier text,
  p_raw_payload jsonb,
  p_normalized_payload jsonb,
  p_target_entity text,
  p_target_entity_id uuid,
  p_state text,
  p_warnings jsonb,
  p_errors jsonb,
  p_resolution text
)
returns public.import_rows
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.import_batches%rowtype;
  v_row public.import_rows%rowtype;
  v_raw_sha256 text;
  v_idempotency_key text;
  v_effective_state text;
  v_seen_before boolean;
begin
  if auth.uid() is null
     or not private.has_org_wide_role(
       p_organization_id,
       array['owner', 'admin', 'manager']
     ) then
    raise exception 'IMPORT_SCOPE_NOT_ALLOWED' using errcode = '42501';
  end if;

  if p_id is null then
    raise exception 'IMPORT_ROW_ID_REQUIRED' using errcode = '22023';
  end if;

  select *
    into v_batch
  from public.import_batches
  where id = p_import_batch_id
    and organization_id = p_organization_id;

  if not found then
    raise exception 'IMPORT_BATCH_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_batch.status <> 'staged' then
    raise exception 'IMPORT_BATCH_ALREADY_FINALIZED' using errcode = '55000';
  end if;

  if p_source_sheet is null or length(trim(p_source_sheet)) = 0 then
    raise exception 'IMPORT_SOURCE_SHEET_REQUIRED' using errcode = '22023';
  end if;

  if p_source_row is null or p_source_row <= 0 then
    raise exception 'IMPORT_SOURCE_ROW_INVALID' using errcode = '22023';
  end if;

  if p_raw_payload is null or jsonb_typeof(p_raw_payload) <> 'object' then
    raise exception 'IMPORT_RAW_PAYLOAD_MUST_BE_OBJECT' using errcode = '22023';
  end if;

  if p_normalized_payload is null or jsonb_typeof(p_normalized_payload) <> 'object' then
    raise exception 'IMPORT_NORMALIZED_PAYLOAD_MUST_BE_OBJECT' using errcode = '22023';
  end if;

  if p_state is null
     or p_state not in ('accepted', 'warning', 'rejected', 'pending_mapping') then
    raise exception 'IMPORT_ROW_STATE_INVALID' using errcode = '22023';
  end if;

  if p_warnings is null or jsonb_typeof(p_warnings) <> 'array' then
    raise exception 'IMPORT_WARNINGS_MUST_BE_ARRAY' using errcode = '22023';
  end if;

  if p_errors is null or jsonb_typeof(p_errors) <> 'array' then
    raise exception 'IMPORT_ERRORS_MUST_BE_ARRAY' using errcode = '22023';
  end if;

  v_raw_sha256 := encode(
    extensions.digest(p_raw_payload::text, 'sha256'),
    'hex'
  );

  v_idempotency_key := encode(
    extensions.digest(
      concat_ws(
        chr(31),
        p_organization_id::text,
        v_batch.source_sha256,
        lower(trim(p_source_sheet)),
        p_source_row::text,
        v_raw_sha256
      ),
      'sha256'
    ),
    'hex'
  );

  select exists (
    select 1
    from public.import_rows existing_row
    where existing_row.organization_id = p_organization_id
      and existing_row.idempotency_key = v_idempotency_key
      and existing_row.import_batch_id <> p_import_batch_id
      and existing_row.state <> 'duplicate'
  )
  into v_seen_before;

  v_effective_state := case
    when v_seen_before and p_state in ('accepted', 'warning', 'pending_mapping')
      then 'duplicate'
    else p_state
  end;

  insert into public.import_rows (
    id,
    organization_id,
    import_batch_id,
    source_sheet,
    source_row,
    source_raw_identifier,
    raw_payload,
    raw_sha256,
    idempotency_key,
    normalized_payload,
    target_entity,
    target_entity_id,
    resolution,
    state,
    warnings,
    errors
  )
  values (
    p_id,
    p_organization_id,
    p_import_batch_id,
    trim(p_source_sheet),
    p_source_row,
    nullif(trim(p_source_raw_identifier), ''),
    p_raw_payload,
    v_raw_sha256,
    v_idempotency_key,
    p_normalized_payload,
    nullif(trim(p_target_entity), ''),
    p_target_entity_id,
    nullif(trim(p_resolution), ''),
    v_effective_state,
    p_warnings,
    p_errors
  )
  on conflict (organization_id, import_batch_id, source_sheet, source_row) do nothing
  returning * into v_row;

  if not found then
    select *
      into v_row
    from public.import_rows
    where organization_id = p_organization_id
      and import_batch_id = p_import_batch_id
      and source_sheet = trim(p_source_sheet)
      and source_row = p_source_row;

    if not found then
      raise exception 'IMPORT_ROW_ID_CONFLICT' using errcode = '23505';
    end if;

    if v_row.raw_sha256 <> v_raw_sha256
       or v_row.idempotency_key <> v_idempotency_key then
      raise exception 'IMPORT_SOURCE_POSITION_CHANGED' using errcode = '23505';
    end if;
  end if;

  return v_row;
end;
$$;

create or replace function public.get_import_preview_report(
  p_organization_id uuid,
  p_import_batch_id uuid
)
returns table (
  import_batch_id uuid,
  status text,
  total_rows bigint,
  accepted_rows bigint,
  duplicate_rows bigint,
  warning_rows bigint,
  rejected_rows bigint,
  pending_mapping_rows bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
     or not private.has_org_wide_role(
       p_organization_id,
       array['owner', 'admin', 'manager']
     ) then
    raise exception 'IMPORT_SCOPE_NOT_ALLOWED' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.import_batches batch
    where batch.id = p_import_batch_id
      and batch.organization_id = p_organization_id
  ) then
    raise exception 'IMPORT_BATCH_NOT_FOUND' using errcode = 'P0002';
  end if;

  return query
  select
    batch.id,
    batch.status,
    count(row.id),
    count(row.id) filter (where row.state = 'accepted'),
    count(row.id) filter (where row.state = 'duplicate'),
    count(row.id) filter (where row.state = 'warning'),
    count(row.id) filter (where row.state = 'rejected'),
    count(row.id) filter (where row.state = 'pending_mapping')
  from public.import_batches batch
  left join public.import_rows row
    on row.import_batch_id = batch.id
   and row.organization_id = batch.organization_id
  where batch.id = p_import_batch_id
    and batch.organization_id = p_organization_id
  group by batch.id, batch.status;
end;
$$;

create or replace function public.finalize_import_preview(
  p_organization_id uuid,
  p_import_batch_id uuid
)
returns table (
  import_batch_id uuid,
  status text,
  total_rows bigint,
  accepted_rows bigint,
  duplicate_rows bigint,
  warning_rows bigint,
  rejected_rows bigint,
  pending_mapping_rows bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch public.import_batches%rowtype;
  v_total_rows bigint;
  v_accepted_rows bigint;
  v_duplicate_rows bigint;
  v_warning_rows bigint;
  v_rejected_rows bigint;
  v_pending_mapping_rows bigint;
  v_new_status text;
  v_should_audit boolean;
begin
  if auth.uid() is null
     or not private.has_org_wide_role(
       p_organization_id,
       array['owner', 'admin', 'manager']
     ) then
    raise exception 'IMPORT_SCOPE_NOT_ALLOWED' using errcode = '42501';
  end if;

  select *
    into v_batch
  from public.import_batches
  where id = p_import_batch_id
    and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'IMPORT_BATCH_NOT_FOUND' using errcode = 'P0002';
  end if;

  select
    count(*),
    count(*) filter (where state = 'accepted'),
    count(*) filter (where state = 'duplicate'),
    count(*) filter (where state = 'warning'),
    count(*) filter (where state = 'rejected'),
    count(*) filter (where state = 'pending_mapping')
  into
    v_total_rows,
    v_accepted_rows,
    v_duplicate_rows,
    v_warning_rows,
    v_rejected_rows,
    v_pending_mapping_rows
  from public.import_rows
  where organization_id = p_organization_id
    and import_batch_id = p_import_batch_id;

  if v_total_rows = 0 then
    raise exception 'IMPORT_BATCH_EMPTY' using errcode = '22023';
  end if;

  v_new_status := case
    when v_rejected_rows > 0 or v_pending_mapping_rows > 0
      then 'review_required'
    else 'ready'
  end;

  v_should_audit := v_batch.status = 'staged';

  if v_should_audit then
    update public.import_batches
    set status = v_new_status,
        preview_completed_at = now()
    where id = p_import_batch_id
      and organization_id = p_organization_id
    returning * into v_batch;

    insert into public.audit_logs (
      organization_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      before_data,
      after_data,
      metadata
    )
    values (
      p_organization_id,
      auth.uid(),
      'import_preview_finalized',
      'import_batch',
      v_batch.id,
      jsonb_build_object('status', 'staged'),
      jsonb_build_object('status', v_new_status),
      jsonb_build_object(
        'total_rows', v_total_rows,
        'accepted_rows', v_accepted_rows,
        'duplicate_rows', v_duplicate_rows,
        'warning_rows', v_warning_rows,
        'rejected_rows', v_rejected_rows,
        'pending_mapping_rows', v_pending_mapping_rows
      )
    );
  else
    v_new_status := v_batch.status;
  end if;

  return query
  select
    p_import_batch_id,
    v_new_status,
    v_total_rows,
    v_accepted_rows,
    v_duplicate_rows,
    v_warning_rows,
    v_rejected_rows,
    v_pending_mapping_rows;
end;
$$;

revoke all on function public.stage_import_batch(uuid, uuid, text, text, text, text, jsonb) from public;
revoke all on function public.stage_import_row(uuid, uuid, uuid, text, integer, text, jsonb, jsonb, text, uuid, text, jsonb, jsonb, text) from public;
revoke all on function public.get_import_preview_report(uuid, uuid) from public;
revoke all on function public.finalize_import_preview(uuid, uuid) from public;

revoke all on function public.stage_import_batch(uuid, uuid, text, text, text, text, jsonb) from anon;
revoke all on function public.stage_import_row(uuid, uuid, uuid, text, integer, text, jsonb, jsonb, text, uuid, text, jsonb, jsonb, text) from anon;
revoke all on function public.get_import_preview_report(uuid, uuid) from anon;
revoke all on function public.finalize_import_preview(uuid, uuid) from anon;

grant execute on function public.stage_import_batch(uuid, uuid, text, text, text, text, jsonb) to authenticated;
grant execute on function public.stage_import_row(uuid, uuid, uuid, text, integer, text, jsonb, jsonb, text, uuid, text, jsonb, jsonb, text) to authenticated;
grant execute on function public.get_import_preview_report(uuid, uuid) to authenticated;
grant execute on function public.finalize_import_preview(uuid, uuid) to authenticated;

comment on table public.import_batches is
  'Traceable dry-run import batches. Fase 15 does not apply rows to operational tables.';

comment on table public.import_rows is
  'Immutable staged source rows with origin, deterministic idempotency key and preview classification.';
