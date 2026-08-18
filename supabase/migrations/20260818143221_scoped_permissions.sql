-- Fase 14: make Business/Unit/Sector membership scopes effective without changing role names.

create or replace function private.validate_membership_scope_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unit_business uuid;
  v_sector_unit uuid;
  v_sector_business uuid;
begin
  if new.unit_id is not null then
    select u.business_id into v_unit_business
    from public.units u
    where u.id = new.unit_id and u.organization_id = new.organization_id;
    if not found then
      raise exception 'MEMBERSHIP_UNIT_NOT_AVAILABLE' using errcode = '23503';
    end if;
    if new.business_id is not null and new.business_id <> v_unit_business then
      raise exception 'MEMBERSHIP_SCOPE_HIERARCHY_MISMATCH' using errcode = '23514';
    end if;
  end if;

  if new.sector_id is not null then
    select s.unit_id, u.business_id into v_sector_unit, v_sector_business
    from public.sectors s
    join public.units u on u.id = s.unit_id and u.organization_id = s.organization_id
    where s.id = new.sector_id and s.organization_id = new.organization_id;
    if not found then
      raise exception 'MEMBERSHIP_SECTOR_NOT_AVAILABLE' using errcode = '23503';
    end if;
    if new.unit_id is not null and new.unit_id <> v_sector_unit then
      raise exception 'MEMBERSHIP_SCOPE_HIERARCHY_MISMATCH' using errcode = '23514';
    end if;
    if new.business_id is not null and new.business_id <> v_sector_business then
      raise exception 'MEMBERSHIP_SCOPE_HIERARCHY_MISMATCH' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists organization_memberships_scope_hierarchy on public.organization_memberships;
create trigger organization_memberships_scope_hierarchy
before insert or update of organization_id, business_id, unit_id, sector_id
on public.organization_memberships
for each row execute function private.validate_membership_scope_hierarchy();

do $$
declare
  r record;
begin
  for r in select * from public.organization_memberships loop
    perform private.validate_membership_scope_hierarchy();
  end loop;
exception when others then
  -- Existing rows are also validated explicitly below with relational predicates.
  null;
end $$;

do $$
begin
  if exists (
    select 1
    from public.organization_memberships m
    left join public.units u on u.id=m.unit_id and u.organization_id=m.organization_id
    left join public.sectors s on s.id=m.sector_id and s.organization_id=m.organization_id
    left join public.units su on su.id=s.unit_id and su.organization_id=s.organization_id
    where (m.unit_id is not null and u.id is null)
       or (m.sector_id is not null and s.id is null)
       or (m.business_id is not null and m.unit_id is not null and u.business_id <> m.business_id)
       or (m.unit_id is not null and m.sector_id is not null and s.unit_id <> m.unit_id)
       or (m.business_id is not null and m.sector_id is not null and su.business_id <> m.business_id)
  ) then
    raise exception 'EXISTING_MEMBERSHIP_SCOPE_HIERARCHY_MISMATCH' using errcode='23514';
  end if;
end $$;

create or replace function private.has_org_wide_role(target_organization_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id=target_organization_id
      and m.user_id=auth.uid()
      and m.active
      and (allowed_roles is null or m.role=any(allowed_roles))
      and m.business_id is null and m.unit_id is null and m.sector_id is null
  );
$$;

create or replace function private.has_business_role(target_organization_id uuid, target_business_id uuid, allowed_roles text[])
returns boolean
language sql stable security definer set search_path=''
as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id=target_organization_id and m.user_id=auth.uid() and m.active
      and (allowed_roles is null or m.role=any(allowed_roles))
      and m.unit_id is null and m.sector_id is null
      and (m.business_id is null or m.business_id=target_business_id)
  );
$$;

create or replace function private.has_unit_role(target_organization_id uuid, target_unit_id uuid, allowed_roles text[])
returns boolean
language sql stable security definer set search_path=''
as $$
  select exists (
    select 1
    from public.units u
    join public.organization_memberships m on m.organization_id=u.organization_id
    where u.id=target_unit_id and u.organization_id=target_organization_id
      and m.user_id=auth.uid() and m.active
      and (allowed_roles is null or m.role=any(allowed_roles))
      and m.sector_id is null
      and (
        m.unit_id=target_unit_id
        or (m.unit_id is null and m.business_id=u.business_id)
        or (m.unit_id is null and m.business_id is null)
      )
  );
$$;

create or replace function private.has_sector_role(target_organization_id uuid, target_sector_id uuid, allowed_roles text[])
returns boolean
language sql stable security definer set search_path=''
as $$
  select exists (
    select 1
    from public.sectors s
    join public.units u on u.id=s.unit_id and u.organization_id=s.organization_id
    join public.organization_memberships m on m.organization_id=s.organization_id
    where s.id=target_sector_id and s.organization_id=target_organization_id
      and m.user_id=auth.uid() and m.active
      and (allowed_roles is null or m.role=any(allowed_roles))
      and (
        m.sector_id=target_sector_id
        or (m.sector_id is null and m.unit_id=s.unit_id)
        or (m.sector_id is null and m.unit_id is null and m.business_id=u.business_id)
        or (m.sector_id is null and m.unit_id is null and m.business_id is null)
      )
  );
$$;

create or replace function private.has_target_scope_role(target_organization_id uuid, target_unit_id uuid, target_sector_id uuid, allowed_roles text[])
returns boolean
language sql stable security definer set search_path=''
as $$
  select case when target_sector_id is null
    then private.has_unit_role(target_organization_id,target_unit_id,allowed_roles)
    else private.has_sector_role(target_organization_id,target_sector_id,allowed_roles)
  end;
$$;

create or replace function private.has_stock_location_role(target_organization_id uuid, target_stock_location_id uuid, allowed_roles text[])
returns boolean
language sql stable security definer set search_path=''
as $$
  select private.has_target_scope_role(l.organization_id,l.unit_id,l.sector_id,allowed_roles)
  from public.stock_locations l
  where l.id=target_stock_location_id and l.organization_id=target_organization_id;
$$;

