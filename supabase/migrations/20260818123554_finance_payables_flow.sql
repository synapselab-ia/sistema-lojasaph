create table public.payable_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  unit_id uuid not null,
  sector_id uuid,
  supplier_id uuid not null,
  document_type text not null default 'supplier_document' check (length(trim(document_type)) > 0),
  document_number text,
  series text,
  access_key text,
  issued_at date,
  description text,
  total_amount numeric(18,2) not null check (total_amount >= 0),
  lifecycle_status text not null default 'active' check (lifecycle_status in ('active', 'cancelled')),
  cancelled_at timestamptz,
  responsible_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (unit_id, organization_id)
    references public.units(id, organization_id) on delete restrict,
  foreign key (sector_id, organization_id)
    references public.sectors(id, organization_id) on delete restrict,
  foreign key (supplier_id, organization_id)
    references public.suppliers(id, organization_id) on delete restrict,
  check ((lifecycle_status = 'cancelled') = (cancelled_at is not null))
);

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  payable_document_id uuid not null,
  installment_number integer not null check (installment_number >= 1),
  installment_count integer not null check (installment_count >= 1 and installment_count >= installment_number),
  nominal_amount numeric(18,2) not null check (nominal_amount >= 0),
  due_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (payable_document_id, installment_number),
  foreign key (payable_document_id, organization_id)
    references public.payable_documents(id, organization_id) on delete restrict
);

create table public.payment_instructions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  installment_id uuid not null,
  raw_reference text not null check (length(trim(raw_reference)) > 0),
  label text,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (installment_id, organization_id)
    references public.installments(id, organization_id) on delete restrict
);

create table public.payments (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  installment_id uuid not null,
  event_type text not null check (event_type in ('payment', 'reversal')),
  amount numeric(18,2) not null check (amount > 0),
  paid_at timestamptz not null,
  payment_reference text,
  notes text,
  responsible_user_id uuid references auth.users(id) on delete set null,
  reverses_payment_id uuid,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (installment_id, organization_id)
    references public.installments(id, organization_id) on delete restrict,
  foreign key (reverses_payment_id, organization_id)
    references public.payments(id, organization_id) on delete restrict,
  check (
    (event_type = 'payment' and reverses_payment_id is null)
    or (event_type = 'reversal' and reverses_payment_id is not null)
  ),
  check (reverses_payment_id is null or reverses_payment_id <> id)
);

create index payable_documents_org_supplier_idx
  on public.payable_documents(organization_id, supplier_id, created_at desc);
create index payable_documents_org_unit_idx
  on public.payable_documents(organization_id, unit_id, created_at desc);
create index installments_due_idx
  on public.installments(organization_id, due_date, payable_document_id);
create index installments_document_idx
  on public.installments(organization_id, payable_document_id, installment_number);
create index payment_instructions_installment_idx
  on public.payment_instructions(organization_id, installment_id, created_at desc);
create index payments_installment_idx
  on public.payments(organization_id, installment_id, paid_at desc);
create unique index payments_single_full_reversal_idx
  on public.payments(organization_id, reverses_payment_id)
  where event_type = 'reversal';

create trigger payable_documents_updated_at before update on public.payable_documents
for each row execute function public.set_updated_at();
create trigger installments_updated_at before update on public.installments
for each row execute function public.set_updated_at();

alter table public.payable_documents enable row level security;
alter table public.installments enable row level security;
alter table public.payment_instructions enable row level security;
alter table public.payments enable row level security;

grant select on public.payable_documents,
                public.installments,
                public.payment_instructions,
                public.payments
  to authenticated;
revoke insert, update, delete on public.payable_documents,
                                 public.installments,
                                 public.payment_instructions,
                                 public.payments
  from authenticated, anon;
revoke all on public.payable_documents,
              public.installments,
              public.payment_instructions,
              public.payments
  from anon;
grant all on public.payable_documents,
             public.installments,
             public.payment_instructions,
             public.payments
  to service_role;

create policy payable_documents_select_member
  on public.payable_documents for select to authenticated
  using (public.is_org_member(organization_id));
create policy installments_select_member
  on public.installments for select to authenticated
  using (public.is_org_member(organization_id));
create policy payment_instructions_select_member
  on public.payment_instructions for select to authenticated
  using (public.is_org_member(organization_id));
create policy payments_select_member
  on public.payments for select to authenticated
  using (public.is_org_member(organization_id));

