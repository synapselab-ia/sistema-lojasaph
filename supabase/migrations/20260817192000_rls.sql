create unique index organization_memberships_scope_unique_idx
  on public.organization_memberships (
    organization_id,
    user_id,
    role,
    coalesce(business_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(unit_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(sector_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid, text[]) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;

grant usage on schema public to authenticated;
revoke all on all tables in schema public from anon;

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;

create policy organizations_member_select
  on public.organizations for select to authenticated
  using (public.is_org_member(id));

create policy organizations_admin_update
  on public.organizations for update to authenticated
  using (public.has_org_role(id, array['owner', 'admin']))
  with check (public.has_org_role(id, array['owner', 'admin']));

create policy memberships_visible_to_self_or_admin
  on public.organization_memberships for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_org_role(organization_id, array['owner', 'admin'])
  );

grant select, update on public.organizations to authenticated;
grant select on public.organization_memberships to authenticated;

-- Tables where every active Organization member may read rows from its Organization.
do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'businesses',
    'legal_entities',
    'units',
    'sectors',
    'stock_locations',
    'item_categories',
    'units_of_measure',
    'stock_items',
    'item_aliases',
    'suppliers',
    'supplier_contacts',
    'supplier_terms',
    'supplier_items',
    'supplier_prices',
    'stock_movements',
    'stock_movement_items',
    'inventory_batches',
    'stock_movement_batch_allocations',
    'inventory_balances',
    'stock_transfers',
    'stock_transfer_items',
    'stock_transfer_batch_allocations',
    'inventory_counts',
    'inventory_count_lines'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    policy_name := table_name || '_member_select';
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_org_member(organization_id))',
      policy_name,
      table_name
    );
    execute format('grant select on public.%I to authenticated', table_name);
  end loop;
end;
$$;

alter table public.audit_logs enable row level security;
create policy audit_logs_admin_select
  on public.audit_logs for select to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']));
grant select on public.audit_logs to authenticated;

-- Legal/fiscal data: owner/admin only for direct writes.
create policy legal_entities_admin_insert
  on public.legal_entities for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner', 'admin']));
create policy legal_entities_admin_update
  on public.legal_entities for update to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']))
  with check (public.has_org_role(organization_id, array['owner', 'admin']));
grant insert, update on public.legal_entities to authenticated;

-- Organizational master data.
do $$
declare
  table_name text;
  insert_policy text;
  update_policy text;
begin
  foreach table_name in array array['businesses', 'units', 'sectors', 'stock_locations']
  loop
    insert_policy := table_name || '_management_insert';
    update_policy := table_name || '_management_update';
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.has_org_role(organization_id, array[''owner'', ''admin'', ''manager'']))',
      insert_policy,
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.has_org_role(organization_id, array[''owner'', ''admin'', ''manager''])) with check (public.has_org_role(organization_id, array[''owner'', ''admin'', ''manager'']))',
      update_policy,
      table_name
    );
    execute format('grant insert, update on public.%I to authenticated', table_name);
  end loop;
end;
$$;

-- Catalog master data.
do $$
declare
  table_name text;
  insert_policy text;
  update_policy text;
begin
  foreach table_name in array array['item_categories', 'units_of_measure', 'stock_items', 'item_aliases']
  loop
    insert_policy := table_name || '_inventory_insert';
    update_policy := table_name || '_inventory_update';
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.has_org_role(organization_id, array[''owner'', ''admin'', ''manager'', ''inventory'']))',
      insert_policy,
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.has_org_role(organization_id, array[''owner'', ''admin'', ''manager'', ''inventory''])) with check (public.has_org_role(organization_id, array[''owner'', ''admin'', ''manager'', ''inventory'']))',
      update_policy,
      table_name
    );
    execute format('grant insert, update on public.%I to authenticated', table_name);
  end loop;
end;
$$;

-- Supplier master data.
do $$
declare
  table_name text;
  insert_policy text;
  update_policy text;
begin
  foreach table_name in array array['suppliers', 'supplier_contacts', 'supplier_terms', 'supplier_items', 'supplier_prices']
  loop
    insert_policy := table_name || '_purchases_insert';
    update_policy := table_name || '_purchases_update';
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.has_org_role(organization_id, array[''owner'', ''admin'', ''manager'', ''purchases'']))',
      insert_policy,
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.has_org_role(organization_id, array[''owner'', ''admin'', ''manager'', ''purchases''])) with check (public.has_org_role(organization_id, array[''owner'', ''admin'', ''manager'', ''purchases'']))',
      update_policy,
      table_name
    );
    execute format('grant insert, update on public.%I to authenticated', table_name);
  end loop;
end;
$$;

-- Intentional: no INSERT/UPDATE/DELETE grants or write policies are created for
-- stock_movements, stock_movement_items, inventory_batches, inventory_balances,
-- transfers, transfer allocations, inventory counts or audit_logs.
-- Critical writes must later go through a transaction-safe server/RPC adapter.
