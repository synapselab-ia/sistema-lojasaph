create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  supplier_id uuid not null,
  stock_location_id uuid not null,
  status text not null default 'draft'
    check (status in ('draft', 'ordered', 'partially_received', 'received', 'cancelled')),
  expected_delivery_date date,
  ordered_at timestamptz,
  cancelled_at timestamptz,
  responsible_user_id uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (supplier_id, organization_id)
    references public.suppliers(id, organization_id),
  foreign key (stock_location_id, organization_id)
    references public.stock_locations(id, organization_id)
);

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  purchase_order_id uuid not null,
  supplier_item_id uuid not null,
  stock_item_id uuid not null,
  ordered_quantity numeric(18,3) not null check (ordered_quantity > 0),
  received_quantity numeric(18,3) not null default 0 check (received_quantity >= 0),
  unit_price_snapshot numeric(18,2) not null check (unit_price_snapshot >= 0),
  purchase_unit_snapshot text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (purchase_order_id, supplier_item_id),
  check (received_quantity <= ordered_quantity),
  foreign key (purchase_order_id, organization_id)
    references public.purchase_orders(id, organization_id) on delete cascade,
  foreign key (supplier_item_id, organization_id)
    references public.supplier_items(id, organization_id),
  foreign key (stock_item_id, organization_id)
    references public.stock_items(id, organization_id)
);

create table public.purchase_receipts (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id),
  purchase_order_id uuid not null,
  received_at timestamptz not null default now(),
  responsible_user_id uuid references auth.users(id),
  notes text,
  request_items jsonb not null,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (purchase_order_id, organization_id)
    references public.purchase_orders(id, organization_id)
);

create table public.purchase_receipt_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  purchase_receipt_id uuid not null,
  purchase_order_item_id uuid not null,
  stock_movement_id uuid not null,
  quantity numeric(18,3) not null check (quantity > 0),
  unit_cost_snapshot numeric(18,2) not null check (unit_cost_snapshot >= 0),
  batch_code text,
  expiration_date date,
  created_at timestamptz not null default now(),
  unique (purchase_receipt_id, purchase_order_item_id),
  foreign key (purchase_receipt_id, organization_id)
    references public.purchase_receipts(id, organization_id) on delete cascade,
  foreign key (purchase_order_item_id, organization_id)
    references public.purchase_order_items(id, organization_id),
  foreign key (stock_movement_id, organization_id)
    references public.stock_movements(id, organization_id)
);

create index purchase_orders_org_status_idx
  on public.purchase_orders(organization_id, status, created_at desc);
create index purchase_orders_supplier_idx
  on public.purchase_orders(organization_id, supplier_id, created_at desc);
create index purchase_orders_expected_delivery_idx
  on public.purchase_orders(organization_id, expected_delivery_date)
  where expected_delivery_date is not null and status in ('ordered', 'partially_received');
create index purchase_order_items_order_idx
  on public.purchase_order_items(organization_id, purchase_order_id);
create index purchase_receipts_order_idx
  on public.purchase_receipts(organization_id, purchase_order_id, received_at desc);

alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.purchase_receipts enable row level security;
alter table public.purchase_receipt_items enable row level security;

grant select on public.purchase_orders,
                public.purchase_order_items,
                public.purchase_receipts,
                public.purchase_receipt_items
  to authenticated;
revoke insert, update, delete on public.purchase_orders,
                                 public.purchase_order_items,
                                 public.purchase_receipts,
                                 public.purchase_receipt_items
  from authenticated, anon;
revoke all on public.purchase_orders,
              public.purchase_order_items,
              public.purchase_receipts,
              public.purchase_receipt_items
  from anon;
grant all on public.purchase_orders,
             public.purchase_order_items,
             public.purchase_receipts,
             public.purchase_receipt_items
  to service_role;

create policy purchase_orders_select_member
  on public.purchase_orders for select to authenticated
  using (public.is_org_member(organization_id));
create policy purchase_order_items_select_member
  on public.purchase_order_items for select to authenticated
  using (public.is_org_member(organization_id));