create or replace view public.payable_installment_summary
with (security_invoker = true)
as
select
  i.id as installment_id,
  i.organization_id,
  i.payable_document_id,
  d.unit_id,
  d.sector_id,
  d.supplier_id,
  d.document_type,
  d.document_number,
  d.series,
  d.access_key,
  d.issued_at,
  d.description,
  d.lifecycle_status,
  i.installment_number,
  i.installment_count,
  i.nominal_amount,
  i.due_date,
  coalesce(payment_totals.net_paid_amount, 0::numeric)::numeric(18,2) as net_paid_amount,
  (i.nominal_amount - coalesce(payment_totals.net_paid_amount, 0::numeric))::numeric(18,2) as balance_amount,
  case
    when d.lifecycle_status = 'cancelled' then 'cancelled'
    when coalesce(payment_totals.net_paid_amount, 0::numeric) >= i.nominal_amount then 'paid'
    when i.due_date < (now() at time zone organization.timezone)::date then 'overdue'
    when i.due_date = (now() at time zone organization.timezone)::date then 'due_today'
    else 'upcoming'
  end as payment_status
from public.installments i
join public.payable_documents d
  on d.id = i.payable_document_id
 and d.organization_id = i.organization_id
join public.organizations organization
  on organization.id = i.organization_id
left join lateral (
  select coalesce(sum(
    case when p.event_type = 'payment' then p.amount else -p.amount end
  ), 0::numeric) as net_paid_amount
  from public.payments p
  where p.organization_id = i.organization_id
    and p.installment_id = i.id
) payment_totals on true;

grant select on public.payable_installment_summary to authenticated, service_role;
revoke all on public.payable_installment_summary from anon;

