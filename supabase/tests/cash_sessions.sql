\set ON_ERROR_STOP on

insert into auth.users(id,email) values
 ('91000000-0000-4000-8000-000000000001','cash-manager@example.invalid'),
 ('91000000-0000-4000-8000-000000000002','cashier@example.invalid'),
 ('91000000-0000-4000-8000-000000000003','cash-viewer@example.invalid'),
 ('91000000-0000-4000-8000-000000000004','other-cashier@example.invalid')
on conflict(id) do nothing;

insert into public.organization_memberships(organization_id,user_id,role,active) values
 ('00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','manager',true),
 ('00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','cashier',true),
 ('00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000003','viewer',true)
on conflict do nothing;

insert into public.organizations(id,name,timezone,currency)
values('91000000-0000-4000-8000-000000000100','Other Cash Org','America/Sao_Paulo','BRL')
on conflict(id) do nothing;
insert into public.businesses(id,organization_id,name,code)
values('91000000-0000-4000-8000-000000000110','91000000-0000-4000-8000-000000000100','Other Cash Business','other-cash')
on conflict(id) do nothing;
insert into public.units(id,organization_id,business_id,name,code)
values('91000000-0000-4000-8000-000000000120','91000000-0000-4000-8000-000000000100','91000000-0000-4000-8000-000000000110','Other Cash Unit','other-cash-unit')
on conflict(id) do nothing;
insert into public.organization_memberships(organization_id,user_id,role,active)
values('91000000-0000-4000-8000-000000000100','91000000-0000-4000-8000-000000000004','cashier',true)
on conflict do nothing;

-- Manager configures register, optional payment methods and a versioned card fee rule.
set role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claim.role','authenticated',false);

select * from public.create_cash_register('91000000-0000-4000-8000-000000000200','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000100','Caixa principal','principal');
select * from public.create_payment_method('91000000-0000-4000-8000-000000000210','00000000-0000-4000-8000-000000000001','dinheiro','Dinheiro','cash',true);
select * from public.create_payment_method('91000000-0000-4000-8000-000000000211','00000000-0000-4000-8000-000000000001','credito','Crédito','card',false);
select * from public.create_payment_method('91000000-0000-4000-8000-000000000212','00000000-0000-4000-8000-000000000001','pix','Pix','instant',false);
select * from public.create_payment_method('91000000-0000-4000-8000-000000000213','00000000-0000-4000-8000-000000000001','voucher','Voucher','voucher',false);
select * from public.create_fee_rule('91000000-0000-4000-8000-000000000220','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000211',current_date,null,2.0,0,'Taxa demo 2%');

-- Direct writes stay forbidden.
do $$ begin
  begin
    insert into public.cash_sessions(id,organization_id,cash_register_id,business_date,opening_float)
    values(gen_random_uuid(),'00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000200',current_date,0);
    raise exception 'manager unexpectedly wrote cash session directly';
  exception when insufficient_privilege then null; end;
end $$;

-- Cashier may operate sessions but not alter configuration.
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',false);
do $$ begin
  begin
    perform public.create_payment_method('91000000-0000-4000-8000-000000000299','00000000-0000-4000-8000-000000000001','forbidden','Forbidden','other',false);
    raise exception 'cashier unexpectedly configured payment method';
  exception when insufficient_privilege then null; end;
end $$;

select * from public.open_cash_session('91000000-0000-4000-8000-000000000300','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000200',current_date,1,100.00,'abertura teste');
select * from public.open_cash_session('91000000-0000-4000-8000-000000000300','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000200',current_date,1,100.00,'abertura teste');

-- Same register/date/sequence cannot open under another command.
do $$ begin
  begin
    perform public.open_cash_session('91000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000200',current_date,1,100.00,'duplicada');
    raise exception 'duplicate cash session identity unexpectedly accepted';
  exception when unique_violation then null; end;
end $$;

-- Consolidated totals. Card fee is calculated from selected versioned rule.
select * from public.set_cash_payment_total('91000000-0000-4000-8000-000000000310','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000300','91000000-0000-4000-8000-000000000210',500.00,0,null);
select * from public.set_cash_payment_total('91000000-0000-4000-8000-000000000311','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000300','91000000-0000-4000-8000-000000000211',1000.00,null,'91000000-0000-4000-8000-000000000220');
select * from public.set_cash_payment_total('91000000-0000-4000-8000-000000000312','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000300','91000000-0000-4000-8000-000000000212',300.00,null,null);
select * from public.set_cash_payment_total('91000000-0000-4000-8000-000000000313','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000300','91000000-0000-4000-8000-000000000213',50.00,null,null);
select * from public.set_cash_payment_total('91000000-0000-4000-8000-000000000311','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000300','91000000-0000-4000-8000-000000000211',1000.00,null,'91000000-0000-4000-8000-000000000220');