create or replace function private.can_read_business(target_organization_id uuid, target_business_id uuid)
returns boolean
language sql stable security definer set search_path=''
as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id=target_organization_id and m.user_id=auth.uid() and m.active
      and (
        (m.business_id is null and m.unit_id is null and m.sector_id is null)
        or m.business_id=target_business_id
        or exists(select 1 from public.units u where u.id=m.unit_id and u.organization_id=m.organization_id and u.business_id=target_business_id)
        or exists(select 1 from public.sectors s join public.units u on u.id=s.unit_id and u.organization_id=s.organization_id where s.id=m.sector_id and s.organization_id=m.organization_id and u.business_id=target_business_id)
      )
  );
$$;

create or replace function private.can_read_unit(target_organization_id uuid, target_unit_id uuid)
returns boolean
language sql stable security definer set search_path=''
as $$
  select exists (
    select 1 from public.units u
    join public.organization_memberships m on m.organization_id=u.organization_id
    where u.id=target_unit_id and u.organization_id=target_organization_id
      and m.user_id=auth.uid() and m.active
      and (
        (m.business_id is null and m.unit_id is null and m.sector_id is null)
        or m.unit_id=target_unit_id
        or (m.unit_id is null and m.sector_id is null and m.business_id=u.business_id)
        or exists(select 1 from public.sectors s where s.id=m.sector_id and s.organization_id=m.organization_id and s.unit_id=target_unit_id)
      )
  );
$$;

create or replace function private.can_read_sector(target_organization_id uuid, target_sector_id uuid)
returns boolean
language sql stable security definer set search_path=''
as $$
  select private.has_sector_role(target_organization_id,target_sector_id,null::text[]);
$$;

create or replace function private.can_read_stock_location(target_organization_id uuid, target_stock_location_id uuid)
returns boolean
language sql stable security definer set search_path=''
as $$
  select private.has_stock_location_role(target_organization_id,target_stock_location_id,null::text[]);
$$;

create or replace function private.can_read_stock_movement(target_organization_id uuid, target_movement_id uuid)
returns boolean
language sql stable security definer set search_path=''
as $$
  select exists(
    select 1 from public.stock_movements m
    where m.id=target_movement_id and m.organization_id=target_organization_id
      and (
        private.has_org_wide_role(target_organization_id,null::text[])
        or (m.source_location_id is not null and private.can_read_stock_location(target_organization_id,m.source_location_id))
        or (m.destination_location_id is not null and private.can_read_stock_location(target_organization_id,m.destination_location_id))
        or (m.sector_id is not null and private.can_read_sector(target_organization_id,m.sector_id))
      )
  );
$$;

create or replace function private.can_read_transfer(target_organization_id uuid, target_transfer_id uuid)
returns boolean
language sql stable security definer set search_path=''
as $$
  select exists(
    select 1 from public.stock_transfers t
    where t.id=target_transfer_id and t.organization_id=target_organization_id
      and (private.can_read_stock_location(target_organization_id,t.source_location_id) or private.can_read_stock_location(target_organization_id,t.destination_location_id))
  );
$$;

create or replace function private.has_transfer_dispatch_role(target_organization_id uuid, target_source_location_id uuid, target_destination_location_id uuid, allowed_roles text[])
returns boolean
language sql stable security definer set search_path=''
as $$
  select private.has_stock_location_role(target_organization_id,target_source_location_id,allowed_roles)
     and private.has_stock_location_role(target_organization_id,target_destination_location_id,allowed_roles);
$$;

create or replace function private.has_transfer_receive_role(target_organization_id uuid, target_transfer_id uuid, allowed_roles text[])
returns boolean
language sql stable security definer set search_path=''
as $$
  select private.has_stock_location_role(t.organization_id,t.destination_location_id,allowed_roles)
  from public.stock_transfers t
  where t.id=target_transfer_id and t.organization_id=target_organization_id;
$$;

create or replace function private.can_read_inventory_count(target_organization_id uuid, target_inventory_count_id uuid)
returns boolean
language sql stable security definer set search_path=''
as $$
  select private.can_read_stock_location(c.organization_id,c.stock_location_id)
  from public.inventory_counts c
  where c.id=target_inventory_count_id and c.organization_id=target_organization_id;
$$;

create or replace function private.has_inventory_count_role(target_organization_id uuid, target_inventory_count_id uuid, allowed_roles text[])
returns boolean
language sql stable security definer set search_path=''
as $$
  select private.has_stock_location_role(c.organization_id,c.stock_location_id,allowed_roles)
  from public.inventory_counts c
  where c.id=target_inventory_count_id and c.organization_id=target_organization_id;
$$;

create or replace function private.can_read_purchase_order(target_organization_id uuid, target_purchase_order_id uuid)
returns boolean
language sql stable security definer set search_path=''
as $$
  select private.can_read_stock_location(o.organization_id,o.stock_location_id)
  from public.purchase_orders o
  where o.id=target_purchase_order_id and o.organization_id=target_organization_id;
$$;

create or replace function private.has_purchase_order_role(target_organization_id uuid, target_purchase_order_id uuid, allowed_roles text[])
returns boolean
language sql stable security definer set search_path=''
as $$
  select private.has_stock_location_role(o.organization_id,o.stock_location_id,allowed_roles)
  from public.purchase_orders o
  where o.id=target_purchase_order_id and o.organization_id=target_organization_id;
$$;

create or replace function private.can_read_payable_document(target_organization_id uuid, target_payable_document_id uuid)
returns boolean
language sql stable security definer set search_path=''
as $$
  select private.has_target_scope_role(d.organization_id,d.unit_id,d.sector_id,null::text[])
  from public.payable_documents d
  where d.id=target_payable_document_id and d.organization_id=target_organization_id;
$$;

create or replace function private.has_payable_document_role(target_organization_id uuid, target_payable_document_id uuid, allowed_roles text[])
returns boolean
language sql stable security definer set search_path=''
as $$
  select private.has_target_scope_role(d.organization_id,d.unit_id,d.sector_id,allowed_roles)
  from public.payable_documents d
  where d.id=target_payable_document_id and d.organization_id=target_organization_id;
