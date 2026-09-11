\set ON_ERROR_STOP on

insert into public.organizations(id,name,timezone,currency) values
 ('99000000-0000-4000-8000-000000000001','Composição CI','America/Sao_Paulo','BRL');

insert into auth.users(id,email) values
 ('99000000-0000-4000-8000-000000000201','composition-owner@example.invalid'),
 ('99000000-0000-4000-8000-000000000202','composition-inventory@example.invalid');

insert into public.organization_memberships(organization_id,user_id,role,active) values
 ('99000000-0000-4000-8000-000000000001','99000000-0000-4000-8000-000000000201','owner',true),
 ('99000000-0000-4000-8000-000000000001','99000000-0000-4000-8000-000000000202','inventory',true);

do $$
begin
  if not has_table_privilege('authenticated','public.organization_capability_settings','SELECT') then
    raise exception 'authenticated cannot read organization capability settings';
  end if;
  if has_table_privilege('authenticated','public.organization_capability_settings','INSERT')
     or has_table_privilege('authenticated','public.organization_capability_settings','UPDATE')
     or has_table_privilege('authenticated','public.organization_capability_settings','DELETE')
  then
    raise exception 'authenticated received direct capability write privileges';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.set_organization_capability(uuid,text,boolean)',
    'EXECUTE'
  ) then
    raise exception 'authenticated cannot execute capability setter';
  end if;
  if not private.is_capability_enabled('99000000-0000-4000-8000-000000000001','stock-loans') then
    raise exception 'stock-loans must default to enabled when no override exists';
  end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000202',false);
select set_config('request.jwt.claim.role','authenticated',false);

do $$
begin
  begin
    perform public.set_organization_capability(
      '99000000-0000-4000-8000-000000000001',
      'stock-loans',
      false
    );
    raise exception 'non-owner unexpectedly changed composition';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000201',false);
select set_config('request.jwt.claim.role','authenticated',false);
select public.set_organization_capability(
  '99000000-0000-4000-8000-000000000001',
  'stock-loans',
  false
);
reset role;

do $$
begin
  if private.is_capability_enabled('99000000-0000-4000-8000-000000000001','stock-loans') then
    raise exception 'stock-loans remained enabled after owner disabled it';
  end if;
  if (
    select count(*)
    from public.audit_logs
    where organization_id='99000000-0000-4000-8000-000000000001'
      and action='organization_capability.changed'
      and after_data->>'capability_id'='stock-loans'
      and after_data->>'enabled'='false'
  ) <> 1 then
    raise exception 'capability disable audit missing or duplicated';
  end if;
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000202',false);
select set_config('request.jwt.claim.role','authenticated',false);

do $$
declare
  v_message text;
begin
  begin
    perform public.record_stock_loan(
      '99000000-0000-4000-8000-000000000701',
      '99000000-0000-4000-8000-000000000001',
      '99000000-0000-4000-8000-000000000401',
      '99000000-0000-4000-8000-000000000121',
      'Bloqueado pelo compositor',
      1.000,
      null,
      'CI capability gate'
    );
    raise exception 'disabled stock-loans capability unexpectedly accepted a new loan';
  exception when insufficient_privilege then
    get stacked diagnostics v_message = message_text;
    if v_message not like 'CAPABILITY_DISABLED:%' then
      raise exception 'stock-loans failed for another reason: %', v_message;
    end if;
  end;
end $$;

-- A configuração é visível ao membro, mas continua sem DML direto.
do $$
begin
  if (
    select count(*)
    from public.organization_capability_settings
    where organization_id='99000000-0000-4000-8000-000000000001'
      and capability_id='stock-loans'
      and enabled=false
  ) <> 1 then
    raise exception 'member cannot resolve disabled capability setting';
  end if;
end $$;

reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000201',false);
select set_config('request.jwt.claim.role','authenticated',false);
select public.set_organization_capability(
  '99000000-0000-4000-8000-000000000001',
  'stock-loans',
  true
);
reset role;

do $$
begin
  if not private.is_capability_enabled('99000000-0000-4000-8000-000000000001','stock-loans') then
    raise exception 'stock-loans did not reactivate';
  end if;
  if (
    select count(*)
    from public.audit_logs
    where organization_id='99000000-0000-4000-8000-000000000001'
      and action='organization_capability.changed'
      and after_data->>'capability_id'='stock-loans'
  ) <> 2 then
    raise exception 'capability reactivation audit missing';
  end if;
end $$;
