\set ON_ERROR_STOP on

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

-- The main inventory suite leaves the stale count at location 122 open.
select * from public.cancel_inventory_count(
  '61000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000200'
);

-- Same cancellation command is idempotent.
select * from public.cancel_inventory_count(
  '61000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000200'
);

-- Same command id cannot target another session.
do $$
begin
  begin
    perform public.cancel_inventory_count(
      '61000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000100'
    );
    raise exception 'cancel idempotency conflict unexpectedly succeeded';
  exception
    when unique_violation then null;
  end;
end;
$$;

-- Confirmed inventory is immutable and cannot be cancelled.
do $$
begin
  begin
    perform public.cancel_inventory_count(
      '61000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000001'
    );
    raise exception 'confirmed inventory count unexpectedly cancelled';
  exception
    when invalid_parameter_value then null;
  end;
end;
$$;

-- Cancelling frees the partial unique index, so the same location can be inventoried again.
select * from public.start_inventory_count(
  '61000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000122'
);

select * from public.cancel_inventory_count(
  '61000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000001',
  '61000000-0000-4000-8000-000000000010'
);

reset role;

do $$
begin
  if (select status from public.inventory_counts where id='60000000-0000-4000-8000-000000000200') <> 'cancelled' then
    raise exception 'stale inventory was not cancelled';
  end if;
  if (select count(*) from public.audit_logs where entity_id='60000000-0000-4000-8000-000000000200' and action='inventory_count.cancelled') <> 1 then
    raise exception 'cancel retry duplicated audit';
  end if;
  if (select status from public.inventory_counts where id='61000000-0000-4000-8000-000000000010') <> 'cancelled' then
    raise exception 'replacement inventory session did not cancel';
  end if;
end;
$$;

select 'inventory count cancellation tests passed' as result;
