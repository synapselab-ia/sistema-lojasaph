\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email)
values ('97000000-0000-4000-8000-000000000001', 'critical-config-auditor@example.invalid')
on conflict (id) do nothing;

insert into public.organization_memberships (organization_id, user_id, role, active)
values (
  '00000000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000001',
  'manager',
  true
)
on conflict do nothing;

set role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

-- Critical location policy changes are legitimate direct Data API writes and
-- must produce an audit event in the same transaction.
insert into public.stock_locations (
  id,
  organization_id,
  unit_id,
  sector_id,
  name,
  code,
  location_type,
  allow_negative_stock,
  status
) values (
  '97000000-0000-4000-8000-000000000100',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000100',
  null,
  'Audit Location',
  'audit-location',
  'warehouse',
  false,
  'active'
);

-- SupabaseStockItemRepository.save() uses this upsert shape in the runtime.
insert into public.stock_items (
  id,
  organization_id,
  category_id,
  base_unit_id,
  name,
  internal_code,
  item_type,
  active,
  track_expiration,
  track_batch,
  is_returnable
) values (
  '97000000-0000-4000-8000-000000000200',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000302',
  '00000000-0000-4000-8000-000000000200',
  'Audit Item',
  'AUDIT-ITEM',
  'supply',
  true,
  false,
  false,
  false
);

-- Retry the exact semantic payload. updated_at changes physically, but the
-- audit trigger must compare only whitelisted business fields and stay quiet.
insert into public.stock_items (
  id,
  organization_id,
  category_id,
  base_unit_id,
  name,
  internal_code,
  item_type,
  active,
  track_expiration,
  track_batch,
  is_returnable
) values (
  '97000000-0000-4000-8000-000000000200',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000302',
  '00000000-0000-4000-8000-000000000200',
  'Audit Item',
  'AUDIT-ITEM',
  'supply',
  true,
  false,
  false,
  false
)
on conflict (id) do update set
  organization_id = excluded.organization_id,
  category_id = excluded.category_id,
  base_unit_id = excluded.base_unit_id,
  name = excluded.name,
  internal_code = excluded.internal_code,
  item_type = excluded.item_type,
  active = excluded.active,
  track_expiration = excluded.track_expiration,
  track_batch = excluded.track_batch,
  is_returnable = excluded.is_returnable;

update public.stock_items
set track_expiration = true,
    track_batch = true
where id = '97000000-0000-4000-8000-000000000200';

insert into public.stock_loss_reasons (
  id,
  organization_id,
  code,
  label,
  movement_type,
  active
) values (
  '97000000-0000-4000-8000-000000000300',
  '00000000-0000-4000-8000-000000000001',
  'audit_custom_reason',
  'Audit custom reason',
  'loss',
  true
);

update public.stock_loss_reasons
set active = false
where id = '97000000-0000-4000-8000-000000000300';

update public.stock_locations
set allow_negative_stock = true
where id = '97000000-0000-4000-8000-000000000100';

-- The audit row must roll back together with the business mutation.
savepoint audit_rollback_probe;
update public.stock_items
set is_returnable = true
where id = '97000000-0000-4000-8000-000000000200';
rollback to savepoint audit_rollback_probe;
release savepoint audit_rollback_probe;

reset role;

do $$
declare
  v_actor uuid := '97000000-0000-4000-8000-000000000001';
  v_event record;
