\set ON_ERROR_STOP on

-- This test is intentionally data-agnostic: it validates a real Production
-- point-in-time bundle without depending on synthetic seed UUIDs or assuming
-- that every valid snapshot must contain rows in every optional business table.
-- The caller must already have enforced that the target is an isolated local DB.
do $$
declare
  fk record;
  child_not_null_predicate text;
  parent_match_predicate text;
  has_violation boolean;
begin
  if current_setting('server_version_num')::integer < 170000 then
    raise exception 'Production bundle restore requires PostgreSQL 17 or newer';
  end if;

  if to_regclass('public.organizations') is null
     or to_regclass('public.units') is null
     or to_regclass('public.organization_memberships') is null
     or to_regclass('public.stock_items') is null
     or to_regclass('public.stock_movements') is null
     or to_regclass('public.payments') is null then
    raise exception 'restored Production bundle is missing critical Lojasaph relations';
  end if;

  -- These relations are known to contain core operational data in the current
  -- Production baseline and provide a useful guard against a schema-only or
  -- accidentally empty restore. Membership/payment row counts are intentionally
  -- not hard-coded: a structurally valid point-in-time snapshot may contain 0.
  if (select count(*) from public.organizations) < 1 then
    raise exception 'restored Production bundle contains no organizations';
  end if;

  if (select count(*) from public.units) < 1 then
    raise exception 'restored Production bundle contains no units';
  end if;

  if (select count(*) from public.stock_items) < 1 then
    raise exception 'restored Production bundle contains no stock items';
  end if;

  if (select count(*) from public.stock_movements) < 1 then
    raise exception 'restored Production bundle contains no stock movements';
  end if;

  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.organizations'::regclass
  ) then
    raise exception 'RLS was not restored on public.organizations';
  end if;

  if not (
    select relrowsecurity
    from pg_class
    where oid = 'public.stock_movements'::regclass
  ) then
    raise exception 'RLS was not restored on public.stock_movements';
  end if;

  if has_table_privilege('authenticated', 'public.stock_movements', 'INSERT') then
    raise exception 'authenticated unexpectedly gained direct INSERT on restored stock_movements';
  end if;

  if to_regprocedure(
    'public.record_stock_entry(uuid,uuid,uuid,uuid,numeric,numeric,text,date,text)'
  ) is null then
    raise exception 'critical record_stock_entry function is missing after restore';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.stock_movements'::regclass
      and conname = 'stock_movements_reversal_of_movement_id_organization_id_fkey'
      and contype = 'f'
      and convalidated
  ) then
    raise exception 'stock_movements self-reference foreign key is missing or invalid after restore';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.payments'::regclass
      and conname = 'payments_reverses_payment_id_organization_id_fkey'
      and contype = 'f'
      and convalidated
  ) then
    raise exception 'payments self-reference foreign key is missing or invalid after restore';
  end if;

  -- Data was imported with session_replication_role=replica so COPY order can
  -- cross self-referential/cyclic foreign keys. Re-check every FK whose child
  -- table is public. This verifies the actual restored rows rather than merely
  -- trusting pg_constraint.convalidated, which predates the data import.
  for fk in
    select
      constraint_row.oid,
      constraint_row.conname,
      constraint_row.conrelid,
      constraint_row.confrelid,
      constraint_row.conkey,
      constraint_row.confkey,
      constraint_row.confmatchtype,
      child_namespace.nspname as child_schema,
      child_table.relname as child_table,
      parent_namespace.nspname as parent_schema,
      parent_table.relname as parent_table
    from pg_constraint constraint_row
    join pg_class child_table
      on child_table.oid = constraint_row.conrelid
    join pg_namespace child_namespace
      on child_namespace.oid = child_table.relnamespace
    join pg_class parent_table
      on parent_table.oid = constraint_row.confrelid
    join pg_namespace parent_namespace
      on parent_namespace.oid = parent_table.relnamespace
    where constraint_row.contype = 'f'
      and child_namespace.nspname = 'public'
    order by child_namespace.nspname, child_table.relname, constraint_row.conname
  loop
    if fk.confmatchtype <> 's' then
      raise exception 'unsupported non-MATCH-SIMPLE FK % on %.%',
        fk.conname, fk.child_schema, fk.child_table;
    end if;

    select
      string_agg(format('child.%I is not null', child_attribute.attname), ' and ' order by key_pair.ord),
      string_agg(format('parent.%I = child.%I', parent_attribute.attname, child_attribute.attname), ' and ' order by key_pair.ord)
    into child_not_null_predicate, parent_match_predicate
    from unnest(fk.conkey, fk.confkey) with ordinality
      as key_pair(child_attnum, parent_attnum, ord)
    join pg_attribute child_attribute
      on child_attribute.attrelid = fk.conrelid
     and child_attribute.attnum = key_pair.child_attnum
    join pg_attribute parent_attribute
      on parent_attribute.attrelid = fk.confrelid
     and parent_attribute.attnum = key_pair.parent_attnum;

    if child_not_null_predicate is null or parent_match_predicate is null then
      raise exception 'could not derive FK validation predicate for %', fk.conname;
    end if;

    execute format(
      'select exists (select 1 from %I.%I child where %s and not exists (select 1 from %I.%I parent where %s))',
      fk.child_schema,
      fk.child_table,
      child_not_null_predicate,
      fk.parent_schema,
      fk.parent_table,
      parent_match_predicate
    ) into has_violation;

    if has_violation then
      raise exception 'restored Production data violates foreign key % on %.%',
        fk.conname, fk.child_schema, fk.child_table;
    end if;
  end loop;
end;
$$;

select 'production bundle restore tests passed' as result;