create policy purchase_receipts_select_member
  on public.purchase_receipts for select to authenticated
  using (public.is_org_member(organization_id));
create policy purchase_receipt_items_select_member
  on public.purchase_receipt_items for select to authenticated
  using (public.is_org_member(organization_id));

create or replace function public.create_purchase_order(
  p_command_id uuid,
  p_organization_id uuid,
  p_supplier_id uuid,
  p_stock_location_id uuid,
  p_expected_delivery_date date,
  p_notes text,
  p_items jsonb
)
returns table (
  purchase_order_id uuid,
  purchase_order_status text,
  total_value numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_supplier_item_id uuid;
  v_stock_item_id uuid;
  v_purchase_unit text;
  v_quantity numeric(18,3);
  v_unit_price numeric(18,2);
  v_normalized_items jsonb;
  v_existing_items jsonb;
  v_existing_org uuid;
  v_existing_supplier uuid;
  v_existing_location uuid;
  v_existing_delivery date;
  v_existing_notes text;
  v_existing_status text;
  v_total numeric(18,2);
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_org_role(p_organization_id,array['owner','admin','manager','purchases']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then raise exception 'PURCHASE_ORDER_ITEMS_REQUIRED' using errcode='22023'; end if;
  if (select count(*) from jsonb_array_elements(p_items)) <> (select count(distinct value->>'supplier_item_id') from jsonb_array_elements(p_items)) then raise exception 'DUPLICATE_PURCHASE_ORDER_ITEM' using errcode='22023'; end if;

  select jsonb_agg(jsonb_build_object(
    'supplier_item_id', (value->>'supplier_item_id')::uuid,
    'quantity', (value->>'quantity')::numeric,
    'unit_price', (value->>'unit_price')::numeric
  ) order by (value->>'supplier_item_id')::uuid)
  into v_normalized_items
  from jsonb_array_elements(p_items);

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_command_id::text,0));

  select po.organization_id,po.supplier_id,po.stock_location_id,po.expected_delivery_date,po.notes,po.status
    into v_existing_org,v_existing_supplier,v_existing_location,v_existing_delivery,v_existing_notes,v_existing_status
  from public.purchase_orders po where po.id=p_command_id;

  if found then
    select jsonb_agg(jsonb_build_object(
      'supplier_item_id', item.supplier_item_id,
      'quantity', item.ordered_quantity,
      'unit_price', item.unit_price_snapshot
    ) order by item.supplier_item_id)
    into v_existing_items
    from public.purchase_order_items item
    where item.purchase_order_id=p_command_id and item.organization_id=p_organization_id;

    if v_existing_org<>p_organization_id
      or v_existing_supplier<>p_supplier_id
      or v_existing_location<>p_stock_location_id
      or v_existing_delivery is distinct from p_expected_delivery_date
      or v_existing_notes is distinct from nullif(trim(p_notes),'')
      or v_existing_items is distinct from v_normalized_items
    then raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode='23505'; end if;

    select coalesce(sum(item.ordered_quantity*item.unit_price_snapshot),0)
      into v_total
    from public.purchase_order_items item
    where item.purchase_order_id=p_command_id and item.organization_id=p_organization_id;
    return query select p_command_id,v_existing_status,v_total; return;
  end if;

  perform 1 from public.suppliers supplier where supplier.id=p_supplier_id and supplier.organization_id=p_organization_id and supplier.status='active';
  if not found then raise exception 'SUPPLIER_NOT_AVAILABLE' using errcode='23503'; end if;
  perform 1 from public.stock_locations location where location.id=p_stock_location_id and location.organization_id=p_organization_id and location.status='active';
  if not found then raise exception 'STOCK_LOCATION_NOT_AVAILABLE' using errcode='23503'; end if;

  insert into public.purchase_orders(id,organization_id,supplier_id,stock_location_id,status,expected_delivery_date,responsible_user_id,notes)
  values(p_command_id,p_organization_id,p_supplier_id,p_stock_location_id,'draft',p_expected_delivery_date,v_user_id,nullif(trim(p_notes),''));

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_supplier_item_id := (v_item->>'supplier_item_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;
    v_unit_price := (v_item->>'unit_price')::numeric;
    if v_quantity<=0 or scale(v_quantity)>3 then raise exception 'INVALID_PURCHASE_QUANTITY' using errcode='22023'; end if;
    if v_unit_price<0 or scale(v_unit_price)>2 then raise exception 'INVALID_PURCHASE_PRICE' using errcode='22023'; end if;

    select si.stock_item_id,si.purchase_unit
      into v_stock_item_id,v_purchase_unit
    from public.supplier_items si
    join public.stock_items stock on stock.id=si.stock_item_id and stock.organization_id=si.organization_id
    where si.id=v_supplier_item_id
      and si.organization_id=p_organization_id
      and si.supplier_id=p_supplier_id
      and si.active
      and stock.active;
    if not found then raise exception 'SUPPLIER_ITEM_NOT_AVAILABLE' using errcode='23503'; end if;

    insert into public.purchase_order_items(
      organization_id,purchase_order_id,supplier_item_id,stock_item_id,
      ordered_quantity,received_quantity,unit_price_snapshot,purchase_unit_snapshot
    ) values (
      p_organization_id,p_command_id,v_supplier_item_id,v_stock_item_id,
      v_quantity,0,v_unit_price,v_purchase_unit
    );
  end loop;

  select sum(item.ordered_quantity*item.unit_price_snapshot)
    into v_total
  from public.purchase_order_items item
  where item.purchase_order_id=p_command_id and item.organization_id=p_organization_id;

  insert into public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(p_organization_id,v_user_id,'purchase_order.created','purchase_order',p_command_id,
    jsonb_build_object('supplier_id',p_supplier_id,'stock_location_id',p_stock_location_id,'status','draft','total_value',v_total),
    jsonb_build_object('source','create_purchase_order_rpc','command_id',p_command_id));

  return query select p_command_id,'draft'::text,v_total;
end;
$$;

create or replace function public.issue_purchase_order(
  p_command_id uuid,
  p_organization_id uuid,
  p_purchase_order_id uuid
)
returns table(purchase_order_id uuid,purchase_order_status text,ordered_at timestamptz)
language plpgsql security definer set search_path=''
as $$
declare
  v_user_id uuid:=auth.uid(); v_status text; v_ordered_at timestamptz; v_existing_order_id uuid;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_org_role(p_organization_id,array['owner','admin','manager','purchases']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_command_id::text,0));
  select a.entity_id into v_existing_order_id from public.audit_logs a where a.organization_id=p_organization_id and a.action='purchase_order.issued' and a.metadata->>'command_id'=p_command_id::text order by a.occurred_at desc limit 1;
  if found then
    if v_existing_order_id<>p_purchase_order_id then raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode='23505'; end if;
    select po.status,po.ordered_at into v_status,v_ordered_at from public.purchase_orders po where po.id=p_purchase_order_id and po.organization_id=p_organization_id;
    return query select p_purchase_order_id,v_status,v_ordered_at; return;
  end if;
  select po.status into v_status from public.purchase_orders po where po.id=p_purchase_order_id and po.organization_id=p_organization_id for update;
  if not found then raise exception 'PURCHASE_ORDER_NOT_FOUND' using errcode='23503'; end if;
  if v_status<>'draft' then raise exception 'PURCHASE_ORDER_NOT_ISSUABLE' using errcode='22023'; end if;
  v_ordered_at:=now();
  update public.purchase_orders set status='ordered',ordered_at=v_ordered_at,updated_at=now() where id=p_purchase_order_id and organization_id=p_organization_id;
  insert into public.supplier_prices(organization_id,supplier_item_id,unit_price,observed_at,source)
  select p_organization_id,item.supplier_item_id,item.unit_price_snapshot,v_ordered_at,'purchase_order'
  from public.purchase_order_items item where item.purchase_order_id=p_purchase_order_id and item.organization_id=p_organization_id;
  insert into public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(p_organization_id,v_user_id,'purchase_order.issued','purchase_order',p_purchase_order_id,jsonb_build_object('status','ordered','ordered_at',v_ordered_at),jsonb_build_object('source','issue_purchase_order_rpc','command_id',p_command_id));
  return query select p_purchase_order_id,'ordered'::text,v_ordered_at;
