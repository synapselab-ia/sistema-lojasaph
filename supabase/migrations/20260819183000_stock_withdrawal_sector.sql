create or replace function private.record_stock_withdrawal(
  p_command_id uuid,
  p_organization_id uuid,
  p_stock_item_id uuid,
  p_stock_location_id uuid,
  p_sector_id uuid,
  p_quantity numeric,
  p_preferred_batch_id uuid,
  p_notes text
)
returns table (
  movement_id uuid,
  quantity_on_hand numeric,
  average_cost numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing_sector_id uuid;
  v_command_existed boolean;
begin
  if p_sector_id is null then
    raise exception 'STOCK_WITHDRAWAL_SECTOR_REQUIRED' using errcode = '22023';
  end if;

  -- Serialize the sector-specific idempotency check with the shared outflow command.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_command_id::text, 0));

  select movement.sector_id
    into v_existing_sector_id
  from public.stock_movements movement
  where movement.id = p_command_id;

  v_command_existed := found;

  if v_command_existed and v_existing_sector_id is distinct from p_sector_id then
    raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
  end if;

  return query
  select *
  from private.record_stock_outflow(
    p_command_id,
    p_organization_id,
    p_stock_item_id,
    p_stock_location_id,
    p_quantity,
    p_preferred_batch_id,
    p_notes,
    'withdrawal',
    'manual_withdrawal',
    'stock_withdrawal.recorded',
    'record_stock_withdrawal_rpc'
  );

  if not v_command_existed then
    update public.stock_movements
    set sector_id = p_sector_id
    where id = p_command_id
      and organization_id = p_organization_id
      and movement_type = 'withdrawal';

    if not found then
      raise exception 'STOCK_WITHDRAWAL_MOVEMENT_NOT_FOUND' using errcode = '23503';
    end if;

    update public.audit_logs
    set after_data = after_data || jsonb_build_object('sector_id', p_sector_id)
    where organization_id = p_organization_id
      and entity_type = 'stock_movement'
      and entity_id = p_command_id
      and action = 'stock_withdrawal.recorded';

    if not found then
      raise exception 'STOCK_WITHDRAWAL_AUDIT_NOT_FOUND' using errcode = '23503';
    end if;
  end if;
end;
$$;

revoke all on function private.record_stock_withdrawal(uuid, uuid, uuid, uuid, uuid, numeric, uuid, text)
  from public, anon, authenticated;

-- Remove the exposed legacy command before publishing the sector-aware signature.
drop function public.record_stock_withdrawal(uuid, uuid, uuid, uuid, numeric, uuid, text);
drop function private.record_stock_withdrawal(uuid, uuid, uuid, uuid, numeric, uuid, text);

create function public.record_stock_withdrawal(
  p_command_id uuid,
  p_organization_id uuid,
  p_stock_item_id uuid,
  p_stock_location_id uuid,
  p_sector_id uuid,
  p_quantity numeric,
  p_preferred_batch_id uuid default null,
  p_notes text default null
)
returns table (
  movement_id uuid,
  quantity_on_hand numeric,
  average_cost numeric
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_sector_id is null then
    raise exception 'STOCK_WITHDRAWAL_SECTOR_REQUIRED' using errcode = '22023';
  end if;

  if not private.has_org_role(
    p_organization_id,
    array['owner', 'admin', 'manager', 'inventory']
  ) then
    raise exception 'INSUFFICIENT_ROLE' using errcode = '42501';
  end if;

  if not private.has_stock_location_role(
    p_organization_id,
    p_stock_location_id,
    array['owner', 'admin', 'manager', 'inventory']
  ) then
    raise exception 'INSUFFICIENT_SCOPE' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.sectors sector
    where sector.id = p_sector_id
      and sector.organization_id = p_organization_id
      and sector.status = 'active'
  ) then
    raise exception 'STOCK_WITHDRAWAL_SECTOR_NOT_AVAILABLE' using errcode = '23503';
  end if;

  if not private.has_sector_role(
    p_organization_id,
    p_sector_id,
    array['owner', 'admin', 'manager', 'inventory']
  ) then
    raise exception 'INSUFFICIENT_SCOPE' using errcode = '42501';
  end if;

  return query
  select *
  from private.record_stock_withdrawal(
    p_command_id,
    p_organization_id,
    p_stock_item_id,
    p_stock_location_id,
    p_sector_id,
    p_quantity,
    p_preferred_batch_id,
    p_notes
  );
end;
$$;

revoke all on function public.record_stock_withdrawal(uuid, uuid, uuid, uuid, uuid, numeric, uuid, text)
  from public, anon;
grant execute on function public.record_stock_withdrawal(uuid, uuid, uuid, uuid, uuid, numeric, uuid, text)
  to authenticated;
