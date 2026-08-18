create table public.cash_registers (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  unit_id uuid not null,
  name text not null check (length(trim(name)) > 0),
  code text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, unit_id, code),
  foreign key (unit_id, organization_id)
    references public.units(id, organization_id) on delete restrict
);

create table public.payment_methods (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null check (length(trim(code)) > 0),
  name text not null check (length(trim(name)) > 0),
  method_kind text not null check (method_kind in ('cash', 'card', 'instant', 'voucher', 'other')),
  affects_cash_drawer boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, code)
);

create table public.fee_rules (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  payment_method_id uuid not null,
  valid_from date not null,
  valid_to date,
  percent_fee numeric(9,6) not null default 0 check (percent_fee >= 0),
  fixed_fee numeric(18,2) not null default 0 check (fixed_fee >= 0),
  label text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (payment_method_id, organization_id)
    references public.payment_methods(id, organization_id) on delete restrict,
  check (valid_to is null or valid_to >= valid_from)
);

create table public.cash_sessions (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  cash_register_id uuid not null,
  business_date date not null,
  sequence integer not null default 1 check (sequence >= 1),
  opening_float numeric(18,2) not null default 0 check (opening_float >= 0),
  status text not null default 'open' check (status in ('open', 'closed', 'cancelled')),
  expected_cash_amount numeric(18,2),
  counted_cash_amount numeric(18,2),
  cash_difference numeric(18,2),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  cancelled_at timestamptz,
  responsible_user_id uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (cash_register_id, business_date, sequence),
  foreign key (cash_register_id, organization_id)
    references public.cash_registers(id, organization_id) on delete restrict,
  check (
    (status = 'open' and closed_at is null and cancelled_at is null and expected_cash_amount is null and counted_cash_amount is null and cash_difference is null)
    or (status = 'closed' and closed_at is not null and cancelled_at is null and expected_cash_amount is not null and counted_cash_amount is not null and cash_difference is not null)
    or (status = 'cancelled' and cancelled_at is not null and closed_at is null)
  )
);

create table public.payment_method_totals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  cash_session_id uuid not null,
  payment_method_id uuid not null,
  gross_amount numeric(18,2) not null check (gross_amount >= 0),
  fee_amount numeric(18,2) not null default 0 check (fee_amount >= 0),
  net_amount numeric(18,2) generated always as (gross_amount - fee_amount) stored,
  fee_rule_id uuid,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (cash_session_id, payment_method_id),
  foreign key (cash_session_id, organization_id)
    references public.cash_sessions(id, organization_id) on delete restrict,
  foreign key (payment_method_id, organization_id)
    references public.payment_methods(id, organization_id) on delete restrict,
  foreign key (fee_rule_id, organization_id)
    references public.fee_rules(id, organization_id) on delete restrict
);

create table public.cash_movements (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  cash_session_id uuid not null,
  movement_type text not null check (movement_type in ('cash_in', 'cash_out', 'employee_consumption')),
  amount numeric(18,2) not null check (amount > 0),
  occurred_at timestamptz not null,
  reason text,
  responsible_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (cash_session_id, organization_id)
    references public.cash_sessions(id, organization_id) on delete restrict
);

create index cash_registers_org_unit_idx on public.cash_registers(organization_id, unit_id, status);
create index payment_methods_org_status_idx on public.payment_methods(organization_id, status, method_kind);
create index fee_rules_method_validity_idx on public.fee_rules(organization_id, payment_method_id, valid_from desc, valid_to);
create index cash_sessions_org_date_idx on public.cash_sessions(organization_id, business_date desc, status);
create index cash_sessions_register_idx on public.cash_sessions(organization_id, cash_register_id, business_date desc);
create index payment_method_totals_session_idx on public.payment_method_totals(organization_id, cash_session_id);
create index cash_movements_session_idx on public.cash_movements(organization_id, cash_session_id, occurred_at);

