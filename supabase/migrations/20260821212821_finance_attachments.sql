-- Issue #92 / REQ-FIN-008: private financial attachments linked initially to payable documents.
-- Physical objects remain in Supabase Storage and are manipulated only through the Storage API.

create table public.finance_attachments (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  payable_document_id uuid not null,
  storage_bucket text not null default 'finance-attachments'
    check (storage_bucket = 'finance-attachments'),
  storage_key text not null,
  original_filename text not null
    check (length(trim(original_filename)) between 1 and 255),
  mime_type text not null
    check (mime_type in (
      'application/pdf',
      'application/xml',
      'text/xml',
      'image/jpeg',
      'image/png',
      'image/webp'
    )),
  size_bytes bigint not null
    check (size_bytes between 1 and 10485760),
  checksum_sha256 text not null
    check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (storage_bucket, storage_key),
  foreign key (payable_document_id, organization_id)
    references public.payable_documents(id, organization_id) on delete restrict,
  check (
    storage_key = organization_id::text || '/' || payable_document_id::text || '/' || id::text
  )
);

create index finance_attachments_document_idx
  on public.finance_attachments(organization_id, payable_document_id, created_at desc);

alter table public.finance_attachments enable row level security;

grant select on public.finance_attachments to authenticated;
revoke insert, update, delete on public.finance_attachments from authenticated, anon;
revoke all on public.finance_attachments from anon;
grant all on public.finance_attachments to service_role;

create policy finance_attachments_member_select
  on public.finance_attachments
  for select
  to authenticated
  using (private.can_read_payable_document(organization_id, payable_document_id));

create or replace function public.can_upload_finance_attachment(
  p_organization_id uuid,
  p_payable_document_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and private.has_payable_document_role(
       p_organization_id,
       p_payable_document_id,
       array['owner','admin','manager','finance']::text[]
     );
$$;

revoke all on function public.can_upload_finance_attachment(uuid, uuid)
  from public, anon;
grant execute on function public.can_upload_finance_attachment(uuid, uuid)
  to authenticated, service_role;

create or replace function public.register_finance_attachment(
  p_attachment_id uuid,
  p_organization_id uuid,
  p_payable_document_id uuid,
  p_storage_bucket text,
  p_storage_key text,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint,
  p_checksum_sha256 text
)
returns table (
  attachment_id uuid,
  registered_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_expected_storage_key text;
  v_existing public.finance_attachments%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_attachment_id is null or p_organization_id is null or p_payable_document_id is null then
    raise exception 'ATTACHMENT_IDENTITY_REQUIRED' using errcode = '22023';
  end if;

  if not private.has_payable_document_role(
    p_organization_id,
    p_payable_document_id,
    array['owner','admin','manager','finance']::text[]
  ) then
    raise exception 'INSUFFICIENT_ROLE_OR_SCOPE' using errcode = '42501';
  end if;

  if p_storage_bucket is distinct from 'finance-attachments' then
    raise exception 'INVALID_ATTACHMENT_BUCKET' using errcode = '22023';
  end if;

  v_expected_storage_key :=
    p_organization_id::text || '/' || p_payable_document_id::text || '/' || p_attachment_id::text;

  if p_storage_key is distinct from v_expected_storage_key then
    raise exception 'INVALID_ATTACHMENT_STORAGE_KEY' using errcode = '22023';
  end if;

  if p_original_filename is null
     or length(trim(p_original_filename)) = 0
     or length(trim(p_original_filename)) > 255 then
    raise exception 'INVALID_ATTACHMENT_FILENAME' using errcode = '22023';
  end if;

  if p_mime_type is null or p_mime_type <> any(array[
    'application/pdf',
    'application/xml',
    'text/xml',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]) then
    raise exception 'INVALID_ATTACHMENT_MIME_TYPE' using errcode = '22023';
  end if;

  if p_size_bytes is null or p_size_bytes < 1 or p_size_bytes > 10485760 then
    raise exception 'INVALID_ATTACHMENT_SIZE' using errcode = '22023';
  end if;

  if p_checksum_sha256 is null or p_checksum_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_ATTACHMENT_CHECKSUM' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_attachment_id::text, 0)
  );

  select *
  into v_existing
  from public.finance_attachments attachment
  where attachment.id = p_attachment_id;

  if found then
    if v_existing.organization_id <> p_organization_id
       or v_existing.payable_document_id <> p_payable_document_id
       or v_existing.storage_bucket <> p_storage_bucket
       or v_existing.storage_key <> p_storage_key
       or v_existing.original_filename <> trim(p_original_filename)
       or v_existing.mime_type <> p_mime_type
       or v_existing.size_bytes <> p_size_bytes
       or v_existing.checksum_sha256 <> p_checksum_sha256
       or v_existing.created_by_user_id is distinct from v_user_id then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;

    return query select v_existing.id, v_existing.created_at;
    return;
  end if;

  insert into public.finance_attachments (
    id,
    organization_id,
    payable_document_id,
    storage_bucket,
    storage_key,
    original_filename,
    mime_type,
    size_bytes,
    checksum_sha256,
    created_by_user_id
  ) values (
    p_attachment_id,
    p_organization_id,
    p_payable_document_id,
    p_storage_bucket,
    p_storage_key,
    trim(p_original_filename),
    p_mime_type,
    p_size_bytes,
    p_checksum_sha256,
    v_user_id
  );

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    after_data,
    metadata
  ) values (
    p_organization_id,
    v_user_id,
    'finance_attachment.created',
    'finance_attachment',
    p_attachment_id,
    jsonb_build_object(
      'payable_document_id', p_payable_document_id,
      'storage_bucket', p_storage_bucket,
      'storage_key', p_storage_key,
      'original_filename', trim(p_original_filename),
      'mime_type', p_mime_type,
      'size_bytes', p_size_bytes,
      'checksum_sha256', p_checksum_sha256
    ),
    jsonb_build_object('source', 'register_finance_attachment')
  );

  return query
  select attachment.id, attachment.created_at
  from public.finance_attachments attachment
  where attachment.id = p_attachment_id;
end;
$$;

revoke all on function public.register_finance_attachment(
  uuid, uuid, uuid, text, text, text, text, bigint, text
) from public, anon;
grant execute on function public.register_finance_attachment(
  uuid, uuid, uuid, text, text, text, text, bigint, text
) to authenticated, service_role;
