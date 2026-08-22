\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email)
values
  ('92000000-0000-4000-8000-000000000001', 'attachment-finance@example.invalid'),
  ('92000000-0000-4000-8000-000000000002', 'attachment-viewer@example.invalid'),
  ('92000000-0000-4000-8000-000000000003', 'attachment-scoped@example.invalid'),
  ('92000000-0000-4000-8000-000000000004', 'attachment-other-org@example.invalid');

insert into public.organizations (id, name, timezone, currency)
values
  ('92000000-0000-4000-8000-000000000100', 'Attachment Org', 'America/Sao_Paulo', 'BRL'),
  ('92000000-0000-4000-8000-000000000200', 'Attachment Other Org', 'America/Sao_Paulo', 'BRL');

insert into public.businesses (id, organization_id, name, code)
values
  ('92000000-0000-4000-8000-000000000110', '92000000-0000-4000-8000-000000000100', 'Attachment Business', 'attachment-main'),
  ('92000000-0000-4000-8000-000000000210', '92000000-0000-4000-8000-000000000200', 'Attachment Other Business', 'attachment-other');

insert into public.units (id, organization_id, business_id, name, code)
values
  ('92000000-0000-4000-8000-000000000120', '92000000-0000-4000-8000-000000000100', '92000000-0000-4000-8000-000000000110', 'Attachment Unit', 'attachment-unit'),
  ('92000000-0000-4000-8000-000000000121', '92000000-0000-4000-8000-000000000100', '92000000-0000-4000-8000-000000000110', 'Attachment Other Unit', 'attachment-other-unit'),
  ('92000000-0000-4000-8000-000000000220', '92000000-0000-4000-8000-000000000200', '92000000-0000-4000-8000-000000000210', 'Attachment Cross Org Unit', 'attachment-cross-org-unit');

insert into public.suppliers (id, organization_id, trade_name, status)
values
  ('92000000-0000-4000-8000-000000000130', '92000000-0000-4000-8000-000000000100', 'Attachment Supplier', 'active'),
  ('92000000-0000-4000-8000-000000000230', '92000000-0000-4000-8000-000000000200', 'Attachment Other Supplier', 'active');

insert into public.payable_documents (
  id,
  organization_id,
  unit_id,
  supplier_id,
  document_type,
  document_number,
  total_amount,
  lifecycle_status
) values (
  '92000000-0000-4000-8000-000000000140',
  '92000000-0000-4000-8000-000000000100',
  '92000000-0000-4000-8000-000000000120',
  '92000000-0000-4000-8000-000000000130',
  'supplier_document',
  'ATTACHMENT-001',
  100.00,
  'active'
);