create trigger cash_registers_updated_at before update on public.cash_registers
for each row execute function public.set_updated_at();
create trigger payment_methods_updated_at before update on public.payment_methods
for each row execute function public.set_updated_at();
create trigger cash_sessions_updated_at before update on public.cash_sessions
for each row execute function public.set_updated_at();
create trigger payment_method_totals_updated_at before update on public.payment_method_totals
for each row execute function public.set_updated_at();

alter table public.cash_registers enable row level security;
alter table public.payment_methods enable row level security;
alter table public.fee_rules enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.payment_method_totals enable row level security;
alter table public.cash_movements enable row level security;

grant select on public.cash_registers,
                public.payment_methods,
                public.fee_rules,
                public.cash_sessions,
                public.payment_method_totals,
                public.cash_movements
  to authenticated;
revoke insert, update, delete on public.cash_registers,
                                 public.payment_methods,
                                 public.fee_rules,
                                 public.cash_sessions,
                                 public.payment_method_totals,
                                 public.cash_movements
  from authenticated, anon;
revoke all on public.cash_registers,
              public.payment_methods,
              public.fee_rules,
              public.cash_sessions,
              public.payment_method_totals,
              public.cash_movements
  from anon;
grant all on public.cash_registers,
             public.payment_methods,
             public.fee_rules,
             public.cash_sessions,
             public.payment_method_totals,
             public.cash_movements
  to service_role;

create policy cash_registers_select_member on public.cash_registers for select to authenticated using (public.is_org_member(organization_id));
create policy payment_methods_select_member on public.payment_methods for select to authenticated using (public.is_org_member(organization_id));
create policy fee_rules_select_member on public.fee_rules for select to authenticated using (public.is_org_member(organization_id));
create policy cash_sessions_select_member on public.cash_sessions for select to authenticated using (public.is_org_member(organization_id));
create policy payment_method_totals_select_member on public.payment_method_totals for select to authenticated using (public.is_org_member(organization_id));
create policy cash_movements_select_member on public.cash_movements for select to authenticated using (public.is_org_member(organization_id));

create or replace function public.create_cash_register(
  p_command_id uuid,
  p_organization_id uuid,
  p_unit_id uuid,
  p_name text,
  p_code text default null
)
returns table(cash_register_id uuid, register_status text)
language plpgsql security definer set search_path=''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_org uuid;
  v_existing_unit uuid;
  v_existing_name text;
  v_existing_code text;
  v_existing_status text;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_org_role(p_organization_id,array['owner','admin','manager']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
  if p_name is null or length(trim(p_name))=0 then raise exception 'CASH_REGISTER_NAME_REQUIRED' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_command_id::text,0));

  select organization_id,unit_id,name,code,status into v_existing_org,v_existing_unit,v_existing_name,v_existing_code,v_existing_status
  from public.cash_registers where id=p_command_id;
  if found then
    if v_existing_org<>p_organization_id or v_existing_unit<>p_unit_id or v_existing_name<>trim(p_name) or v_existing_code is distinct from nullif(trim(p_code),'') then raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode='23505'; end if;
    return query select p_command_id,v_existing_status; return;
  end if;

  perform 1 from public.units where id=p_unit_id and organization_id=p_organization_id and status='active';
  if not found then raise exception 'UNIT_NOT_AVAILABLE' using errcode='23503'; end if;
  insert into public.cash_registers(id,organization_id,unit_id,name,code,status)
  values(p_command_id,p_organization_id,p_unit_id,trim(p_name),nullif(trim(p_code),''),'active');
  insert into public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(p_organization_id,v_user_id,'cash_register.created','cash_register',p_command_id,jsonb_build_object('unit_id',p_unit_id,'name',trim(p_name),'code',nullif(trim(p_code),'')),jsonb_build_object('source','create_cash_register_rpc','command_id',p_command_id));
  return query select p_command_id,'active'::text;
end;
$$;

