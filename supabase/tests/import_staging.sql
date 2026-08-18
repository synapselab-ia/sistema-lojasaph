\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email)
values
  ('95000000-0000-4000-8000-000000000001', 'import-manager@example.invalid'),
  ('95000000-0000-4000-8000-000000000002', 'import-scoped-manager@example.invalid'),
  ('95000000-0000-4000-8000-000000000003', 'import-outsider@example.invalid')
on conflict (id) do nothing;

insert into public.organization_memberships (
  id, organization_id, user_id, role, unit_id, active
)
values
  (
    '95000000-0000-4000-8000-000000000010',
    '00000000-0000-4000-8000-000000000001',
    '95000000-0000-4000-8000-000000000001',
    'manager',
    null,
    true
  ),
  (
    '95000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000001',
    '95000000-0000-4000-8000-000000000002',
    'manager',
    '00000000-0000-4000-8000-000000000100',
    true
  )
on conflict do nothing;

set role authenticated;
select set_config('request.jwt.claim.sub', '95000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

-- Same deterministic source/version reuses the first batch even when the caller
-- supplies another UUID.
select * from public.stage_import_batch(
  '95000000-0000-4000-8000-000000000100',
  '00000000-0000-4000-8000-000000000001',
  'synthetic_fixture',
  'synthetic-products.xlsx',
  repeat('a', 64),
  'phase15-v1',
  '{"fixture":true}'::jsonb
);

select * from public.stage_import_batch(
  '95000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000001',
  'synthetic_fixture',
  'synthetic-products.xlsx',
  repeat('a', 64),
  'phase15-v1',
  '{"fixture":true}'::jsonb
);

do $$
begin
  if (
    select count(*)
    from public.import_batches
    where organization_id = '00000000-0000-4000-8000-000000000001'
      and source_file = 'synthetic-products.xlsx'
      and transformation_version = 'phase15-v1'
  ) <> 1 then
    raise exception 'same source/version created duplicate import batch';
  end if;
end;
$$;

select * from public.stage_import_row(
  '95000000-0000-4000-8000-000000000200',
  '00000000-0000-4000-8000-000000000001',
  '95000000-0000-4000-8000-000000000100',
  'Produtos',
  2,
  'A-1',
  '{"codigo":"A-1","nome":"Água 500 ml"}'::jsonb,
  '{"internal_code":"A-1","name":"Água 500 ml"}'::jsonb,
  'stock_item',
  '00000000-0000-4000-8000-000000000400',
  'accepted',
  '[]'::jsonb,
  '[]'::jsonb,
  'canonical_name'
);

-- Same source position and content is idempotent inside the same batch.
select * from public.stage_import_row(
  '95000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000001',
  '95000000-0000-4000-8000-000000000100',
  'Produtos',
  2,
  'A-1',
  '{"nome":"Água 500 ml","codigo":"A-1"}'::jsonb,
  '{"name":"Água 500 ml","internal_code":"A-1"}'::jsonb,
  'stock_item',
  '00000000-0000-4000-8000-000000000400',
  'accepted',
  '[]'::jsonb,
  '[]'::jsonb,
  'canonical_name'
);

select * from public.stage_import_row(
  '95000000-0000-4000-8000-000000000202',
  '00000000-0000-4000-8000-000000000001',
  '95000000-0000-4000-8000-000000000100',
  'Produtos',
  3,
  'A-2',
  '{"codigo":"A-2","nome":"Carvão"}'::jsonb,
  '{"internal_code":"A-2","name":"Carvão"}'::jsonb,
  'stock_item',
  '00000000-0000-4000-8000-000000000402',
  'warning',
  '["SYNTHETIC_WARNING"]'::jsonb,
  '[]'::jsonb,
  'explicit_alias'
);

select * from public.stage_import_row(
  '95000000-0000-4000-8000-000000000203',
  '00000000-0000-4000-8000-000000000001',
  '95000000-0000-4000-8000-000000000100',
  'Produtos',
  4,
  'A-3',
  '{"codigo":"A-3","nome":""}'::jsonb,
  '{}'::jsonb,
  null,
  null,
  'rejected',
  '[]'::jsonb,
  '["SYNTHETIC_REQUIRED_FIELD"]'::jsonb,
  null
);

select * from public.stage_import_row(
  '95000000-0000-4000-8000-000000000204',
  '00000000-0000-4000-8000-000000000001',
  '95000000-0000-4000-8000-000000000100',
  'Produtos',
  5,
  'A-4',
  '{"codigo":"A-4","nome":"Mapeamento pendente"}'::jsonb,
  '{"internal_code":"A-4","name":"Mapeamento pendente"}'::jsonb,
  null,
  null,
  'pending_mapping',
  '[]'::jsonb,
  '[]'::jsonb,
  'OPEN_QUESTION_REVIEW'
);

do $$
begin
  if (
    select count(*)
    from public.import_rows
    where import_batch_id = '95000000-0000-4000-8000-000000000100'
  ) <> 4 then
    raise exception 'same source row was duplicated inside batch';
  end if;
end;
$$;

select * from public.finalize_import_preview(
  '00000000-0000-4000-8000-000000000001',
  '95000000-0000-4000-8000-000000000100'
);

-- Finalization is idempotent and produces a structured report.
select * from public.finalize_import_preview(
  '00000000-0000-4000-8000-000000000001',
  '95000000-0000-4000-8000-000000000100'
);

do $$
declare
  report record;
begin
  select *
    into report
  from public.get_import_preview_report(
    '00000000-0000-4000-8000-000000000001',
    '95000000-0000-4000-8000-000000000100'
  );

  if report.status <> 'review_required'
     or report.total_rows <> 4
     or report.accepted_rows <> 1
     or report.warning_rows <> 1
     or report.rejected_rows <> 1
     or report.pending_mapping_rows <> 1
     or report.duplicate_rows <> 0 then
    raise exception 'unexpected import preview report: %', row_to_json(report);
  end if;
end;
$$;

-- Once finalized, the source lineage is immutable through the command surface.
do $$
begin
  begin
    perform public.stage_import_row(
      '95000000-0000-4000-8000-000000000205',
      '00000000-0000-4000-8000-000000000001',
      '95000000-0000-4000-8000-000000000100',
      'Produtos',
      6,
      'A-5',
      '{"codigo":"A-5"}'::jsonb,
      '{"internal_code":"A-5"}'::jsonb,
      null,
      null,
      'pending_mapping',
      '[]'::jsonb,
      '[]'::jsonb,
      'OPEN_QUESTION_REVIEW'
    );
    raise exception 'finalized batch unexpectedly accepted another row';
  exception
    when object_not_in_prerequisite_state then null;
  end;
end;
$$;

-- A new transformation version gets a new batch, but an identical source row is
-- classified as duplicate rather than being treated as a new operational record.
select * from public.stage_import_batch(
  '95000000-0000-4000-8000-000000000110',
  '00000000-0000-4000-8000-000000000001',
  'synthetic_fixture',
  'synthetic-products.xlsx',
  repeat('a', 64),
  'phase15-v2',
  '{"fixture":true}'::jsonb
);

select * from public.stage_import_row(
  '95000000-0000-4000-8000-000000000210',
  '00000000-0000-4000-8000-000000000001',
  '95000000-0000-4000-8000-000000000110',
  'Produtos',
  2,
  'A-1',
  '{"codigo":"A-1","nome":"Água 500 ml"}'::jsonb,
  '{"internal_code":"A-1","name":"Água 500 ml"}'::jsonb,
  'stock_item',
  '00000000-0000-4000-8000-000000000400',
  'accepted',
  '[]'::jsonb,
  '[]'::jsonb,
  'canonical_name'
);

do $$
begin
  if (
    select state
    from public.import_rows
    where id = '95000000-0000-4000-8000-000000000210'
  ) <> 'duplicate' then
    raise exception 'same source row in later batch was not classified duplicate';
  end if;

  if exists (
    select 1
    from public.stock_items
    where internal_code like 'IMPORT-PHASE15-%'
  ) then
    raise exception 'dry run unexpectedly wrote operational stock items';
  end if;
end;
$$;

-- Direct staging writes stay blocked; authenticated callers must use the RPCs.
do $$
begin
  begin
    insert into public.import_batches (
      id,
      organization_id,
      source_type,
      source_file,
      source_sha256,
      batch_key,
      transformation_version,
      requested_by_user_id
    )
    values (
      '95000000-0000-4000-8000-000000000120',
      '00000000-0000-4000-8000-000000000001',
      'synthetic_fixture',
      'direct-write.xlsx',
      repeat('b', 64),
      repeat('c', 64),
      'phase15-v1',
      '95000000-0000-4000-8000-000000000001'
    );
    raise exception 'direct import batch insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

-- A scoped manager cannot inspect or mutate Organization-wide import staging.
select set_config('request.jwt.claim.sub', '95000000-0000-4000-8000-000000000002', false);

do $$
begin
  if (select count(*) from public.import_batches) <> 0 then
    raise exception 'scoped manager unexpectedly saw import batches';
  end if;

  begin
    perform public.stage_import_batch(
      '95000000-0000-4000-8000-000000000130',
      '00000000-0000-4000-8000-000000000001',
      'synthetic_fixture',
      'scoped.xlsx',
      repeat('d', 64),
      'phase15-v1',
      '{}'::jsonb
    );
    raise exception 'scoped manager unexpectedly staged import batch';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

-- An authenticated outsider also sees nothing.
select set_config('request.jwt.claim.sub', '95000000-0000-4000-8000-000000000003', false);

do $$
begin
  if (select count(*) from public.import_batches) <> 0 then
    raise exception 'outsider unexpectedly saw import batches';
  end if;
end;
$$;

reset role;

-- Audit assertions run as the database test administrator because the existing
-- audit_logs RLS intentionally restricts direct audit visibility to owner/admin.
do $$
begin
  if (
    select count(*)
    from public.audit_logs
    where entity_id = '95000000-0000-4000-8000-000000000100'
      and action = 'import_batch_staged'
  ) <> 1 then
    raise exception 'batch staging audit must be written exactly once';
  end if;

  if (
    select count(*)
    from public.audit_logs
    where entity_id = '95000000-0000-4000-8000-000000000100'
      and action = 'import_preview_finalized'
  ) <> 1 then
    raise exception 'preview finalization audit must be written exactly once';
  end if;
end;
$$;

-- Anonymous callers do not have EXECUTE on the import command surface.
set role anon;
do $$
begin
  begin
    perform public.get_import_preview_report(
      '00000000-0000-4000-8000-000000000001',
      '95000000-0000-4000-8000-000000000100'
    );
    raise exception 'anonymous import report unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;
reset role;

rollback;

select 'import staging tests passed' as result;