create or replace function public.create_payable_document(
  p_command_id uuid,
  p_organization_id uuid,
  p_unit_id uuid,
  p_sector_id uuid,
  p_supplier_id uuid,
  p_document_type text,
  p_document_number text,
  p_series text,
  p_access_key text,
  p_issued_at date,
  p_description text,
  p_installments jsonb
)
returns table (
  payable_document_id uuid,
  total_amount numeric,
  installment_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_number integer;
  v_count integer;
  v_expected_count integer;
  v_amount numeric(18,2);
  v_due_date date;
  v_reference text;
  v_label text;
  v_total numeric(18,2) := 0;
  v_array_count integer;
  v_normalized_installments jsonb;
  v_existing_installments jsonb;
  v_existing_org uuid;
  v_existing_unit uuid;
  v_existing_sector uuid;
  v_existing_supplier uuid;
  v_existing_type text;
  v_existing_number text;
  v_existing_series text;
  v_existing_access_key text;
  v_existing_issued_at date;
  v_existing_description text;
  v_existing_total numeric(18,2);
  v_installment_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if not private.has_org_role(p_organization_id, array['owner','admin','manager','finance']) then
    raise exception 'INSUFFICIENT_ROLE' using errcode = '42501';
  end if;
  if p_document_type is null or length(trim(p_document_type)) = 0 then
    raise exception 'DOCUMENT_TYPE_REQUIRED' using errcode = '22023';
  end if;
  if p_installments is null or jsonb_typeof(p_installments) <> 'array' or jsonb_array_length(p_installments) = 0 then
    raise exception 'INSTALLMENTS_REQUIRED' using errcode = '22023';
  end if;

  v_array_count := jsonb_array_length(p_installments);

  for v_item in select value from jsonb_array_elements(p_installments) loop
    v_number := nullif(v_item->>'number', '')::integer;
    v_count := nullif(v_item->>'count', '')::integer;
    v_amount := nullif(v_item->>'amount', '')::numeric;
    v_due_date := nullif(v_item->>'due_date', '')::date;

    if v_number is null or v_number < 1 then
      raise exception 'INVALID_INSTALLMENT_NUMBER' using errcode = '22023';
    end if;
    if v_count is null or v_count < 1 or v_number > v_count then
      raise exception 'INVALID_INSTALLMENT_COUNT' using errcode = '22023';
    end if;
    if v_expected_count is null then
      v_expected_count := v_count;
    elsif v_expected_count <> v_count then
      raise exception 'INCONSISTENT_INSTALLMENT_COUNT' using errcode = '22023';
    end if;
    if v_amount is null or v_amount < 0 or scale(v_amount) > 2 then
      raise exception 'INVALID_INSTALLMENT_AMOUNT' using errcode = '22023';
    end if;
    if v_due_date is null then
      raise exception 'INSTALLMENT_DUE_DATE_REQUIRED' using errcode = '22023';
    end if;

    v_total := v_total + v_amount;
  end loop;

  if v_expected_count <> v_array_count then
    raise exception 'INSTALLMENT_SET_INCOMPLETE' using errcode = '22023';
  end if;
  if (
    select count(*)
    from jsonb_array_elements(p_installments)
  ) <> (
    select count(distinct (value->>'number')::integer)
    from jsonb_array_elements(p_installments)
  ) then
    raise exception 'DUPLICATE_INSTALLMENT_NUMBER' using errcode = '22023';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'number', (value->>'number')::integer,
      'count', (value->>'count')::integer,
      'amount', (value->>'amount')::numeric,
      'due_date', (value->>'due_date')::date,
      'payment_reference', nullif(trim(value->>'payment_reference'), ''),
      'payment_label', nullif(trim(value->>'payment_label'), '')
    ) order by (value->>'number')::integer
  )
  into v_normalized_installments
  from jsonb_array_elements(p_installments);

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_command_id::text, 0));

  select
    d.organization_id,
    d.unit_id,
    d.sector_id,
    d.supplier_id,
    d.document_type,
    d.document_number,
    d.series,
    d.access_key,
    d.issued_at,
    d.description,
    d.total_amount
  into
    v_existing_org,
    v_existing_unit,
    v_existing_sector,
    v_existing_supplier,
    v_existing_type,
    v_existing_number,
    v_existing_series,
    v_existing_access_key,
    v_existing_issued_at,
    v_existing_description,
    v_existing_total
  from public.payable_documents d
  where d.id = p_command_id;

  if found then
    select jsonb_agg(
      jsonb_build_object(
        'number', i.installment_number,
        'count', i.installment_count,
        'amount', i.nominal_amount,
        'due_date', i.due_date,
        'payment_reference', instruction.raw_reference,
        'payment_label', instruction.label
      ) order by i.installment_number
    )
    into v_existing_installments
    from public.installments i
    left join lateral (
      select pi.raw_reference, pi.label
      from public.payment_instructions pi
      where pi.organization_id = i.organization_id
        and pi.installment_id = i.id
      order by pi.created_at, pi.id
      limit 1
    ) instruction on true
    where i.organization_id = v_existing_org
      and i.payable_document_id = p_command_id;

    if v_existing_org <> p_organization_id
      or v_existing_unit <> p_unit_id
      or v_existing_sector is distinct from p_sector_id
      or v_existing_supplier <> p_supplier_id
      or v_existing_type <> trim(p_document_type)
      or v_existing_number is distinct from nullif(trim(p_document_number), '')
      or v_existing_series is distinct from nullif(trim(p_series), '')
      or v_existing_access_key is distinct from nullif(trim(p_access_key), '')
      or v_existing_issued_at is distinct from p_issued_at
      or v_existing_description is distinct from nullif(trim(p_description), '')
      or v_existing_total <> v_total
      or v_existing_installments is distinct from v_normalized_installments
    then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;

    return query select p_command_id, v_existing_total, v_expected_count;
    return;
  end if;

  perform 1
  from public.units u
  where u.id = p_unit_id
    and u.organization_id = p_organization_id
    and u.status = 'active';
  if not found then
    raise exception 'UNIT_NOT_AVAILABLE' using errcode = '23503';
  end if;

  if p_sector_id is not null then
    perform 1
    from public.sectors s
    where s.id = p_sector_id
      and s.organization_id = p_organization_id
      and s.unit_id = p_unit_id
      and s.status = 'active';
    if not found then
      raise exception 'SECTOR_NOT_AVAILABLE' using errcode = '23503';
    end if;
  end if;

  perform 1
  from public.suppliers s
  where s.id = p_supplier_id
    and s.organization_id = p_organization_id
    and s.status = 'active';
  if not found then
    raise exception 'SUPPLIER_NOT_AVAILABLE' using errcode = '23503';
  end if;

  insert into public.payable_documents(
    id,
    organization_id,
    unit_id,
    sector_id,
    supplier_id,
    document_type,
    document_number,
    series,
    access_key,
    issued_at,
    description,
    total_amount,
    lifecycle_status,
    responsible_user_id
  ) values (
    p_command_id,
    p_organization_id,
    p_unit_id,
    p_sector_id,
    p_supplier_id,
    trim(p_document_type),
    nullif(trim(p_document_number), ''),
    nullif(trim(p_series), ''),
    nullif(trim(p_access_key), ''),
    p_issued_at,
    nullif(trim(p_description), ''),
    v_total,
    'active',
    v_user_id
  );

  for v_item in
    select value
    from jsonb_array_elements(v_normalized_installments)
    order by (value->>'number')::integer
  loop
    v_number := (v_item->>'number')::integer;
    v_count := (v_item->>'count')::integer;
    v_amount := (v_item->>'amount')::numeric;
    v_due_date := (v_item->>'due_date')::date;
    v_reference := nullif(trim(v_item->>'payment_reference'), '');
    v_label := nullif(trim(v_item->>'payment_label'), '');

    insert into public.installments(
      organization_id,
      payable_document_id,
      installment_number,
      installment_count,
      nominal_amount,
      due_date
    ) values (
      p_organization_id,
      p_command_id,
      v_number,
      v_count,
      v_amount,
      v_due_date
    ) returning id into v_installment_id;

    if v_reference is not null then
      insert into public.payment_instructions(
        organization_id,
        installment_id,
        raw_reference,
        label
      ) values (
        p_organization_id,
        v_installment_id,
        v_reference,
        v_label
      );
    end if;
  end loop;

  insert into public.audit_logs(
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
    'payable_document.created',
    'payable_document',
    p_command_id,
    jsonb_build_object(
      'supplier_id', p_supplier_id,
      'unit_id', p_unit_id,
      'sector_id', p_sector_id,
      'total_amount', v_total,
      'installment_count', v_expected_count
    ),
    jsonb_build_object('source', 'create_payable_document_rpc', 'command_id', p_command_id)
  );

  return query select p_command_id, v_total, v_expected_count;