create or replace function public.create_payment_method(
  p_command_id uuid,
  p_organization_id uuid,
  p_code text,
  p_name text,
  p_method_kind text,
  p_affects_cash_drawer boolean default false
)
returns table(payment_method_id uuid, method_status text)
language plpgsql security definer set search_path=''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_org uuid; v_existing_code text; v_existing_name text; v_existing_kind text; v_existing_affects boolean; v_existing_status text;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_org_role(p_organization_id,array['owner','admin','manager']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
  if p_code is null or length(trim(p_code))=0 or p_name is null or length(trim(p_name))=0 then raise exception 'PAYMENT_METHOD_IDENTITY_REQUIRED' using errcode='22023'; end if;
  if p_method_kind not in ('cash','card','instant','voucher','other') then raise exception 'INVALID_PAYMENT_METHOD_KIND' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_command_id::text,0));
  select organization_id,code,name,method_kind,affects_cash_drawer,status into v_existing_org,v_existing_code,v_existing_name,v_existing_kind,v_existing_affects,v_existing_status from public.payment_methods where id=p_command_id;
  if found then
    if v_existing_org<>p_organization_id or v_existing_code<>lower(trim(p_code)) or v_existing_name<>trim(p_name) or v_existing_kind<>p_method_kind or v_existing_affects<>coalesce(p_affects_cash_drawer,false) then raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode='23505'; end if;
    return query select p_command_id,v_existing_status; return;
  end if;
  insert into public.payment_methods(id,organization_id,code,name,method_kind,affects_cash_drawer,status)
  values(p_command_id,p_organization_id,lower(trim(p_code)),trim(p_name),p_method_kind,coalesce(p_affects_cash_drawer,false),'active');
  insert into public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(p_organization_id,v_user_id,'payment_method.created','payment_method',p_command_id,jsonb_build_object('code',lower(trim(p_code)),'name',trim(p_name),'method_kind',p_method_kind,'affects_cash_drawer',coalesce(p_affects_cash_drawer,false)),jsonb_build_object('source','create_payment_method_rpc','command_id',p_command_id));
  return query select p_command_id,'active'::text;
end;
$$;

create or replace function public.create_fee_rule(
  p_command_id uuid,
  p_organization_id uuid,
  p_payment_method_id uuid,
  p_valid_from date,
  p_valid_to date,
  p_percent_fee numeric,
  p_fixed_fee numeric,
  p_label text default null
)
returns table(fee_rule_id uuid, rule_status text)
language plpgsql security definer set search_path=''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.fee_rules%rowtype;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_org_role(p_organization_id,array['owner','admin','manager']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
  if p_valid_from is null or (p_valid_to is not null and p_valid_to<p_valid_from) then raise exception 'INVALID_FEE_RULE_DATES' using errcode='22023'; end if;
  if p_percent_fee is null or p_percent_fee<0 or p_fixed_fee is null or p_fixed_fee<0 then raise exception 'INVALID_FEE_RULE_VALUE' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_command_id::text,0));
  select * into v_existing from public.fee_rules where id=p_command_id;
  if found then
    if v_existing.organization_id<>p_organization_id or v_existing.payment_method_id<>p_payment_method_id or v_existing.valid_from<>p_valid_from or v_existing.valid_to is distinct from p_valid_to or v_existing.percent_fee<>p_percent_fee or v_existing.fixed_fee<>p_fixed_fee or v_existing.label is distinct from nullif(trim(p_label),'') then raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode='23505'; end if;
    return query select p_command_id,v_existing.status; return;
  end if;
  perform 1 from public.payment_methods where id=p_payment_method_id and organization_id=p_organization_id and status='active';
  if not found then raise exception 'PAYMENT_METHOD_NOT_AVAILABLE' using errcode='23503'; end if;
  insert into public.fee_rules(id,organization_id,payment_method_id,valid_from,valid_to,percent_fee,fixed_fee,label,status)
  values(p_command_id,p_organization_id,p_payment_method_id,p_valid_from,p_valid_to,p_percent_fee,p_fixed_fee,nullif(trim(p_label),''),'active');
  insert into public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(p_organization_id,v_user_id,'fee_rule.created','fee_rule',p_command_id,jsonb_build_object('payment_method_id',p_payment_method_id,'valid_from',p_valid_from,'valid_to',p_valid_to,'percent_fee',p_percent_fee,'fixed_fee',p_fixed_fee),jsonb_build_object('source','create_fee_rule_rpc','command_id',p_command_id));
  return query select p_command_id,'active'::text;