$$;

create or replace function private.has_installment_role(target_organization_id uuid, target_installment_id uuid, allowed_roles text[])
returns boolean
language sql stable security definer set search_path=''
as $$
  select private.has_payable_document_role(i.organization_id,i.payable_document_id,allowed_roles)
  from public.installments i
  where i.id=target_installment_id and i.organization_id=target_organization_id;
$$;

create or replace function private.has_payment_role(target_organization_id uuid, target_payment_id uuid, allowed_roles text[])
returns boolean
language sql stable security definer set search_path=''
as $$
  select private.has_installment_role(p.organization_id,p.installment_id,allowed_roles)
  from public.payments p
  where p.id=target_payment_id and p.organization_id=target_organization_id;
$$;

create or replace function private.has_cash_register_role(target_organization_id uuid, target_cash_register_id uuid, allowed_roles text[])
returns boolean
language sql stable security definer set search_path=''
as $$
  select private.has_unit_role(r.organization_id,r.unit_id,allowed_roles)
  from public.cash_registers r
  where r.id=target_cash_register_id and r.organization_id=target_organization_id;
$$;

create or replace function private.can_read_cash_session(target_organization_id uuid, target_cash_session_id uuid)
returns boolean
language sql stable security definer set search_path=''
as $$
  select private.has_cash_register_role(s.organization_id,s.cash_register_id,null::text[])
  from public.cash_sessions s
  where s.id=target_cash_session_id and s.organization_id=target_organization_id;
$$;

create or replace function private.has_cash_session_role(target_organization_id uuid, target_cash_session_id uuid, allowed_roles text[])
returns boolean
language sql stable security definer set search_path=''
as $$
  select private.has_cash_register_role(s.organization_id,s.cash_register_id,allowed_roles)
  from public.cash_sessions s
  where s.id=target_cash_session_id and s.organization_id=target_organization_id;
$$;

-- Organizational reads become scope-aware while shared master data remains Organization-readable.
drop policy if exists businesses_member_select on public.businesses;
create policy businesses_member_select on public.businesses for select to authenticated using (private.can_read_business(organization_id,id));
drop policy if exists units_member_select on public.units;
create policy units_member_select on public.units for select to authenticated using (private.can_read_unit(organization_id,id));
drop policy if exists sectors_member_select on public.sectors;
create policy sectors_member_select on public.sectors for select to authenticated using (private.can_read_sector(organization_id,id));
drop policy if exists stock_locations_member_select on public.stock_locations;
create policy stock_locations_member_select on public.stock_locations for select to authenticated using (private.can_read_stock_location(organization_id,id));

-- Operational read policies.
drop policy if exists stock_movements_member_select on public.stock_movements;
create policy stock_movements_member_select on public.stock_movements for select to authenticated using (private.can_read_stock_movement(organization_id,id));
drop policy if exists stock_movement_items_member_select on public.stock_movement_items;
create policy stock_movement_items_member_select on public.stock_movement_items for select to authenticated using (exists(select 1 from public.stock_movements m where m.id=movement_id and m.organization_id=organization_id and private.can_read_stock_movement(m.organization_id,m.id)));
drop policy if exists stock_movement_batch_allocations_member_select on public.stock_movement_batch_allocations;
create policy stock_movement_batch_allocations_member_select on public.stock_movement_batch_allocations for select to authenticated using (exists(select 1 from public.stock_movement_items mi join public.stock_movements m on m.id=mi.movement_id and m.organization_id=mi.organization_id where mi.id=movement_item_id and mi.organization_id=organization_id and private.can_read_stock_movement(m.organization_id,m.id)));
drop policy if exists inventory_batches_member_select on public.inventory_batches;
create policy inventory_batches_member_select on public.inventory_batches for select to authenticated using (private.can_read_stock_location(organization_id,stock_location_id));
drop policy if exists inventory_balances_member_select on public.inventory_balances;
create policy inventory_balances_member_select on public.inventory_balances for select to authenticated using (private.can_read_stock_location(organization_id,stock_location_id));
drop policy if exists stock_transfers_member_select on public.stock_transfers;
create policy stock_transfers_member_select on public.stock_transfers for select to authenticated using (private.can_read_transfer(organization_id,id));
drop policy if exists stock_transfer_items_member_select on public.stock_transfer_items;
create policy stock_transfer_items_member_select on public.stock_transfer_items for select to authenticated using (private.can_read_transfer(organization_id,transfer_id));
drop policy if exists stock_transfer_batch_allocations_member_select on public.stock_transfer_batch_allocations;
create policy stock_transfer_batch_allocations_member_select on public.stock_transfer_batch_allocations for select to authenticated using (exists(select 1 from public.stock_transfer_items ti where ti.id=transfer_item_id and ti.organization_id=organization_id and private.can_read_transfer(ti.organization_id,ti.transfer_id)));
drop policy if exists inventory_counts_member_select on public.inventory_counts;
create policy inventory_counts_member_select on public.inventory_counts for select to authenticated using (private.can_read_inventory_count(organization_id,id));
drop policy if exists inventory_count_lines_member_select on public.inventory_count_lines;
create policy inventory_count_lines_member_select on public.inventory_count_lines for select to authenticated using (private.can_read_inventory_count(organization_id,inventory_count_id));

drop policy if exists purchase_orders_select_member on public.purchase_orders;
create policy purchase_orders_select_member on public.purchase_orders for select to authenticated using (private.can_read_purchase_order(organization_id,id));
drop policy if exists purchase_order_items_select_member on public.purchase_order_items;
create policy purchase_order_items_select_member on public.purchase_order_items for select to authenticated using (private.can_read_purchase_order(organization_id,purchase_order_id));
drop policy if exists purchase_receipts_select_member on public.purchase_receipts;
create policy purchase_receipts_select_member on public.purchase_receipts for select to authenticated using (private.can_read_purchase_order(organization_id,purchase_order_id));
drop policy if exists purchase_receipt_items_select_member on public.purchase_receipt_items;
create policy purchase_receipt_items_select_member on public.purchase_receipt_items for select to authenticated using (exists(select 1 from public.purchase_receipts r where r.id=purchase_receipt_id and r.organization_id=organization_id and private.can_read_purchase_order(r.organization_id,r.purchase_order_id)));

