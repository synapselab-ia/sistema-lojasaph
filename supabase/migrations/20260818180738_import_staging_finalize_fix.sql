-- Qualify staged-row columns inside finalize_import_preview.
-- The RETURNS TABLE output names are PL/pgSQL variables and must not shadow
-- import_rows columns during preview aggregation.

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
    count(*) filter (where staged_row.state = 'accepted'),
    count(*) filter (where staged_row.state = 'duplicate'),
    count(*) filter (where staged_row.state = 'warning'),
    count(*) filter (where staged_row.state = 'rejected'),
    count(*) filter (where staged_row.state = 'pending_mapping')
  into
    v_total_rows,
    v_accepted_rows,
    v_duplicate_rows,
    v_warning_rows,
    v_rejected_rows,
    v_pending_mapping_rows
  from public.import_rows staged_row
  where staged_row.organization_id = p_organization_id
    and staged_row.import_batch_id = p_import_batch_id;

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