end;
$$;

create or replace function public.open_cash_session(
  p_command_id uuid,
  p_organization_id uuid,
  p_cash_register_id uuid,
  p_business_date date,
  p_sequence integer,
  p_opening_float numeric,
  p_notes text default null
)
returns table(cash_session_id uuid, session_status text)
language plpgsql security definer set search_path=''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.cash_sessions%rowtype;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_org_role(p_organization_id,array['owner','admin','manager','cashier']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
  if p_business_date is null or p_sequence is null or p_sequence<1 or p_opening_float is null or p_opening_float<0 or scale(p_opening_float)>2 then raise exception 'INVALID_CASH_SESSION_OPENING' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_command_id::text,0));
  select * into v_existing from public.cash_sessions where id=p_command_id;
  if found then
    if v_existing.organization_id<>p_organization_id or v_existing.cash_register_id<>p_cash_register_id or v_existing.business_date<>p_business_date or v_existing.sequence<>p_sequence or v_existing.opening_float<>p_opening_float or v_existing.notes is distinct from nullif(trim(p_notes),'') then raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode='23505'; end if;
    return query select p_command_id,v_existing.status; return;
  end if;
  perform 1 from public.cash_registers where id=p_cash_register_id and organization_id=p_organization_id and status='active';
  if not found then raise exception 'CASH_REGISTER_NOT_AVAILABLE' using errcode='23503'; end if;
  insert into public.cash_sessions(id,organization_id,cash_register_id,business_date,sequence,opening_float,status,responsible_user_id,notes)
  values(p_command_id,p_organization_id,p_cash_register_id,p_business_date,p_sequence,p_opening_float,'open',v_user_id,nullif(trim(p_notes),''));
  insert into public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(p_organization_id,v_user_id,'cash_session.opened','cash_session',p_command_id,jsonb_build_object('cash_register_id',p_cash_register_id,'business_date',p_business_date,'sequence',p_sequence,'opening_float',p_opening_float),jsonb_build_object('source','open_cash_session_rpc','command_id',p_command_id));
  return query select p_command_id,'open'::text;
end;
$$;