begin
  if (
    select count(*)
    from public.audit_logs
    where entity_id = '97000000-0000-4000-8000-000000000100'
      and action = 'stock_location.created'
      and actor_user_id = v_actor
  ) <> 1 then
    raise exception 'stock location creation audit missing or duplicated';
  end if;

  if (
    select count(*)
    from public.audit_logs
    where entity_id = '97000000-0000-4000-8000-000000000100'
      and action = 'stock_location.updated'
      and actor_user_id = v_actor
  ) <> 1 then
    raise exception 'stock location update audit missing or duplicated';
  end if;

  select * into v_event
  from public.audit_logs
  where entity_id = '97000000-0000-4000-8000-000000000100'
    and action = 'stock_location.updated';

  if (v_event.before_data ->> 'allow_negative_stock')::boolean is distinct from false
     or (v_event.after_data ->> 'allow_negative_stock')::boolean is distinct from true then
    raise exception 'stock location audit did not preserve negative-stock policy change';
  end if;

  if (
    select count(*)
    from public.audit_logs
    where entity_id = '97000000-0000-4000-8000-000000000200'
      and action = 'stock_item.created'
      and actor_user_id = v_actor
  ) <> 1 then
    raise exception 'stock item creation audit missing or duplicated';
  end if;

  -- Exactly one UPDATE proves both that the semantic change was audited and
  -- that the identical upsert retry plus rolled-back update left no extra row.
  if (
    select count(*)
    from public.audit_logs
    where entity_id = '97000000-0000-4000-8000-000000000200'
      and action = 'stock_item.updated'
      and actor_user_id = v_actor
  ) <> 1 then
    raise exception 'stock item audit was duplicated by retry/rollback or update audit is missing';
  end if;

  select * into v_event
  from public.audit_logs
  where entity_id = '97000000-0000-4000-8000-000000000200'
    and action = 'stock_item.updated';

  if (v_event.before_data ->> 'track_batch')::boolean is distinct from false
     or (v_event.after_data ->> 'track_batch')::boolean is distinct from true
     or (v_event.before_data ->> 'track_expiration')::boolean is distinct from false
     or (v_event.after_data ->> 'track_expiration')::boolean is distinct from true then
    raise exception 'stock item audit did not preserve tracking configuration change';
  end if;

  if (v_event.after_data ->> 'is_returnable')::boolean is distinct from false
     or (select is_returnable from public.stock_items where id = '97000000-0000-4000-8000-000000000200') is distinct from false then
    raise exception 'rolled-back stock item mutation leaked into row or audit trail';
  end if;

  if v_event.after_data ? 'ean'
     or v_event.after_data ? 'ncm'
     or v_event.after_data ? 'cest'
     or v_event.after_data ? 'created_at'
     or v_event.after_data ? 'updated_at' then
    raise exception 'stock item audit snapshot contains fields outside the approved whitelist';
  end if;

  if v_event.metadata ->> 'source' <> 'critical_configuration_trigger' then
    raise exception 'critical configuration audit source metadata missing';
  end if;

  if (
    select count(*)
    from public.audit_logs
    where entity_id = '97000000-0000-4000-8000-000000000300'
      and action = 'stock_loss_reason.created'
      and actor_user_id = v_actor
  ) <> 1 then
    raise exception 'stock loss reason creation audit missing or duplicated';
  end if;

  if (
    select count(*)
    from public.audit_logs
    where entity_id = '97000000-0000-4000-8000-000000000300'
      and action = 'stock_loss_reason.updated'
      and actor_user_id = v_actor
  ) <> 1 then
    raise exception 'stock loss reason update audit missing or duplicated';
  end if;

  select * into v_event
  from public.audit_logs
  where entity_id = '97000000-0000-4000-8000-000000000300'
    and action = 'stock_loss_reason.updated';

  if (v_event.before_data ->> 'active')::boolean is distinct from true
     or (v_event.after_data ->> 'active')::boolean is distinct from false then
    raise exception 'stock loss reason audit did not preserve activation change';
  end if;

  if (
    select count(*)
    from public.audit_logs
    where entity_id in (
      '97000000-0000-4000-8000-000000000100',
      '97000000-0000-4000-8000-000000000200',
      '97000000-0000-4000-8000-000000000300'
    )
      and actor_user_id = v_actor
  ) <> 6 then
    raise exception 'unexpected critical configuration audit event count';
  end if;
end;
$$;

do $$
declare
  trigger_count integer;
begin
  select count(*) into trigger_count
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and t.tgname in (
      'stock_items_critical_config_audit',
      'stock_locations_critical_config_audit',
      'stock_loss_reasons_critical_config_audit'
    )
    and not t.tgisinternal;

  if trigger_count <> 3 then
    raise exception 'critical configuration audit trigger set is incomplete';
  end if;

  if has_function_privilege('anon', 'private.audit_critical_inventory_configuration()', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.audit_critical_inventory_configuration()', 'EXECUTE')
     or has_function_privilege('service_role', 'private.audit_critical_inventory_configuration()', 'EXECUTE') then
    raise exception 'critical configuration audit trigger function is directly executable by an API role';
  end if;

  if not (select relrowsecurity from pg_class where oid = 'public.audit_logs'::regclass) then
    raise exception 'audit_logs lost RLS';
  end if;

  if not has_table_privilege('authenticated', 'public.audit_logs', 'SELECT')
     or has_table_privilege('authenticated', 'public.audit_logs', 'INSERT')
     or has_table_privilege('authenticated', 'public.audit_logs', 'UPDATE')
     or has_table_privilege('authenticated', 'public.audit_logs', 'DELETE')
     or has_table_privilege('anon', 'public.audit_logs', 'SELECT') then
    raise exception 'audit_logs object privileges regressed';
  end if;
end;
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
do $$
begin
  begin
    insert into public.audit_logs (
      organization_id,
      actor_user_id,
      action,
      entity_type,
      metadata
    ) values (
      '00000000-0000-4000-8000-000000000001',
      '97000000-0000-4000-8000-000000000001',
      'forbidden.direct_write',
      'probe',
      '{}'::jsonb
    );
    raise exception 'authenticated client unexpectedly inserted audit log directly';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;
reset role;

rollback;

select 'critical configuration audit tests passed' as result;