insert into public.organization_memberships (
  organization_id, user_id, role, unit_id, active
) values
  ('92000000-0000-4000-8000-000000000100', '92000000-0000-4000-8000-000000000001', 'finance', null, true),
  ('92000000-0000-4000-8000-000000000100', '92000000-0000-4000-8000-000000000002', 'viewer', null, true),
  ('92000000-0000-4000-8000-000000000100', '92000000-0000-4000-8000-000000000003', 'finance', '92000000-0000-4000-8000-000000000121', true),
  ('92000000-0000-4000-8000-000000000200', '92000000-0000-4000-8000-000000000004', 'finance', null, true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Finance in scope can preflight and register metadata.
do $$
begin
  if not public.can_upload_finance_attachment(
    '92000000-0000-4000-8000-000000000100',
    '92000000-0000-4000-8000-000000000140'
  ) then
    raise exception 'finance preflight unexpectedly denied';
  end if;
end;
$$;

select * from public.register_finance_attachment(
  '92000000-0000-4000-8000-000000000150',
  '92000000-0000-4000-8000-000000000100',
  '92000000-0000-4000-8000-000000000140',
  'finance-attachments',
  '92000000-0000-4000-8000-000000000100/92000000-0000-4000-8000-000000000140/92000000-0000-4000-8000-000000000150',
  'nota-fiscal.pdf',
  'application/pdf',
  1024,
  repeat('a', 64)
);

-- Same registration is an idempotent replay and audit remains single.
select * from public.register_finance_attachment(
  '92000000-0000-4000-8000-000000000150',
  '92000000-0000-4000-8000-000000000100',
  '92000000-0000-4000-8000-000000000140',
  'finance-attachments',
  '92000000-0000-4000-8000-000000000100/92000000-0000-4000-8000-000000000140/92000000-0000-4000-8000-000000000150',
  'nota-fiscal.pdf',
  'application/pdf',
  1024,
  repeat('a', 64)
);

do $$
begin
  if (select count(*) from public.finance_attachments where id = '92000000-0000-4000-8000-000000000150') <> 1 then
    raise exception 'attachment replay duplicated metadata';
  end if;
end;
$$;

-- Audit is intentionally hidden from authenticated RLS; assert it as the administrative test role.
reset role;
do $$
begin
  if (select count(*) from public.audit_logs where entity_type='finance_attachment' and entity_id='92000000-0000-4000-8000-000000000150' and action='finance_attachment.created') <> 1 then
    raise exception 'attachment replay duplicated audit';
  end if;
end;
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Same attachment ID with changed semantics conflicts.
do $$
begin
  begin
    perform public.register_finance_attachment(
      '92000000-0000-4000-8000-000000000150',
      '92000000-0000-4000-8000-000000000100',
      '92000000-0000-4000-8000-000000000140',
      'finance-attachments',
      '92000000-0000-4000-8000-000000000100/92000000-0000-4000-8000-000000000140/92000000-0000-4000-8000-000000000150',
      'changed.pdf',
      'application/pdf',
      1024,
      repeat('a', 64)
    );
    raise exception 'changed attachment replay unexpectedly succeeded';
  exception when unique_violation then null;
  end;
end;
$$;

-- Invalid metadata is rejected at the authoritative RPC boundary.
do $$
begin
  begin
    perform public.register_finance_attachment(
      '92000000-0000-4000-8000-000000000151',
      '92000000-0000-4000-8000-000000000100',
      '92000000-0000-4000-8000-000000000140',
      'finance-attachments',
      'wrong/path',
      'bad.pdf',
      'application/pdf',
      1,
      repeat('b', 64)
    );
    raise exception 'invalid storage key unexpectedly accepted';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.register_finance_attachment(
      '92000000-0000-4000-8000-000000000152',
      '92000000-0000-4000-8000-000000000100',
      '92000000-0000-4000-8000-000000000140',
      'finance-attachments',
      '92000000-0000-4000-8000-000000000100/92000000-0000-4000-8000-000000000140/92000000-0000-4000-8000-000000000152',
      'bad.exe',
      'application/octet-stream',
      1,
      repeat('b', 64)
    );
    raise exception 'invalid mime unexpectedly accepted';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.register_finance_attachment(
      '92000000-0000-4000-8000-000000000153',
      '92000000-0000-4000-8000-000000000100',
      '92000000-0000-4000-8000-000000000140',
      'finance-attachments',
      '92000000-0000-4000-8000-000000000100/92000000-0000-4000-8000-000000000140/92000000-0000-4000-8000-000000000153',
      'too-large.pdf',
      'application/pdf',
      10485761,
      repeat('b', 64)
    );
    raise exception 'oversized attachment unexpectedly accepted';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.register_finance_attachment(
      '92000000-0000-4000-8000-000000000154',
      '92000000-0000-4000-8000-000000000100',
      '92000000-0000-4000-8000-000000000140',
      'finance-attachments',
      '92000000-0000-4000-8000-000000000100/92000000-0000-4000-8000-000000000140/92000000-0000-4000-8000-000000000154',
      'bad-checksum.pdf',
      'application/pdf',
      1,
      'xyz'
    );
    raise exception 'invalid checksum unexpectedly accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

-- Direct mutation remains closed even for Finance.
do $$
begin
  begin
    insert into public.finance_attachments(
      id, organization_id, payable_document_id, storage_bucket, storage_key,
      original_filename, mime_type, size_bytes, checksum_sha256
    ) values (
      '92000000-0000-4000-8000-000000000155',
      '92000000-0000-4000-8000-000000000100',
      '92000000-0000-4000-8000-000000000140',
      'finance-attachments',
      '92000000-0000-4000-8000-000000000100/92000000-0000-4000-8000-000000000140/92000000-0000-4000-8000-000000000155',
      'direct.pdf', 'application/pdf', 1, repeat('c', 64)
    );
    raise exception 'finance unexpectedly inserted attachment metadata directly';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.finance_attachments set original_filename='mutated.pdf'
    where id='92000000-0000-4000-8000-000000000150';
    raise exception 'finance unexpectedly updated attachment metadata directly';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.finance_attachments
    where id='92000000-0000-4000-8000-000000000150';
    raise exception 'finance unexpectedly deleted attachment metadata directly';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Viewer sees the document attachment but cannot upload/register.
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000002', true);

do $$
begin
  if public.can_upload_finance_attachment(
    '92000000-0000-4000-8000-000000000100',
    '92000000-0000-4000-8000-000000000140'
  ) then
    raise exception 'viewer unexpectedly passed upload preflight';
  end if;
  if (select count(*) from public.finance_attachments where payable_document_id='92000000-0000-4000-8000-000000000140') <> 1 then
    raise exception 'viewer could not read visible attachment';
  end if;
  begin
    perform public.register_finance_attachment(
      '92000000-0000-4000-8000-000000000156',
      '92000000-0000-4000-8000-000000000100',
      '92000000-0000-4000-8000-000000000140',
      'finance-attachments',
      '92000000-0000-4000-8000-000000000100/92000000-0000-4000-8000-000000000140/92000000-0000-4000-8000-000000000156',
      'viewer.pdf', 'application/pdf', 1, repeat('d', 64)
    );
    raise exception 'viewer unexpectedly registered attachment';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Same-Organization finance membership scoped to another Unit cannot read or upload.
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000003', true);

do $$
begin
  if public.can_upload_finance_attachment(
    '92000000-0000-4000-8000-000000000100',
    '92000000-0000-4000-8000-000000000140'
  ) then
    raise exception 'out-of-scope finance unexpectedly passed upload preflight';
  end if;
  if (select count(*) from public.finance_attachments where organization_id='92000000-0000-4000-8000-000000000100') <> 0 then
    raise exception 'out-of-scope finance unexpectedly read attachment';
  end if;
end;
$$;

-- Cross-Organization user cannot see or register against the foreign document.
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000004', true);

do $$
begin
  if (select count(*) from public.finance_attachments where organization_id='92000000-0000-4000-8000-000000000100') <> 0 then
    raise exception 'cross-org user unexpectedly read attachment';
  end if;
  begin
    perform public.register_finance_attachment(
      '92000000-0000-4000-8000-000000000157',
      '92000000-0000-4000-8000-000000000100',
      '92000000-0000-4000-8000-000000000140',
      'finance-attachments',
      '92000000-0000-4000-8000-000000000100/92000000-0000-4000-8000-000000000140/92000000-0000-4000-8000-000000000157',
      'cross.pdf', 'application/pdf', 1, repeat('e', 64)
    );
    raise exception 'cross-org user unexpectedly registered attachment';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role anon;

-- Anonymous role has neither metadata visibility nor RPC execution.
do $$
begin
  begin
    perform count(*) from public.finance_attachments;
    raise exception 'anon unexpectedly read attachment metadata';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.can_upload_finance_attachment(
      '92000000-0000-4000-8000-000000000100',
      '92000000-0000-4000-8000-000000000140'
    );
    raise exception 'anon unexpectedly executed attachment preflight';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;