create or replace function public.set_cash_payment_total(
  p_command_id uuid,
  p_organization_id uuid,
  p_cash_session_id uuid,
  p_payment_method_id uuid,
  p_gross_amount numeric,
  p_fee_amount numeric default null,
  p_fee_rule_id uuid default null
)
returns table(payment_total_id uuid, gross_amount numeric, fee_amount numeric, net_amount numeric)
language plpgsql security definer set search_path=''
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text; v_business_date date; v_fee numeric(18,2); v_rule public.fee_rules%rowtype; v_existing_id uuid; v_existing_payload jsonb; v_payload jsonb;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_org_role(p_organization_id,array['owner','admin','manager','cashier']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
  if p_gross_amount is null or p_gross_amount<0 or scale(p_gross_amount)>2 or (p_fee_amount is not null and (p_fee_amount<0 or scale(p_fee_amount)>2)) then raise exception 'INVALID_PAYMENT_TOTAL' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_command_id::text,0));
  select a.entity_id,a.after_data into v_existing_id,v_existing_payload from public.audit_logs a where a.organization_id=p_organization_id and a.action='cash_payment_total.set' and a.metadata->>'command_id'=p_command_id::text order by a.occurred_at desc limit 1;

  select status,business_date into v_status,v_business_date from public.cash_sessions where id=p_cash_session_id and organization_id=p_organization_id for update;
  if not found then raise exception 'CASH_SESSION_NOT_FOUND' using errcode='23503'; end if;
  if v_status<>'open' then raise exception 'CASH_SESSION_NOT_OPEN' using errcode='22023'; end if;
  perform 1 from public.payment_methods where id=p_payment_method_id and organization_id=p_organization_id and status='active';
  if not found then raise exception 'PAYMENT_METHOD_NOT_AVAILABLE' using errcode='23503'; end if;

  if p_fee_amount is not null then
    v_fee:=p_fee_amount;
  elsif p_fee_rule_id is not null then
    select * into v_rule from public.fee_rules where id=p_fee_rule_id and organization_id=p_organization_id and payment_method_id=p_payment_method_id and status='active' and valid_from<=v_business_date and (valid_to is null or valid_to>=v_business_date);
    if not found then raise exception 'FEE_RULE_NOT_AVAILABLE' using errcode='23503'; end if;
    v_fee:=round(p_gross_amount*v_rule.percent_fee/100+v_rule.fixed_fee,2);
  else
    v_fee:=0;
  end if;

  v_payload:=jsonb_build_object('cash_session_id',p_cash_session_id,'payment_method_id',p_payment_method_id,'gross_amount',p_gross_amount,'fee_amount',v_fee,'fee_rule_id',p_fee_rule_id);
  if v_existing_id is not null then
    if v_existing_payload is distinct from v_payload then raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode='23505'; end if;
    return query select t.id,t.gross_amount,t.fee_amount,t.net_amount from public.payment_method_totals t where t.organization_id=p_organization_id and t.cash_session_id=p_cash_session_id and t.payment_method_id=p_payment_method_id;
    return;
  end if;

  insert into public.payment_method_totals(organization_id,cash_session_id,payment_method_id,gross_amount,fee_amount,fee_rule_id,updated_by_user_id)
  values(p_organization_id,p_cash_session_id,p_payment_method_id,p_gross_amount,v_fee,p_fee_rule_id,v_user_id)
  on conflict(cash_session_id,payment_method_id) do update set gross_amount=excluded.gross_amount,fee_amount=excluded.fee_amount,fee_rule_id=excluded.fee_rule_id,updated_by_user_id=excluded.updated_by_user_id,updated_at=now()
  returning id into v_existing_id;
  insert into public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(p_organization_id,v_user_id,'cash_payment_total.set','payment_method_total',v_existing_id,v_payload,jsonb_build_object('source','set_cash_payment_total_rpc','command_id',p_command_id));
  return query select t.id,t.gross_amount,t.fee_amount,t.net_amount from public.payment_method_totals t where t.id=v_existing_id and t.organization_id=p_organization_id;
end;
$$;

create or replace function public.record_cash_movement(
  p_command_id uuid,
  p_organization_id uuid,
  p_cash_session_id uuid,
  p_movement_type text,
  p_amount numeric,
  p_occurred_at timestamptz,
  p_reason text default null
)
returns table(cash_movement_id uuid, movement_type text, amount numeric)
language plpgsql security definer set search_path=''
as $$
declare
  v_user_id uuid:=auth.uid(); v_existing public.cash_movements%rowtype; v_status text;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_org_role(p_organization_id,array['owner','admin','manager','cashier']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
  if p_movement_type not in ('cash_in','cash_out','employee_consumption') or p_amount is null or p_amount<=0 or scale(p_amount)>2 or p_occurred_at is null then raise exception 'INVALID_CASH_MOVEMENT' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_command_id::text,0));
  select * into v_existing from public.cash_movements where id=p_command_id;
  if found then
    if v_existing.organization_id<>p_organization_id or v_existing.cash_session_id<>p_cash_session_id or v_existing.movement_type<>p_movement_type or v_existing.amount<>p_amount or v_existing.occurred_at<>p_occurred_at or v_existing.reason is distinct from nullif(trim(p_reason),'') then raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode='23505'; end if;
    return query select p_command_id,v_existing.movement_type,v_existing.amount; return;
  end if;
  select status into v_status from public.cash_sessions where id=p_cash_session_id and organization_id=p_organization_id for update;
  if not found then raise exception 'CASH_SESSION_NOT_FOUND' using errcode='23503'; end if;
  if v_status<>'open' then raise exception 'CASH_SESSION_NOT_OPEN' using errcode='22023'; end if;
  insert into public.cash_movements(id,organization_id,cash_session_id,movement_type,amount,occurred_at,reason,responsible_user_id)
  values(p_command_id,p_organization_id,p_cash_session_id,p_movement_type,p_amount,p_occurred_at,nullif(trim(p_reason),''),v_user_id);
  insert into public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(p_organization_id,v_user_id,'cash_movement.recorded','cash_movement',p_command_id,jsonb_build_object('cash_session_id',p_cash_session_id,'movement_type',p_movement_type,'amount',p_amount,'occurred_at',p_occurred_at),jsonb_build_object('source','record_cash_movement_rpc','command_id',p_command_id));
  return query select p_command_id,p_movement_type,p_amount;