drop policy if exists payable_documents_select_member on public.payable_documents;
create policy payable_documents_select_member on public.payable_documents for select to authenticated using (private.can_read_payable_document(organization_id,id));
drop policy if exists installments_select_member on public.installments;
create policy installments_select_member on public.installments for select to authenticated using (private.can_read_payable_document(organization_id,payable_document_id));
drop policy if exists payment_instructions_select_member on public.payment_instructions;
create policy payment_instructions_select_member on public.payment_instructions for select to authenticated using (exists(select 1 from public.installments i where i.id=installment_id and i.organization_id=organization_id and private.can_read_payable_document(i.organization_id,i.payable_document_id)));
drop policy if exists payments_select_member on public.payments;
create policy payments_select_member on public.payments for select to authenticated using (exists(select 1 from public.installments i where i.id=installment_id and i.organization_id=organization_id and private.can_read_payable_document(i.organization_id,i.payable_document_id)));

drop policy if exists cash_registers_select_member on public.cash_registers;
create policy cash_registers_select_member on public.cash_registers for select to authenticated using (private.has_cash_register_role(organization_id,id,null::text[]));
drop policy if exists cash_sessions_select_member on public.cash_sessions;
create policy cash_sessions_select_member on public.cash_sessions for select to authenticated using (private.can_read_cash_session(organization_id,id));
drop policy if exists payment_method_totals_select_member on public.payment_method_totals;
create policy payment_method_totals_select_member on public.payment_method_totals for select to authenticated using (private.can_read_cash_session(organization_id,cash_session_id));
drop policy if exists cash_movements_select_member on public.cash_movements;
create policy cash_movements_select_member on public.cash_movements for select to authenticated using (private.can_read_cash_session(organization_id,cash_session_id));

-- Global/admin writes require Organization-wide membership; scoped operational masters use their target scope.
drop policy if exists organizations_admin_update on public.organizations;
create policy organizations_admin_update on public.organizations for update to authenticated
using (private.has_org_wide_role(id,array['owner','admin'])) with check (private.has_org_wide_role(id,array['owner','admin']));
drop policy if exists memberships_visible_to_self_or_admin on public.organization_memberships;
create policy memberships_visible_to_self_or_admin on public.organization_memberships for select to authenticated
using (user_id=auth.uid() or private.has_org_wide_role(organization_id,array['owner','admin']));
drop policy if exists audit_logs_admin_select on public.audit_logs;
create policy audit_logs_admin_select on public.audit_logs for select to authenticated
using (private.has_org_wide_role(organization_id,array['owner','admin']));

drop policy if exists legal_entities_admin_insert on public.legal_entities;
create policy legal_entities_admin_insert on public.legal_entities for insert to authenticated with check (private.has_org_wide_role(organization_id,array['owner','admin']));
drop policy if exists legal_entities_admin_update on public.legal_entities;
create policy legal_entities_admin_update on public.legal_entities for update to authenticated using (private.has_org_wide_role(organization_id,array['owner','admin'])) with check (private.has_org_wide_role(organization_id,array['owner','admin']));

drop policy if exists businesses_management_insert on public.businesses;
create policy businesses_management_insert on public.businesses for insert to authenticated with check (private.has_org_wide_role(organization_id,array['owner','admin','manager']));
drop policy if exists businesses_management_update on public.businesses;
create policy businesses_management_update on public.businesses for update to authenticated using (private.has_org_wide_role(organization_id,array['owner','admin','manager'])) with check (private.has_org_wide_role(organization_id,array['owner','admin','manager']));

drop policy if exists units_management_insert on public.units;
create policy units_management_insert on public.units for insert to authenticated with check (private.has_business_role(organization_id,business_id,array['owner','admin','manager']));
drop policy if exists units_management_update on public.units;
create policy units_management_update on public.units for update to authenticated using (private.has_business_role(organization_id,business_id,array['owner','admin','manager'])) with check (private.has_business_role(organization_id,business_id,array['owner','admin','manager']));

drop policy if exists sectors_management_insert on public.sectors;
create policy sectors_management_insert on public.sectors for insert to authenticated with check (private.has_unit_role(organization_id,unit_id,array['owner','admin','manager']));
drop policy if exists sectors_management_update on public.sectors;
create policy sectors_management_update on public.sectors for update to authenticated using (private.has_sector_role(organization_id,id,array['owner','admin','manager'])) with check (private.has_sector_role(organization_id,id,array['owner','admin','manager']));

drop policy if exists stock_locations_management_insert on public.stock_locations;
create policy stock_locations_management_insert on public.stock_locations for insert to authenticated with check (private.has_target_scope_role(organization_id,unit_id,sector_id,array['owner','admin','manager']));
drop policy if exists stock_locations_management_update on public.stock_locations;
create policy stock_locations_management_update on public.stock_locations for update to authenticated using (private.has_stock_location_role(organization_id,id,array['owner','admin','manager'])) with check (private.has_stock_location_role(organization_id,id,array['owner','admin','manager']));

-- Catalog and supplier data are Organization-shared; scoped memberships cannot mutate them globally.
do $$
declare t text;
begin
  foreach t in array array['item_categories','units_of_measure','stock_items','item_aliases'] loop
    execute format('drop policy if exists %I on public.%I',t||'_inventory_insert',t);
    execute format('drop policy if exists %I on public.%I',t||'_inventory_update',t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.has_org_wide_role(organization_id,array[''owner'',''admin'',''manager'',''inventory'']))',t||'_inventory_insert',t);
    execute format('create policy %I on public.%I for update to authenticated using (private.has_org_wide_role(organization_id,array[''owner'',''admin'',''manager'',''inventory''])) with check (private.has_org_wide_role(organization_id,array[''owner'',''admin'',''manager'',''inventory'']))',t||'_inventory_update',t);
  end loop;
  foreach t in array array['suppliers','supplier_contacts','supplier_terms','supplier_items','supplier_prices'] loop
    execute format('drop policy if exists %I on public.%I',t||'_purchases_insert',t);
    execute format('drop policy if exists %I on public.%I',t||'_purchases_update',t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.has_org_wide_role(organization_id,array[''owner'',''admin'',''manager'',''purchases'']))',t||'_purchases_insert',t);
    execute format('create policy %I on public.%I for update to authenticated using (private.has_org_wide_role(organization_id,array[''owner'',''admin'',''manager'',''purchases''])) with check (private.has_org_wide_role(organization_id,array[''owner'',''admin'',''manager'',''purchases'']))',t||'_purchases_update',t);
  end loop;