end;
$$;

create or replace function public.receive_purchase_order(
  p_command_id uuid,
  p_organization_id uuid,
  p_purchase_order_id uuid,
  p_items jsonb,
  p_notes text default null
)
returns table(
  purchase_receipt_id uuid,
  purchase_order_id uuid,
  purchase_order_status text,
  received_line_count integer
)
language plpgsql security definer set search_path=''
as $$
declare
  v_user_id uuid:=auth.uid(); v_order_status text; v_stock_location_id uuid; v_normalized_items jsonb; v_existing_org uuid; v_existing_order uuid; v_existing_items jsonb; v_existing_notes text;
  v_item jsonb; v_order_item_id uuid; v_stock_item_id uuid; v_ordered_quantity numeric(18,3); v_received_quantity numeric(18,3); v_receive_quantity numeric(18,3); v_unit_cost numeric(18,2); v_track_batch boolean; v_track_expiration boolean;
  v_batch_code text; v_expiration_date date; v_balance_quantity numeric(18,3); v_balance_cost numeric(18,2); v_next_quantity numeric(18,3); v_next_cost numeric(18,2); v_movement_id uuid; v_movement_item_id uuid; v_batch_id uuid; v_line_count integer:=0; v_completed boolean;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_org_role(p_organization_id,array['owner','admin','manager','purchases','inventory']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'PURCHASE_RECEIPT_ITEMS_REQUIRED' using errcode='22023'; end if;
  if (select count(*) from jsonb_array_elements(p_items))<>(select count(distinct value->>'purchase_order_item_id') from jsonb_array_elements(p_items)) then raise exception 'DUPLICATE_PURCHASE_RECEIPT_ITEM' using errcode='22023'; end if;
  select jsonb_agg(jsonb_build_object(
    'purchase_order_item_id',(value->>'purchase_order_item_id')::uuid,
    'quantity',(value->>'quantity')::numeric,
    'batch_code',nullif(trim(value->>'batch_code'),''),
    'expiration_date',nullif(value->>'expiration_date','')::date
  ) order by (value->>'purchase_order_item_id')::uuid)
  into v_normalized_items from jsonb_array_elements(p_items);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_command_id::text,0));
  select r.organization_id,r.purchase_order_id,r.request_items,r.notes into v_existing_org,v_existing_order,v_existing_items,v_existing_notes from public.purchase_receipts r where r.id=p_command_id;
  if found then
    if v_existing_org<>p_organization_id or v_existing_order<>p_purchase_order_id or v_existing_items is distinct from v_normalized_items or v_existing_notes is distinct from nullif(trim(p_notes),'') then raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode='23505'; end if;
    select po.status into v_order_status from public.purchase_orders po where po.id=p_purchase_order_id and po.organization_id=p_organization_id;
    select count(*)::integer into v_line_count from public.purchase_receipt_items ri where ri.purchase_receipt_id=p_command_id and ri.organization_id=p_organization_id;
    return query select p_command_id,p_purchase_order_id,v_order_status,v_line_count; return;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('purchase_order:'||p_purchase_order_id::text,0));
  select po.status,po.stock_location_id into v_order_status,v_stock_location_id from public.purchase_orders po where po.id=p_purchase_order_id and po.organization_id=p_organization_id for update;
  if not found then raise exception 'PURCHASE_ORDER_NOT_FOUND' using errcode='23503'; end if;
  if v_order_status not in ('ordered','partially_received') then raise exception 'PURCHASE_ORDER_NOT_RECEIVABLE' using errcode='22023'; end if;
  insert into public.purchase_receipts(id,organization_id,purchase_order_id,responsible_user_id,notes,request_items)
  values(p_command_id,p_organization_id,p_purchase_order_id,v_user_id,nullif(trim(p_notes),''),v_normalized_items);

  for v_item in select value from jsonb_array_elements(v_normalized_items) loop
    v_order_item_id:=(v_item->>'purchase_order_item_id')::uuid;
    v_receive_quantity:=(v_item->>'quantity')::numeric;
    v_batch_code:=nullif(trim(v_item->>'batch_code'),'');
    v_expiration_date:=nullif(v_item->>'expiration_date','')::date;
    if v_receive_quantity<=0 or scale(v_receive_quantity)>3 then raise exception 'INVALID_PURCHASE_RECEIPT_QUANTITY' using errcode='22023'; end if;
    select poi.stock_item_id,poi.ordered_quantity,poi.received_quantity,poi.unit_price_snapshot,stock.track_batch,stock.track_expiration
    into v_stock_item_id,v_ordered_quantity,v_received_quantity,v_unit_cost,v_track_batch,v_track_expiration
    from public.purchase_order_items poi join public.stock_items stock on stock.id=poi.stock_item_id and stock.organization_id=poi.organization_id
    where poi.id=v_order_item_id and poi.purchase_order_id=p_purchase_order_id and poi.organization_id=p_organization_id for update of poi;
    if not found then raise exception 'PURCHASE_ORDER_ITEM_NOT_FOUND' using errcode='23503'; end if;
    if v_receive_quantity>v_ordered_quantity-v_received_quantity then raise exception 'PURCHASE_RECEIPT_EXCEEDS_PENDING' using errcode='22023'; end if;

    insert into public.inventory_balances(organization_id,stock_item_id,stock_location_id,quantity_on_hand,average_cost)
    values(p_organization_id,v_stock_item_id,v_stock_location_id,0,0)
    on conflict(organization_id,stock_item_id,stock_location_id) do nothing;
    select b.quantity_on_hand,b.average_cost into v_balance_quantity,v_balance_cost from public.inventory_balances b where b.organization_id=p_organization_id and b.stock_item_id=v_stock_item_id and b.stock_location_id=v_stock_location_id for update;
    v_next_quantity:=v_balance_quantity+v_receive_quantity;
    v_next_cost:=private.replenishment_average_cost(v_balance_quantity,v_balance_cost,v_receive_quantity,v_unit_cost);
    update public.inventory_balances b set quantity_on_hand=v_next_quantity,average_cost=v_next_cost,updated_at=now() where b.organization_id=p_organization_id and b.stock_item_id=v_stock_item_id and b.stock_location_id=v_stock_location_id;

    v_movement_id:=gen_random_uuid();
    insert into public.stock_movements(id,organization_id,movement_type,occurred_at,destination_location_id,responsible_user_id,reference_type,reference_id,reason_code,notes,status)
    values(v_movement_id,p_organization_id,'entry',now(),v_stock_location_id,v_user_id,'purchase_receipt',p_command_id,'purchase_receipt',nullif(trim(p_notes),''),'confirmed');
    v_movement_item_id:=gen_random_uuid();
    insert into public.stock_movement_items(id,organization_id,movement_id,stock_item_id,quantity,unit_cost_snapshot)
    values(v_movement_item_id,p_organization_id,v_movement_id,v_stock_item_id,v_receive_quantity,v_unit_cost);

    if v_track_batch or v_track_expiration or v_batch_code is not null or v_expiration_date is not null then
      v_batch_id:=gen_random_uuid();
      insert into public.inventory_batches(id,organization_id,stock_item_id,stock_location_id,batch_code,expiration_date,received_at,original_quantity,remaining_quantity,unit_cost,source_type,source_reference_id,status)
      values(v_batch_id,p_organization_id,v_stock_item_id,v_stock_location_id,v_batch_code,v_expiration_date,now(),v_receive_quantity,v_receive_quantity,v_unit_cost,'entry',p_command_id,'active');
      insert into public.stock_movement_batch_allocations(organization_id,movement_item_id,batch_id,quantity)
      values(p_organization_id,v_movement_item_id,v_batch_id,v_receive_quantity);
    end if;

    insert into public.purchase_receipt_items(organization_id,purchase_receipt_id,purchase_order_item_id,stock_movement_id,quantity,unit_cost_snapshot,batch_code,expiration_date)
    values(p_organization_id,p_command_id,v_order_item_id,v_movement_id,v_receive_quantity,v_unit_cost,v_batch_code,v_expiration_date);
    update public.purchase_order_items set received_quantity=received_quantity+v_receive_quantity,updated_at=now() where id=v_order_item_id and organization_id=p_organization_id;
    v_line_count:=v_line_count+1;
  end loop;

  select not exists(select 1 from public.purchase_order_items item where item.purchase_order_id=p_purchase_order_id and item.organization_id=p_organization_id and item.received_quantity<item.ordered_quantity) into v_completed;
  v_order_status:=case when v_completed then 'received' else 'partially_received' end;
  update public.purchase_orders set status=v_order_status,updated_at=now() where id=p_purchase_order_id and organization_id=p_organization_id;
  insert into public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,after_data,metadata)
  values(p_organization_id,v_user_id,'purchase_order.received','purchase_receipt',p_command_id,jsonb_build_object('purchase_order_id',p_purchase_order_id,'status',v_order_status,'line_count',v_line_count),jsonb_build_object('source','receive_purchase_order_rpc','command_id',p_command_id));
  return query select p_command_id,p_purchase_order_id,v_order_status,v_line_count;