do $$ begin
  if (select fee_amount from public.payment_method_totals where cash_session_id='91000000-0000-4000-8000-000000000300' and payment_method_id='91000000-0000-4000-8000-000000000211')<>20.00 then raise exception 'card fee rule mismatch'; end if;
  if (select net_amount from public.payment_method_totals where cash_session_id='91000000-0000-4000-8000-000000000300' and payment_method_id='91000000-0000-4000-8000-000000000211')<>980.00 then raise exception 'card net mismatch'; end if;
  if (select count(*) from public.payment_method_totals where cash_session_id='91000000-0000-4000-8000-000000000300')<>4 then raise exception 'payment total retry duplicated row'; end if;
  if (select count(*) from public.payment_methods where id='91000000-0000-4000-8000-000000000213' and method_kind='voucher')<>1 then raise exception 'optional voucher method not preserved'; end if;
end $$;

-- Cash movements are append-only. Employee consumption is separate and does not affect expected drawer cash.
select * from public.record_cash_movement('91000000-0000-4000-8000-000000000320','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000300','cash_in',100.00,'2026-08-18T12:00:00Z','entrada teste');
select * from public.record_cash_movement('91000000-0000-4000-8000-000000000321','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000300','cash_out',40.00,'2026-08-18T12:10:00Z','sangria teste');
select * from public.record_cash_movement('91000000-0000-4000-8000-000000000322','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000300','employee_consumption',25.00,'2026-08-18T12:20:00Z','categoria separada');

-- Expected = 100 opening + 500 cash-method gross + 100 in - 40 out = 660. Counted 650 => -10.
select * from public.close_cash_session('91000000-0000-4000-8000-000000000330','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000300',650.00,'fechamento teste');
select * from public.close_cash_session('91000000-0000-4000-8000-000000000330','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000300',650.00,'fechamento teste');

do $$ begin
  if (select expected_cash_amount from public.cash_sessions where id='91000000-0000-4000-8000-000000000300')<>660.00 then raise exception 'expected cash mismatch'; end if;
  if (select cash_difference from public.cash_sessions where id='91000000-0000-4000-8000-000000000300')<>-10.00 then raise exception 'cash difference mismatch'; end if;
  if (select status from public.cash_sessions where id='91000000-0000-4000-8000-000000000300')<>'closed' then raise exception 'cash session did not close'; end if;
  if (select coalesce(sum(amount),0) from public.cash_movements where cash_session_id='91000000-0000-4000-8000-000000000300' and movement_type='employee_consumption')<>25.00 then raise exception 'employee consumption category lost'; end if;
  begin
    perform public.record_cash_movement('91000000-0000-4000-8000-000000000323','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000300','cash_in',1.00,now(),'closed denied');
    raise exception 'movement on closed session unexpectedly accepted';
  exception when invalid_parameter_value then null; end;
end $$;

-- A second sequence can be opened and cancelled without deleting its history.
select * from public.open_cash_session('91000000-0000-4000-8000-000000000340','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000200',current_date,2,0,'segunda sequencia');
select * from public.cancel_cash_session('91000000-0000-4000-8000-000000000341','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000340','cancelar teste');
select * from public.cancel_cash_session('91000000-0000-4000-8000-000000000341','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000340','cancelar teste');
do $$ begin
  begin
    perform public.cancel_cash_session('91000000-0000-4000-8000-000000000341','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000340','motivo diferente');
    raise exception 'cancel idempotency conflict unexpectedly accepted';
  exception when unique_violation then null; end;
end $$;

-- Viewer sees same-org sessions but cannot mutate.
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',false);
do $$ begin
  if (select count(*) from public.cash_sessions where organization_id='00000000-0000-4000-8000-000000000001' and id in ('91000000-0000-4000-8000-000000000300','91000000-0000-4000-8000-000000000340'))<>2 then raise exception 'viewer should read same-org cash sessions'; end if;
  begin
    perform public.open_cash_session('91000000-0000-4000-8000-000000000350','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000200',current_date,3,0,'viewer denied');
    raise exception 'viewer unexpectedly opened cash session';
  exception when insufficient_privilege then null; end;
end $$;

-- Other-org cashier cannot see seeded org sessions or operate them.
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000004',false);
do $$ begin
  if (select count(*) from public.cash_sessions where organization_id='00000000-0000-4000-8000-000000000001')<>0 then raise exception 'cross-org cashier saw seeded cash sessions'; end if;
  begin
    perform public.open_cash_session('91000000-0000-4000-8000-000000000351','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000200',current_date,3,0,'cross org denied');
    raise exception 'cross-org cashier unexpectedly operated seeded org';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
set role anon;
select set_config('request.jwt.claim.sub','',false);
select set_config('request.jwt.claim.role','anon',false);
do $$ begin
  begin
    perform public.open_cash_session('91000000-0000-4000-8000-000000000352','00000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000200',current_date,3,0,'anon denied');
    raise exception 'anon unexpectedly executed cash command';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select 'cash sessions tests passed' as result;