end;
$$;

create or replace function public.record_installment_payment(
  p_command_id uuid,
  p_organization_id uuid,
  p_installment_id uuid,
  p_amount numeric,
  p_paid_at timestamptz,
  p_payment_reference text default null,
  p_notes text default null
)
returns table (
  payment_id uuid,
  installment_id uuid,
  net_paid_amount numeric,
  balance_amount numeric,
  payment_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_org uuid;
  v_existing_installment uuid;
  v_existing_type text;
  v_existing_amount numeric(18,2);
  v_existing_paid_at timestamptz;
  v_existing_reference text;
  v_existing_notes text;
  v_document_id uuid;
  v_lifecycle text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if not private.has_org_role(p_organization_id, array['owner','admin','manager','finance']) then
    raise exception 'INSUFFICIENT_ROLE' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 or scale(p_amount) > 2 then
    raise exception 'INVALID_PAYMENT_AMOUNT' using errcode = '22023';
  end if;
  if p_paid_at is null then
    raise exception 'PAYMENT_DATE_REQUIRED' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_command_id::text, 0));

  select
    p.organization_id,
    p.installment_id,
    p.event_type,
    p.amount,
    p.paid_at,
    p.payment_reference,
    p.notes
  into
    v_existing_org,
    v_existing_installment,
    v_existing_type,
    v_existing_amount,
    v_existing_paid_at,
    v_existing_reference,
    v_existing_notes
  from public.payments p
  where p.id = p_command_id;

  if found then
    if v_existing_org <> p_organization_id
      or v_existing_installment <> p_installment_id
      or v_existing_type <> 'payment'
      or v_existing_amount <> p_amount
      or v_existing_paid_at <> p_paid_at
      or v_existing_reference is distinct from nullif(trim(p_payment_reference), '')
      or v_existing_notes is distinct from nullif(trim(p_notes), '')
    then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;

    return query
    select
      p_command_id,
      summary.installment_id,
      summary.net_paid_amount,
      summary.balance_amount,
      summary.payment_status
    from public.payable_installment_summary summary
    where summary.organization_id = p_organization_id
      and summary.installment_id = p_installment_id;
    return;
  end if;

  select i.payable_document_id, d.lifecycle_status
  into v_document_id, v_lifecycle
  from public.installments i
  join public.payable_documents d
    on d.id = i.payable_document_id
   and d.organization_id = i.organization_id
  where i.id = p_installment_id
    and i.organization_id = p_organization_id
  for update of i, d;

  if not found then
    raise exception 'INSTALLMENT_NOT_FOUND' using errcode = '23503';
  end if;
  if v_lifecycle <> 'active' then
    raise exception 'PAYABLE_DOCUMENT_NOT_ACTIVE' using errcode = '22023';
  end if;

  insert into public.payments(
    id,
    organization_id,
    installment_id,
    event_type,
    amount,
    paid_at,
    payment_reference,
    notes,
    responsible_user_id
  ) values (
    p_command_id,
    p_organization_id,
    p_installment_id,
    'payment',
    p_amount,
    p_paid_at,
    nullif(trim(p_payment_reference), ''),
    nullif(trim(p_notes), ''),
    v_user_id
  );

  insert into public.audit_logs(
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
    'payment.recorded',
    'payment',
    p_command_id,
    jsonb_build_object(
      'installment_id', p_installment_id,
      'amount', p_amount,
      'paid_at', p_paid_at,
      'document_id', v_document_id
    ),
    jsonb_build_object('source', 'record_installment_payment_rpc', 'command_id', p_command_id)
  );

  return query
  select
    p_command_id,
    summary.installment_id,
    summary.net_paid_amount,
    summary.balance_amount,
    summary.payment_status
  from public.payable_installment_summary summary
  where summary.organization_id = p_organization_id
    and summary.installment_id = p_installment_id;