end;
$$;

create or replace function public.close_cash_session(
  p_command_id uuid,
  p_organization_id uuid,
  p_cash_session_id uuid,
  p_counted_cash_amount numeric,
  p_notes text default null
)
returns table(cash_session_id uuid, expected_cash_amount numeric, counted_cash_amount numeric, cash_difference numeric, session_status text)
language plpgsql security definer set search_path=''
as $$
declare
  v_user_id uuid:=auth.uid(); v_status text; v_opening numeric(18,2); v_expected numeric(18,2); v_existing_session uuid; v_existing_counted numeric(18,2); v_existing_notes text;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_org_role(p_organization_id,array['owner','admin','manager','cashier']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
  if p_counted_cash_amount is null or p_counted_cash_amount<0 or scale(p_counted_cash_amount)>2 then raise exception 'INVALID_COUNTED_CASH_AMOUNT' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_command_id::text,0));
  select a.entity_id,(a.after_data->>'counted_cash_amount')::numeric,a.after_data->>'notes' into v_existing_session,v_existing_counted,v_existing_notes from public.audit_logs a where a.organization_id=p_organization_id and a.action='cash_session.closed' and a.metadata->>'command_id'=p_command_id::text order by a.occurred_at desc limit 1;
  if v_existing_session is not null then
    if v_existing_session<>p_cash_session_id or v_existing_counted<>p_counted_cash_amount or v_existing_notes is distinct from nullif(trim(p_notes),'') then raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode='23505'; end if;
    return query select s.id,s.expected_cash_amount,s.counted_cash_amount,s.cash_difference,s.status from public.cash_sessions s where s.id=p_cash_session_id and s.organization_id=p_organization_id;
    return;
  end if;

  select status,opening_float into v_status,v_opening from public.cash_sessions where id=p_cash_session_id and organization_id=p_organization_id for update;
  if not found then raise exception 'CASH_SESSION_NOT_FOUND' using errcode='23503'; end if;
  if v_status<>'open' then raise exception 'CASH_SESSION_NOT_OPEN' using errcode='22023'; end if;

  select (
    v_opening
    + coalesce((select sum(t.gross_amount) from public.payment_method_totals t join public.payment_methods m on m.id=t.payment_method_id and m.organization_id=t.organization_id where t.organization_id=p_organization_id and t.cash_session_id=p_cash_session_id and m.affects_cash_drawer),0)
    + coalesce((select sum(case when cm.movement_type='cash_in' then cm.amount when cm.movement_type='cash_out' then -cm.amount else 0 end) from public.cash_movements cm where cm.organization_id=p_organization_id and cm.cash_session_id=p_cash_session_id),0)
  )::numeric(18,2) into v_expected;

  update public.cash_sessions set status='closed',expected_cash_amount=v_expected,counted_cash_amount=p_counted_cash_amount,cash_difference=(p_counted_cash_amount-v_expected)::numeric(18,2),closed_at=now(),notes=coalesce(nullif(trim(p_notes),''),notes),updated_at=now() where id=p_cash_session_id and organization_id=p_organization_id;
  insert into public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(p_organization_id,v_user_id,'cash_session.closed','cash_session',p_cash_session_id,jsonb_build_object('expected_cash_amount',v_expected,'counted_cash_amount',p_counted_cash_amount,'cash_difference',p_counted_cash_amount-v_expected,'notes',nullif(trim(p_notes),'')),jsonb_build_object('source','close_cash_session_rpc','command_id',p_command_id));
  return query select s.id,s.expected_cash_amount,s.counted_cash_amount,s.cash_difference,s.status from public.cash_sessions s where s.id=p_cash_session_id and s.organization_id=p_organization_id;