end $$;

-- Preserve existing transactional implementations by moving them out of the exposed schema.
alter function public.record_stock_entry(uuid,uuid,uuid,uuid,numeric,numeric,text,date,text) set schema private;
alter function public.record_stock_withdrawal(uuid,uuid,uuid,uuid,numeric,uuid,text) set schema private;
alter function public.dispatch_stock_transfer(uuid,uuid,uuid,uuid,uuid,numeric,uuid,text) set schema private;
alter function public.receive_stock_transfer(uuid,uuid,uuid,numeric) set schema private;
alter function public.start_inventory_count(uuid,uuid,uuid) set schema private;
alter function public.set_inventory_count_line(uuid,uuid,uuid,uuid,numeric,numeric) set schema private;
alter function public.confirm_inventory_count(uuid,uuid,uuid) set schema private;
alter function public.cancel_inventory_count(uuid,uuid,uuid) set schema private;
alter function public.create_purchase_order(uuid,uuid,uuid,uuid,date,text,jsonb) set schema private;
alter function public.issue_purchase_order(uuid,uuid,uuid) set schema private;
alter function public.receive_purchase_order(uuid,uuid,uuid,jsonb,text) set schema private;
alter function public.cancel_purchase_order(uuid,uuid,uuid,text) set schema private;
alter function public.create_payable_document(uuid,uuid,uuid,uuid,uuid,text,text,text,text,date,text,jsonb) set schema private;
alter function public.record_installment_payment(uuid,uuid,uuid,numeric,timestamptz,text,text) set schema private;
alter function public.reverse_installment_payment(uuid,uuid,uuid,timestamptz,text) set schema private;
alter function public.cancel_payable_document(uuid,uuid,uuid,text) set schema private;
alter function public.create_cash_register(uuid,uuid,uuid,text,text) set schema private;
alter function public.create_payment_method(uuid,uuid,text,text,text,boolean) set schema private;
alter function public.create_fee_rule(uuid,uuid,uuid,date,date,numeric,numeric,text) set schema private;
alter function public.open_cash_session(uuid,uuid,uuid,date,integer,numeric,text) set schema private;
alter function public.set_cash_payment_total(uuid,uuid,uuid,uuid,numeric,numeric,uuid) set schema private;
alter function public.record_cash_movement(uuid,uuid,uuid,text,numeric,timestamptz,text) set schema private;
alter function public.close_cash_session(uuid,uuid,uuid,numeric,text) set schema private;
alter function public.cancel_cash_session(uuid,uuid,uuid,text) set schema private;

revoke all on all functions in schema private from anon;
-- Explicit implementations below are not callable by signed-in users; public wrappers are the boundary.
revoke execute on function private.record_stock_entry(uuid,uuid,uuid,uuid,numeric,numeric,text,date,text) from authenticated;
revoke execute on function private.record_stock_withdrawal(uuid,uuid,uuid,uuid,numeric,uuid,text) from authenticated;
revoke execute on function private.dispatch_stock_transfer(uuid,uuid,uuid,uuid,uuid,numeric,uuid,text) from authenticated;
revoke execute on function private.receive_stock_transfer(uuid,uuid,uuid,numeric) from authenticated;
revoke execute on function private.start_inventory_count(uuid,uuid,uuid) from authenticated;
revoke execute on function private.set_inventory_count_line(uuid,uuid,uuid,uuid,numeric,numeric) from authenticated;
revoke execute on function private.confirm_inventory_count(uuid,uuid,uuid) from authenticated;
revoke execute on function private.cancel_inventory_count(uuid,uuid,uuid) from authenticated;
revoke execute on function private.create_purchase_order(uuid,uuid,uuid,uuid,date,text,jsonb) from authenticated;
revoke execute on function private.issue_purchase_order(uuid,uuid,uuid) from authenticated;
revoke execute on function private.receive_purchase_order(uuid,uuid,uuid,jsonb,text) from authenticated;
revoke execute on function private.cancel_purchase_order(uuid,uuid,uuid,text) from authenticated;
revoke execute on function private.create_payable_document(uuid,uuid,uuid,uuid,uuid,text,text,text,text,date,text,jsonb) from authenticated;
revoke execute on function private.record_installment_payment(uuid,uuid,uuid,numeric,timestamptz,text,text) from authenticated;
revoke execute on function private.reverse_installment_payment(uuid,uuid,uuid,timestamptz,text) from authenticated;
revoke execute on function private.cancel_payable_document(uuid,uuid,uuid,text) from authenticated;
revoke execute on function private.create_cash_register(uuid,uuid,uuid,text,text) from authenticated;
revoke execute on function private.create_payment_method(uuid,uuid,text,text,text,boolean) from authenticated;
revoke execute on function private.create_fee_rule(uuid,uuid,uuid,date,date,numeric,numeric,text) from authenticated;
revoke execute on function private.open_cash_session(uuid,uuid,uuid,date,integer,numeric,text) from authenticated;
revoke execute on function private.set_cash_payment_total(uuid,uuid,uuid,uuid,numeric,numeric,uuid) from authenticated;
revoke execute on function private.record_cash_movement(uuid,uuid,uuid,text,numeric,timestamptz,text) from authenticated;
revoke execute on function private.close_cash_session(uuid,uuid,uuid,numeric,text) from authenticated;
revoke execute on function private.cancel_cash_session(uuid,uuid,uuid,text) from authenticated;

