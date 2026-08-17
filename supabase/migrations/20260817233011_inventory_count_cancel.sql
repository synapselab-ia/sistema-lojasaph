create or replace function public.cancel_inventory_count(
  p_command_id uuid,
  p_organization_id uuid,
  p_inventory_count_id uuid
)
returns table (
  inventory_count_id uuid,
  inventory_count_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_existing_count_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if not private.has_org_role(
    p_organization_id,
    array['owner', 'admin', 'manager', 'inventory']
  ) then
    raise exception 'INSUFFICIENT_ROLE' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_command_id::text, 0)
  );

  select audit.entity_id
    into v_existing_count_id
  from public.audit_logs audit
  where audit.organization_id = p_organization_id
    and audit.action = 'inventory_count.cancelled'
    and audit.metadata ->> 'command_id' = p_command_id::text
  order by audit.occurred_at desc
  limit 1;

  if found then
    if v_existing_count_id <> p_inventory_count_id then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT' using errcode = '23505';
    end if;
    return query select p_inventory_count_id, 'cancelled'::text;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('inventory_count:' || p_inventory_count_id::text, 0)
  );

  select inventory_count.status
    into v_status
  from public.inventory_counts inventory_count
  where inventory_count.id = p_inventory_count_id
    and inventory_count.organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'INVENTORY_COUNT_NOT_FOUND' using errcode = '23503';
  end if;

  if v_status = 'confirmed' then
    raise exception 'CONFIRMED_INVENTORY_COUNT_IMMUTABLE' using errcode = '22023';
  end if;

  if v_status = 'cancelled' then
    raise exception 'INVENTORY_COUNT_ALREADY_CANCELLED' using errcode = '22023';
  end if;

  update public.inventory_counts inventory_count
  set status = 'cancelled',
      updated_at = now()
  where inventory_count.id = p_inventory_count_id
    and inventory_count.organization_id = p_organization_id;

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
    'inventory_count.cancelled',
    'inventory_count',
    p_inventory_count_id,
    jsonb_build_object('status', 'cancelled'),
    jsonb_build_object(
      'source', 'cancel_inventory_count_rpc',
      'command_id', p_command_id
    )
  );

  return query select p_inventory_count_id, 'cancelled'::text;
end;
$$;

revoke all on function public.cancel_inventory_count(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.cancel_inventory_count(uuid, uuid, uuid)
  to authenticated;