end;
$$;

create or replace function public.reverse_installment_payment(
  p_command_id uuid,
  p_organization_id uuid,
  p_payment_id uuid,
  p_reversed_at timestamptz,
  p_reason text default null
)
returns table (
  reversal_id uuid,
  installment_id uuid,
  net_paid_amount numeric,
  balance_amount numeric,
  payment_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_org uuid;
  v_existing_installment uuid;
  v_existing_type text;
  v_existing_amount numeric(18,2);
  v_existing_paid_at timestamptz;
  v_existing_reason text;
  v_existing_reverses uuid;
  v_installment_id uuid;
  v_amount numeric(18,2);
  v_event_type text;
  v_lifecycle text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if not private.has_org_role(p_organization_id, array['owner','admin','manager','finance']) then
    raise exception 'INSUFFICIENT_ROLE' using errcode = '42501';
  end if;
  if p_reversed_at is null then
    raise exception 'REVERSAL_DATE_REQUIRED' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_command_id::text, 0));

  select
    p.organization_id,
    p.installment_id,
    p.event_type,
    p.amount,
    p.paid_at,
    p.notes,
    p.reverses_payment_id
  into
    v_existing_org,
    v_existing_installment,
    v_existing_type,
    v_existing_amount,
    v_existing_paid_at,
    v_existing_reason,
    v_existing_reverses
  from public.payments p
  where p.id = p_command_id;

  if found then
    if v_existing_org <> p_organization_id
      or v_existing_type <> 'reversal'
      or v_existing_paid_at <> p_reversed_at
      or v_existing_reason is distinct from nullif(trim(p_reason), '')
      or v_existing_reverses <> p_payment_id
    then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;

    return query
    select
      p_command_id,
      summary.installment_id,
      summary.net_paid_amount,
      summary.balance_amount,
      summary.payment_status
    from public.payable_installment_summary summary
    where summary.organization_id = p_organization_id
      and summary.installment_id = v_existing_installment;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('payment:' || p_payment_id::text, 0));

  select p.installment_id, p.amount, p.event_type, d.lifecycle_status
  into v_installment_id, v_amount, v_event_type, v_lifecycle
  from public.payments p
  join public.installments i
    on i.id = p.installment_id
   and i.organization_id = p.organization_id
  join public.payable_documents d
    on d.id = i.payable_document_id
   and d.organization_id = i.organization_id
  where p.id = p_payment_id
    and p.organization_id = p_organization_id
  for update of p, i, d;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND' using errcode = '23503';
  end if;
  if v_event_type <> 'payment' then
    raise exception 'PAYMENT_NOT_REVERSIBLE' using errcode = '22023';
  end if;
  if v_lifecycle <> 'active' then
    raise exception 'PAYABLE_DOCUMENT_NOT_ACTIVE' using errcode = '22023';
  end if;
  if exists (
    select 1
    from public.payments reversal
    where reversal.organization_id = p_organization_id
      and reversal.event_type = 'reversal'
      and reversal.reverses_payment_id = p_payment_id
  ) then
    raise exception 'PAYMENT_ALREADY_REVERSED' using errcode = '22023';
  end if;

  insert into public.payments(
    id,
    organization_id,
    installment_id,
    event_type,
    amount,
    paid_at,
    notes,
    responsible_user_id,
    reverses_payment_id
  ) values (
    p_command_id,
    p_organization_id,
    v_installment_id,
    'reversal',
    v_amount,
    p_reversed_at,
    nullif(trim(p_reason), ''),
    v_user_id,
    p_payment_id
  );

  insert into public.audit_logs(
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
    'payment.reversed',
    'payment',
    p_command_id,
    jsonb_build_object(
      'reverses_payment_id', p_payment_id,
      'installment_id', v_installment_id,
      'amount', v_amount,
      'reversed_at', p_reversed_at
    ),
    jsonb_build_object('source', 'reverse_installment_payment_rpc', 'command_id', p_command_id)
  );

  return query
  select
    p_command_id,
    summary.installment_id,
    summary.net_paid_amount,
    summary.balance_amount,
    summary.payment_status
  from public.payable_installment_summary summary
  where summary.organization_id = p_organization_id
    and summary.installment_id = v_installment_id;