-- Scoped public wrappers. Wrong role preserves INSUFFICIENT_ROLE; valid role outside scope uses INSUFFICIENT_SCOPE.
create function public.record_stock_entry(p_command_id uuid,p_organization_id uuid,p_stock_item_id uuid,p_stock_location_id uuid,p_quantity numeric,p_unit_cost numeric,p_batch_code text default null,p_expiration_date date default null,p_notes text default null)
returns table(movement_id uuid,quantity_on_hand numeric,average_cost numeric) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','inventory']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_stock_location_role(p_organization_id,p_stock_location_id,array['owner','admin','manager','inventory']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.record_stock_entry(p_command_id,p_organization_id,p_stock_item_id,p_stock_location_id,p_quantity,p_unit_cost,p_batch_code,p_expiration_date,p_notes);
end $$;

create function public.record_stock_withdrawal(p_command_id uuid,p_organization_id uuid,p_stock_item_id uuid,p_stock_location_id uuid,p_quantity numeric,p_preferred_batch_id uuid default null,p_notes text default null)
returns table(movement_id uuid,quantity_on_hand numeric,average_cost numeric) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','inventory']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_stock_location_role(p_organization_id,p_stock_location_id,array['owner','admin','manager','inventory']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.record_stock_withdrawal(p_command_id,p_organization_id,p_stock_item_id,p_stock_location_id,p_quantity,p_preferred_batch_id,p_notes);
end $$;

create function public.dispatch_stock_transfer(p_command_id uuid,p_organization_id uuid,p_stock_item_id uuid,p_source_location_id uuid,p_destination_location_id uuid,p_quantity numeric,p_preferred_batch_id uuid default null,p_notes text default null)
returns table(transfer_id uuid,transfer_status text,dispatched_quantity numeric,received_quantity numeric) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','inventory']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_transfer_dispatch_role(p_organization_id,p_source_location_id,p_destination_location_id,array['owner','admin','manager','inventory']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.dispatch_stock_transfer(p_command_id,p_organization_id,p_stock_item_id,p_source_location_id,p_destination_location_id,p_quantity,p_preferred_batch_id,p_notes);
end $$;

create function public.receive_stock_transfer(p_command_id uuid,p_organization_id uuid,p_transfer_id uuid,p_quantity numeric default null)
returns table(transfer_id uuid,transfer_status text,dispatched_quantity numeric,received_quantity numeric,received_now numeric) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','inventory']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_transfer_receive_role(p_organization_id,p_transfer_id,array['owner','admin','manager','inventory']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.receive_stock_transfer(p_command_id,p_organization_id,p_transfer_id,p_quantity);
end $$;

create function public.start_inventory_count(p_command_id uuid,p_organization_id uuid,p_stock_location_id uuid)
returns table(inventory_count_id uuid,inventory_count_status text,line_count integer) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','inventory']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_stock_location_role(p_organization_id,p_stock_location_id,array['owner','admin','manager','inventory']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.start_inventory_count(p_command_id,p_organization_id,p_stock_location_id);
end $$;

create function public.set_inventory_count_line(p_command_id uuid,p_organization_id uuid,p_inventory_count_id uuid,p_stock_item_id uuid,p_counted_quantity numeric,p_adjustment_unit_cost numeric default null)
returns table(inventory_count_id uuid,stock_item_id uuid,counted_quantity numeric,adjustment_unit_cost numeric) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','inventory']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_inventory_count_role(p_organization_id,p_inventory_count_id,array['owner','admin','manager','inventory']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.set_inventory_count_line(p_command_id,p_organization_id,p_inventory_count_id,p_stock_item_id,p_counted_quantity,p_adjustment_unit_cost);
end $$;

create function public.confirm_inventory_count(p_command_id uuid,p_organization_id uuid,p_inventory_count_id uuid)
returns table(inventory_count_id uuid,inventory_count_status text,positive_adjustment_movement_id uuid,negative_adjustment_movement_id uuid,adjusted_line_count integer) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','inventory']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_inventory_count_role(p_organization_id,p_inventory_count_id,array['owner','admin','manager','inventory']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.confirm_inventory_count(p_command_id,p_organization_id,p_inventory_count_id);
end $$;

create function public.cancel_inventory_count(p_command_id uuid,p_organization_id uuid,p_inventory_count_id uuid)
returns table(inventory_count_id uuid,inventory_count_status text) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','inventory']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_inventory_count_role(p_organization_id,p_inventory_count_id,array['owner','admin','manager','inventory']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.cancel_inventory_count(p_command_id,p_organization_id,p_inventory_count_id);
end $$;

create function public.create_purchase_order(p_command_id uuid,p_organization_id uuid,p_supplier_id uuid,p_stock_location_id uuid,p_expected_delivery_date date,p_notes text,p_items jsonb)
returns table(purchase_order_id uuid,purchase_order_status text,total_value numeric) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','purchases']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_stock_location_role(p_organization_id,p_stock_location_id,array['owner','admin','manager','purchases']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.create_purchase_order(p_command_id,p_organization_id,p_supplier_id,p_stock_location_id,p_expected_delivery_date,p_notes,p_items);
end $$;

create function public.issue_purchase_order(p_command_id uuid,p_organization_id uuid,p_purchase_order_id uuid)
returns table(purchase_order_id uuid,purchase_order_status text,ordered_at timestamptz) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','purchases']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_purchase_order_role(p_organization_id,p_purchase_order_id,array['owner','admin','manager','purchases']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.issue_purchase_order(p_command_id,p_organization_id,p_purchase_order_id);
end $$;

create function public.receive_purchase_order(p_command_id uuid,p_organization_id uuid,p_purchase_order_id uuid,p_items jsonb,p_notes text default null)
returns table(purchase_receipt_id uuid,purchase_order_id uuid,purchase_order_status text,received_line_count integer) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','purchases','inventory']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_purchase_order_role(p_organization_id,p_purchase_order_id,array['owner','admin','manager','purchases','inventory']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.receive_purchase_order(p_command_id,p_organization_id,p_purchase_order_id,p_items,p_notes);
end $$;