end;
$$;

create or replace function public.cancel_purchase_order(
  p_command_id uuid,p_organization_id uuid,p_purchase_order_id uuid,p_reason text default null
)
returns table(purchase_order_id uuid,purchase_order_status text)
language plpgsql security definer set search_path=''
as $$
declare v_user_id uuid:=auth.uid(); v_status text; v_existing_order_id uuid; v_existing_reason text;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  if not private.has_org_role(p_organization_id,array['owner','admin','manager','purchases']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_command_id::text,0));
  select a.entity_id,a.after_data->>'reason' into v_existing_order_id,v_existing_reason from public.audit_logs a where a.organization_id=p_organization_id and a.action='purchase_order.cancelled' and a.metadata->>'command_id'=p_command_id::text order by a.occurred_at desc limit 1;
  if found then
    if v_existing_order_id<>p_purchase_order_id or v_existing_reason is distinct from nullif(trim(p_reason),'') then raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode='23505'; end if;
    return query select p_purchase_order_id,'cancelled'::text; return;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('purchase_order:'||p_purchase_order_id::text,0));
  select po.status into v_status from public.purchase_orders po where po.id=p_purchase_order_id and po.organization_id=p_organization_id for update;
  if not found then raise exception 'PURCHASE_ORDER_NOT_FOUND' using errcode='23503'; end if;
  if v_status='received' then raise exception 'RECEIVED_PURCHASE_ORDER_IMMUTABLE' using errcode='22023'; end if;
  if v_status='cancelled' then raise exception 'PURCHASE_ORDER_ALREADY_CANCELLED' using errcode='22023'; end if;
  update public.purchase_orders set status='cancelled',cancelled_at=now(),updated_at=now() where id=p_purchase_order_id and organization_id=p_organization_id;
  insert into public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,before_data,after_data,metadata)
  values(p_organization_id,v_user_id,'purchase_order.cancelled','purchase_order',p_purchase_order_id,jsonb_build_object('status',v_status),jsonb_build_object('status','cancelled','reason',nullif(trim(p_reason),'')),jsonb_build_object('source','cancel_purchase_order_rpc','command_id',p_command_id));
  return query select p_purchase_order_id,'cancelled'::text;
end;
$$;

revoke all on function public.create_purchase_order(uuid,uuid,uuid,uuid,date,text,jsonb) from public,anon;
revoke all on function public.issue_purchase_order(uuid,uuid,uuid) from public,anon;
revoke all on function public.receive_purchase_order(uuid,uuid,uuid,jsonb,text) from public,anon;
revoke all on function public.cancel_purchase_order(uuid,uuid,uuid,text) from public,anon;
grant execute on function public.create_purchase_order(uuid,uuid,uuid,uuid,date,text,jsonb) to authenticated;
grant execute on function public.issue_purchase_order(uuid,uuid,uuid) to authenticated;
grant execute on function public.receive_purchase_order(uuid,uuid,uuid,jsonb,text) to authenticated;
grant execute on function public.cancel_purchase_order(uuid,uuid,uuid,text) to authenticated;