end;
$$;

create or replace function public.cancel_payable_document(
  p_command_id uuid,
  p_organization_id uuid,
  p_payable_document_id uuid,
  p_reason text default null
)
returns table (
  payable_document_id uuid,
  lifecycle_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_document_id uuid;
  v_existing_reason text;
  v_lifecycle text;
  v_net_paid numeric(18,2);
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if not private.has_org_role(p_organization_id, array['owner','admin','manager','finance']) then
    raise exception 'INSUFFICIENT_ROLE' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_command_id::text, 0));

  select a.entity_id, a.after_data->>'reason'
  into v_existing_document_id, v_existing_reason
  from public.audit_logs a
  where a.organization_id = p_organization_id
    and a.action = 'payable_document.cancelled'
    and a.metadata->>'command_id' = p_command_id::text
  order by a.occurred_at desc
  limit 1;

  if found then
    if v_existing_document_id <> p_payable_document_id
      or v_existing_reason is distinct from nullif(trim(p_reason), '')
    then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;
    return query select p_payable_document_id, 'cancelled'::text;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('payable_document:' || p_payable_document_id::text, 0));

  select d.lifecycle_status
  into v_lifecycle
  from public.payable_documents d
  where d.id = p_payable_document_id
    and d.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'PAYABLE_DOCUMENT_NOT_FOUND' using errcode = '23503';
  end if;
  if v_lifecycle <> 'active' then
    raise exception 'PAYABLE_DOCUMENT_ALREADY_CANCELLED' using errcode = '22023';
  end if;

  select coalesce(sum(
    case when p.event_type = 'payment' then p.amount else -p.amount end
  ), 0::numeric)::numeric(18,2)
  into v_net_paid
  from public.payments p
  join public.installments i
    on i.id = p.installment_id
   and i.organization_id = p.organization_id
  where i.organization_id = p_organization_id
    and i.payable_document_id = p_payable_document_id;

  if v_net_paid <> 0 then
    raise exception 'PAYABLE_DOCUMENT_HAS_NET_PAYMENTS' using errcode = '22023';
  end if;

  update public.payable_documents
  set lifecycle_status = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
  where id = p_payable_document_id
    and organization_id = p_organization_id;

  insert into public.audit_logs(
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    metadata
  ) values (
    p_organization_id,
    v_user_id,
    'payable_document.cancelled',
    'payable_document',
    p_payable_document_id,
    jsonb_build_object('lifecycle_status', 'active'),
    jsonb_build_object('lifecycle_status', 'cancelled', 'reason', nullif(trim(p_reason), '')),
    jsonb_build_object('source', 'cancel_payable_document_rpc', 'command_id', p_command_id)
  );

  return query select p_payable_document_id, 'cancelled'::text;
end;
$$;

revoke all on function public.create_payable_document(uuid,uuid,uuid,uuid,uuid,text,text,text,text,date,text,jsonb) from public, anon;
revoke all on function public.record_installment_payment(uuid,uuid,uuid,numeric,timestamptz,text,text) from public, anon;
revoke all on function public.reverse_installment_payment(uuid,uuid,uuid,timestamptz,text) from public, anon;
revoke all on function public.cancel_payable_document(uuid,uuid,uuid,text) from public, anon;

grant execute on function public.create_payable_document(uuid,uuid,uuid,uuid,uuid,text,text,text,text,date,text,jsonb) to authenticated;
grant execute on function public.record_installment_payment(uuid,uuid,uuid,numeric,timestamptz,text,text) to authenticated;
grant execute on function public.reverse_installment_payment(uuid,uuid,uuid,timestamptz,text) to authenticated;
grant execute on function public.cancel_payable_document(uuid,uuid,uuid,text) to authenticated;