create function public.cancel_purchase_order(p_command_id uuid,p_organization_id uuid,p_purchase_order_id uuid,p_reason text default null)
returns table(purchase_order_id uuid,purchase_order_status text) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','purchases']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_purchase_order_role(p_organization_id,p_purchase_order_id,array['owner','admin','manager','purchases']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.cancel_purchase_order(p_command_id,p_organization_id,p_purchase_order_id,p_reason);
end $$;

create function public.create_payable_document(p_command_id uuid,p_organization_id uuid,p_unit_id uuid,p_sector_id uuid,p_supplier_id uuid,p_document_type text,p_document_number text,p_series text,p_access_key text,p_issued_at date,p_description text,p_installments jsonb)
returns table(payable_document_id uuid,total_amount numeric,installment_count integer) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','finance']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_target_scope_role(p_organization_id,p_unit_id,p_sector_id,array['owner','admin','manager','finance']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.create_payable_document(p_command_id,p_organization_id,p_unit_id,p_sector_id,p_supplier_id,p_document_type,p_document_number,p_series,p_access_key,p_issued_at,p_description,p_installments);
end $$;

create function public.record_installment_payment(p_command_id uuid,p_organization_id uuid,p_installment_id uuid,p_amount numeric,p_paid_at timestamptz,p_payment_reference text default null,p_notes text default null)
returns table(payment_id uuid,installment_id uuid,net_paid_amount numeric,balance_amount numeric,payment_status text) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','finance']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_installment_role(p_organization_id,p_installment_id,array['owner','admin','manager','finance']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.record_installment_payment(p_command_id,p_organization_id,p_installment_id,p_amount,p_paid_at,p_payment_reference,p_notes);
end $$;

create function public.reverse_installment_payment(p_command_id uuid,p_organization_id uuid,p_payment_id uuid,p_reversed_at timestamptz,p_reason text default null)
returns table(reversal_id uuid,installment_id uuid,net_paid_amount numeric,balance_amount numeric,payment_status text) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','finance']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_payment_role(p_organization_id,p_payment_id,array['owner','admin','manager','finance']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.reverse_installment_payment(p_command_id,p_organization_id,p_payment_id,p_reversed_at,p_reason);
end $$;

create function public.cancel_payable_document(p_command_id uuid,p_organization_id uuid,p_payable_document_id uuid,p_reason text default null)
returns table(payable_document_id uuid,lifecycle_status text) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','finance']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_payable_document_role(p_organization_id,p_payable_document_id,array['owner','admin','manager','finance']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.cancel_payable_document(p_command_id,p_organization_id,p_payable_document_id,p_reason);
end $$;

