-- Issue #83 / REQ-SEC-003: audit stock-critical configuration writes that
-- legitimately use the Data API instead of transactional command RPCs.
--
-- The audit snapshots are deliberately whitelisted. They exclude timestamps
-- and unrelated fiscal/external identifiers, so an idempotent upsert does not
-- produce audit noise and the trail stores only operationally relevant fields.

create or replace function private.audit_critical_inventory_configuration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new jsonb := to_jsonb(new);
  v_old jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  v_before jsonb;
  v_after jsonb;
  v_organization_id uuid;
  v_entity_id uuid;
  v_entity_type text;
  v_action text;
begin
  if tg_op not in ('INSERT', 'UPDATE') then
    raise exception 'CRITICAL_CONFIG_AUDIT_OPERATION_NOT_SUPPORTED' using errcode = '0A000';
  end if;

  v_organization_id := (v_new ->> 'organization_id')::uuid;
  v_entity_id := (v_new ->> 'id')::uuid;

  case tg_table_name
    when 'stock_items' then
      v_entity_type := 'stock_item';
      v_after := jsonb_build_object(
        'organization_id', v_new -> 'organization_id',
        'category_id', v_new -> 'category_id',
        'base_unit_id', v_new -> 'base_unit_id',
        'name', v_new -> 'name',
        'internal_code', v_new -> 'internal_code',
        'item_type', v_new -> 'item_type',
        'active', v_new -> 'active',
        'track_expiration', v_new -> 'track_expiration',
        'track_batch', v_new -> 'track_batch',
        'is_returnable', v_new -> 'is_returnable'
      );
      if tg_op = 'UPDATE' then
        v_before := jsonb_build_object(
          'organization_id', v_old -> 'organization_id',
          'category_id', v_old -> 'category_id',
          'base_unit_id', v_old -> 'base_unit_id',
          'name', v_old -> 'name',
          'internal_code', v_old -> 'internal_code',
          'item_type', v_old -> 'item_type',
          'active', v_old -> 'active',
          'track_expiration', v_old -> 'track_expiration',
          'track_batch', v_old -> 'track_batch',
          'is_returnable', v_old -> 'is_returnable'
        );
      end if;

    when 'stock_locations' then
      v_entity_type := 'stock_location';
      v_after := jsonb_build_object(
        'organization_id', v_new -> 'organization_id',
        'unit_id', v_new -> 'unit_id',
        'sector_id', v_new -> 'sector_id',
        'name', v_new -> 'name',
        'code', v_new -> 'code',
        'location_type', v_new -> 'location_type',
        'allow_negative_stock', v_new -> 'allow_negative_stock',
        'status', v_new -> 'status'
      );
      if tg_op = 'UPDATE' then
        v_before := jsonb_build_object(
          'organization_id', v_old -> 'organization_id',
          'unit_id', v_old -> 'unit_id',
          'sector_id', v_old -> 'sector_id',
          'name', v_old -> 'name',
          'code', v_old -> 'code',
          'location_type', v_old -> 'location_type',
          'allow_negative_stock', v_old -> 'allow_negative_stock',
          'status', v_old -> 'status'
        );
      end if;

    when 'stock_loss_reasons' then
      v_entity_type := 'stock_loss_reason';
      v_after := jsonb_build_object(
        'organization_id', v_new -> 'organization_id',
        'code', v_new -> 'code',
        'label', v_new -> 'label',
        'movement_type', v_new -> 'movement_type',
        'active', v_new -> 'active'
      );
      if tg_op = 'UPDATE' then
        v_before := jsonb_build_object(
          'organization_id', v_old -> 'organization_id',
          'code', v_old -> 'code',
          'label', v_old -> 'label',
          'movement_type', v_old -> 'movement_type',
          'active', v_old -> 'active'
        );
      end if;

    else
      raise exception 'CRITICAL_CONFIG_AUDIT_TABLE_NOT_SUPPORTED: %', tg_table_name using errcode = '0A000';
  end case;

  -- Existing updated_at triggers make the physical row different even when an
  -- upsert repeats the same semantic payload. Compare only the whitelisted
  -- business fields so retries/no-op updates do not duplicate audit events.
  if tg_op = 'UPDATE' and v_before = v_after then
    return new;
  end if;

  v_action := v_entity_type || case when tg_op = 'INSERT' then '.created' else '.updated' end;

  insert into public.audit_logs (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    metadata
  ) values (
    v_organization_id,
    auth.uid(),
    v_action,
    v_entity_type,
    v_entity_id,
    v_before,
    v_after,
    jsonb_build_object(
      'source', 'critical_configuration_trigger',
      'operation', lower(tg_op)
    )
  );

  return new;
end;
$$;

revoke all on function private.audit_critical_inventory_configuration()
  from public, anon, authenticated, service_role;

create trigger stock_items_critical_config_audit
after insert or update on public.stock_items
for each row execute function private.audit_critical_inventory_configuration();

create trigger stock_locations_critical_config_audit
after insert or update on public.stock_locations
for each row execute function private.audit_critical_inventory_configuration();

create trigger stock_loss_reasons_critical_config_audit
after insert or update on public.stock_loss_reasons
for each row execute function private.audit_critical_inventory_configuration();