end;
$$;

create or replace function public.cancel_cash_session(
  p_command_id uuid,
  p_organization_id uuid,
  p_cash_session_id uuid,
  p_reason text default null
)
returns table(cash_session_id uuid, session_status text)
language plpgsql security definer set search_path=''
as $$
declare
  v_user_id uuid:=auth.uid(); v_existing_session uuid; v_existing_reason text; v_status text;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_org_role(p_organization_id,array['owner','admin','manager','cashier']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_command_id::text,0));
  select a.entity_id,a.after_data->>'reason' into v_existing_session,v_existing_reason from public.audit_logs a where a.organization_id=p_organization_id and a.action='cash_session.cancelled' and a.metadata->>'command_id'=p_command_id::text order by a.occurred_at desc limit 1;
  if v_existing_session is not null then
    if v_existing_session<>p_cash_session_id or v_existing_reason is distinct from nullif(trim(p_reason),'') then raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode='23505'; end if;
    return query select p_cash_session_id,'cancelled'::text; return;
  end if;
  select status into v_status from public.cash_sessions where id=p_cash_session_id and organization_id=p_organization_id for update;
  if not found then raise exception 'CASH_SESSION_NOT_FOUND' using errcode='23503'; end if;
  if v_status<>'open' then raise exception 'CASH_SESSION_NOT_OPEN' using errcode='22023'; end if;
  update public.cash_sessions set status='cancelled',cancelled_at=now(),notes=coalesce(nullif(trim(p_reason),''),notes),updated_at=now() where id=p_cash_session_id and organization_id=p_organization_id;
  insert into public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(p_organization_id,v_user_id,'cash_session.cancelled','cash_session',p_cash_session_id,jsonb_build_object('reason',nullif(trim(p_reason),'')),jsonb_build_object('source','cancel_cash_session_rpc','command_id',p_command_id));
  return query select p_cash_session_id,'cancelled'::text;
end;
$$;

revoke all on function public.create_cash_register(uuid,uuid,uuid,text,text) from public,anon;
revoke all on function public.create_payment_method(uuid,uuid,text,text,text,boolean) from public,anon;
revoke all on function public.create_fee_rule(uuid,uuid,uuid,date,date,numeric,numeric,text) from public,anon;
revoke all on function public.open_cash_session(uuid,uuid,uuid,date,integer,numeric,text) from public,anon;
revoke all on function public.set_cash_payment_total(uuid,uuid,uuid,uuid,numeric,numeric,uuid) from public,anon;
revoke all on function public.record_cash_movement(uuid,uuid,uuid,text,numeric,timestamptz,text) from public,anon;
revoke all on function public.close_cash_session(uuid,uuid,uuid,numeric,text) from public,anon;
revoke all on function public.cancel_cash_session(uuid,uuid,uuid,text) from public,anon;

grant execute on function public.create_cash_register(uuid,uuid,uuid,text,text) to authenticated;
grant execute on function public.create_payment_method(uuid,uuid,text,text,text,boolean) to authenticated;
grant execute on function public.create_fee_rule(uuid,uuid,uuid,date,date,numeric,numeric,text) to authenticated;
grant execute on function public.open_cash_session(uuid,uuid,uuid,date,integer,numeric,text) to authenticated;
grant execute on function public.set_cash_payment_total(uuid,uuid,uuid,uuid,numeric,numeric,uuid) to authenticated;
grant execute on function public.record_cash_movement(uuid,uuid,uuid,text,numeric,timestamptz,text) to authenticated;
grant execute on function public.close_cash_session(uuid,uuid,uuid,numeric,text) to authenticated;
grant execute on function public.cancel_cash_session(uuid,uuid,uuid,text) to authenticated;