create function public.create_cash_register(p_command_id uuid,p_organization_id uuid,p_unit_id uuid,p_name text,p_code text default null)
returns table(cash_register_id uuid,register_status text) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_unit_role(p_organization_id,p_unit_id,array['owner','admin','manager']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.create_cash_register(p_command_id,p_organization_id,p_unit_id,p_name,p_code);
end $$;

create function public.create_payment_method(p_command_id uuid,p_organization_id uuid,p_code text,p_name text,p_method_kind text,p_affects_cash_drawer boolean default false)
returns table(payment_method_id uuid,method_status text) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_org_wide_role(p_organization_id,array['owner','admin','manager']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.create_payment_method(p_command_id,p_organization_id,p_code,p_name,p_method_kind,p_affects_cash_drawer);
end $$;

create function public.create_fee_rule(p_command_id uuid,p_organization_id uuid,p_payment_method_id uuid,p_valid_from date,p_valid_to date,p_percent_fee numeric,p_fixed_fee numeric,p_label text default null)
returns table(fee_rule_id uuid,rule_status text) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_org_wide_role(p_organization_id,array['owner','admin','manager']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.create_fee_rule(p_command_id,p_organization_id,p_payment_method_id,p_valid_from,p_valid_to,p_percent_fee,p_fixed_fee,p_label);
end $$;

create function public.open_cash_session(p_command_id uuid,p_organization_id uuid,p_cash_register_id uuid,p_business_date date,p_sequence integer,p_opening_float numeric,p_notes text default null)
returns table(cash_session_id uuid,session_status text) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','cashier']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_cash_register_role(p_organization_id,p_cash_register_id,array['owner','admin','manager','cashier']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.open_cash_session(p_command_id,p_organization_id,p_cash_register_id,p_business_date,p_sequence,p_opening_float,p_notes);
end $$;

create function public.set_cash_payment_total(p_command_id uuid,p_organization_id uuid,p_cash_session_id uuid,p_payment_method_id uuid,p_gross_amount numeric,p_fee_amount numeric default null,p_fee_rule_id uuid default null)
returns table(payment_total_id uuid,gross_amount numeric,fee_amount numeric,net_amount numeric) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','cashier']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_cash_session_role(p_organization_id,p_cash_session_id,array['owner','admin','manager','cashier']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.set_cash_payment_total(p_command_id,p_organization_id,p_cash_session_id,p_payment_method_id,p_gross_amount,p_fee_amount,p_fee_rule_id);
end $$;

create function public.record_cash_movement(p_command_id uuid,p_organization_id uuid,p_cash_session_id uuid,p_movement_type text,p_amount numeric,p_occurred_at timestamptz,p_reason text default null)
returns table(cash_movement_id uuid,movement_type text,amount numeric) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','cashier']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_cash_session_role(p_organization_id,p_cash_session_id,array['owner','admin','manager','cashier']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.record_cash_movement(p_command_id,p_organization_id,p_cash_session_id,p_movement_type,p_amount,p_occurred_at,p_reason);
end $$;

create function public.close_cash_session(p_command_id uuid,p_organization_id uuid,p_cash_session_id uuid,p_counted_cash_amount numeric,p_notes text default null)
returns table(cash_session_id uuid,expected_cash_amount numeric,counted_cash_amount numeric,cash_difference numeric,session_status text) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','cashier']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_cash_session_role(p_organization_id,p_cash_session_id,array['owner','admin','manager','cashier']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.close_cash_session(p_command_id,p_organization_id,p_cash_session_id,p_counted_cash_amount,p_notes);
end $$;

create function public.cancel_cash_session(p_command_id uuid,p_organization_id uuid,p_cash_session_id uuid,p_reason text default null)
returns table(cash_session_id uuid,session_status text) language plpgsql security definer set search_path=''
as $$ begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
 if not private.has_org_role(p_organization_id,array['owner','admin','manager','cashier']) then raise exception 'INSUFFICIENT_ROLE' using errcode='42501'; end if;
 if not private.has_cash_session_role(p_organization_id,p_cash_session_id,array['owner','admin','manager','cashier']) then raise exception 'INSUFFICIENT_SCOPE' using errcode='42501'; end if;
 return query select * from private.cancel_cash_session(p_command_id,p_organization_id,p_cash_session_id,p_reason);
end $$;

revoke all on function public.record_stock_entry(uuid,uuid,uuid,uuid,numeric,numeric,text,date,text) from public,anon;
revoke all on function public.record_stock_withdrawal(uuid,uuid,uuid,uuid,numeric,uuid,text) from public,anon;
revoke all on function public.dispatch_stock_transfer(uuid,uuid,uuid,uuid,uuid,numeric,uuid,text) from public,anon;
revoke all on function public.receive_stock_transfer(uuid,uuid,uuid,numeric) from public,anon;
revoke all on function public.start_inventory_count(uuid,uuid,uuid) from public,anon;
revoke all on function public.set_inventory_count_line(uuid,uuid,uuid,uuid,numeric,numeric) from public,anon;
revoke all on function public.confirm_inventory_count(uuid,uuid,uuid) from public,anon;
revoke all on function public.cancel_inventory_count(uuid,uuid,uuid) from public,anon;
revoke all on function public.create_purchase_order(uuid,uuid,uuid,uuid,date,text,jsonb) from public,anon;
revoke all on function public.issue_purchase_order(uuid,uuid,uuid) from public,anon;
revoke all on function public.receive_purchase_order(uuid,uuid,uuid,jsonb,text) from public,anon;
revoke all on function public.cancel_purchase_order(uuid,uuid,uuid,text) from public,anon;
revoke all on function public.create_payable_document(uuid,uuid,uuid,uuid,uuid,text,text,text,text,date,text,jsonb) from public,anon;
revoke all on function public.record_installment_payment(uuid,uuid,uuid,numeric,timestamptz,text,text) from public,anon;
revoke all on function public.reverse_installment_payment(uuid,uuid,uuid,timestamptz,text) from public,anon;
revoke all on function public.cancel_payable_document(uuid,uuid,uuid,text) from public,anon;
revoke all on function public.create_cash_register(uuid,uuid,uuid,text,text) from public,anon;
revoke all on function public.create_payment_method(uuid,uuid,text,text,text,boolean) from public,anon;
revoke all on function public.create_fee_rule(uuid,uuid,uuid,date,date,numeric,numeric,text) from public,anon;
revoke all on function public.open_cash_session(uuid,uuid,uuid,date,integer,numeric,text) from public,anon;
revoke all on function public.set_cash_payment_total(uuid,uuid,uuid,uuid,numeric,numeric,uuid) from public,anon;
revoke all on function public.record_cash_movement(uuid,uuid,uuid,text,numeric,timestamptz,text) from public,anon;
revoke all on function public.close_cash_session(uuid,uuid,uuid,numeric,text) from public,anon;
revoke all on function public.cancel_cash_session(uuid,uuid,uuid,text) from public,anon;

grant execute on function public.record_stock_entry(uuid,uuid,uuid,uuid,numeric,numeric,text,date,text) to authenticated;
grant execute on function public.record_stock_withdrawal(uuid,uuid,uuid,uuid,numeric,uuid,text) to authenticated;
grant execute on function public.dispatch_stock_transfer(uuid,uuid,uuid,uuid,uuid,numeric,uuid,text) to authenticated;
grant execute on function public.receive_stock_transfer(uuid,uuid,uuid,numeric) to authenticated;
grant execute on function public.start_inventory_count(uuid,uuid,uuid) to authenticated;
grant execute on function public.set_inventory_count_line(uuid,uuid,uuid,uuid,numeric,numeric) to authenticated;
grant execute on function public.confirm_inventory_count(uuid,uuid,uuid) to authenticated;
grant execute on function public.cancel_inventory_count(uuid,uuid,uuid) to authenticated;
grant execute on function public.create_purchase_order(uuid,uuid,uuid,uuid,date,text,jsonb) to authenticated;
grant execute on function public.issue_purchase_order(uuid,uuid,uuid) to authenticated;
grant execute on function public.receive_purchase_order(uuid,uuid,uuid,jsonb,text) to authenticated;
grant execute on function public.cancel_purchase_order(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.create_payable_document(uuid,uuid,uuid,uuid,uuid,text,text,text,text,date,text,jsonb) to authenticated;
grant execute on function public.record_installment_payment(uuid,uuid,uuid,numeric,timestamptz,text,text) to authenticated;
grant execute on function public.reverse_installment_payment(uuid,uuid,uuid,timestamptz,text) to authenticated;
grant execute on function public.cancel_payable_document(uuid,uuid,uuid,text) to authenticated;
grant execute on function public.create_cash_register(uuid,uuid,uuid,text,text) to authenticated;
grant execute on function public.create_payment_method(uuid,uuid,text,text,text,boolean) to authenticated;
grant execute on function public.create_fee_rule(uuid,uuid,uuid,date,date,numeric,numeric,text) to authenticated;
grant execute on function public.open_cash_session(uuid,uuid,uuid,date,integer,numeric,text) to authenticated;
grant execute on function public.set_cash_payment_total(uuid,uuid,uuid,uuid,numeric,numeric,uuid) to authenticated;
grant execute on function public.record_cash_movement(uuid,uuid,uuid,text,numeric,timestamptz,text) to authenticated;
grant execute on function public.close_cash_session(uuid,uuid,uuid,numeric,text) to authenticated;
grant execute on function public.cancel_cash_session(uuid,uuid,uuid,text) to authenticated;
