\set ON_ERROR_STOP on

insert into auth.users (id, email)
values
  ('81000000-0000-4000-8000-000000000001', 'finance@example.invalid'),
  ('81000000-0000-4000-8000-000000000002', 'finance-viewer@example.invalid'),
  ('81000000-0000-4000-8000-000000000003', 'finance-other-org@example.invalid')
on conflict (id) do nothing;

insert into public.organization_memberships (organization_id, user_id, role, active)
values
  ('00000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', 'finance', true),
  ('00000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000002', 'viewer', true)
on conflict do nothing;

insert into public.organizations (id, name, timezone, currency)
values ('81000000-0000-4000-8000-000000000100', 'Finance Other Org', 'America/Sao_Paulo', 'BRL')
on conflict (id) do nothing;

insert into public.businesses (id, organization_id, name, code)
values ('81000000-0000-4000-8000-000000000110', '81000000-0000-4000-8000-000000000100', 'Other Business', 'other-finance')
on conflict (id) do nothing;

insert into public.units (id, organization_id, business_id, name, code)
values ('81000000-0000-4000-8000-000000000120', '81000000-0000-4000-8000-000000000100', '81000000-0000-4000-8000-000000000110', 'Other Unit', 'other-unit')
on conflict (id) do nothing;

insert into public.suppliers (id, organization_id, trade_name, status)
values ('81000000-0000-4000-8000-000000000130', '81000000-0000-4000-8000-000000000100', 'Other Supplier', 'active')
on conflict (id) do nothing;

insert into public.organization_memberships (organization_id, user_id, role, active)
values ('81000000-0000-4000-8000-000000000100', '81000000-0000-4000-8000-000000000003', 'finance', true)
on conflict do nothing;

set role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

-- Direct writes remain forbidden even to Finance.
do $$
begin
  begin
    insert into public.payable_documents(
      organization_id, unit_id, supplier_id, total_amount
    ) values (
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000100',
      '00000000-0000-4000-8000-000000000500',
      1
    );
    raise exception 'finance unexpectedly wrote payable_documents directly';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Null/incomplete installment payloads are invalid.
do $$
begin
  begin
    perform public.create_payable_document(
      '81000000-0000-4000-8000-000000000190',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000100',
      null,
      '00000000-0000-4000-8000-000000000500',
      'supplier_document', null, null, null, null, 'null installments', null
    );
    raise exception 'null installments unexpectedly accepted';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.create_payable_document(
      '81000000-0000-4000-8000-000000000191',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000100',
      null,
      '00000000-0000-4000-8000-000000000500',
      'supplier_document', null, null, null, null, 'incomplete installments',
      jsonb_build_array(
        jsonb_build_object('number',1,'count',2,'amount',10.00,'due_date',current_date)
      )
    );
    raise exception 'incomplete installment set unexpectedly accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

-- Create a three-installment document. Dates are relative to local current date.
select * from public.create_payable_document(
  '81000000-0000-4000-8000-000000000200',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000100',
  '00000000-0000-4000-8000-000000000112',
  '00000000-0000-4000-8000-000000000500',
  'supplier_document',
  'NF-DEMO-001',
  'A',
  'DEMO-ACCESS-KEY-001',
  current_date,
  'Documento financeiro de teste',
  jsonb_build_array(
    jsonb_build_object(
      'number',1,'count',3,'amount',1000.00,
      'due_date',((now() at time zone 'America/Sao_Paulo')::date - 1),
      'payment_reference','34191.79001 01043.510047 91020.150008 1 99990000100000',
      'payment_label','referencia historica'
    ),
    jsonb_build_object(
      'number',2,'count',3,'amount',500.00,
      'due_date',(now() at time zone 'America/Sao_Paulo')::date
    ),
    jsonb_build_object(
      'number',3,'count',3,'amount',200.00,
      'due_date',((now() at time zone 'America/Sao_Paulo')::date + 7)
    )
  )
);

-- Same command is idempotent even if installment array order changes.
select * from public.create_payable_document(
  '81000000-0000-4000-8000-000000000200',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000100',
  '00000000-0000-4000-8000-000000000112',
  '00000000-0000-4000-8000-000000000500',
  'supplier_document',
  'NF-DEMO-001',
  'A',
  'DEMO-ACCESS-KEY-001',
  current_date,
  'Documento financeiro de teste',
  jsonb_build_array(
    jsonb_build_object('number',3,'count',3,'amount',200.00,'due_date',((now() at time zone 'America/Sao_Paulo')::date + 7)),
    jsonb_build_object('number',2,'count',3,'amount',500.00,'due_date',(now() at time zone 'America/Sao_Paulo')::date),
    jsonb_build_object(
      'number',1,'count',3,'amount',1000.00,
      'due_date',((now() at time zone 'America/Sao_Paulo')::date - 1),
      'payment_reference','34191.79001 01043.510047 91020.150008 1 99990000100000',
      'payment_label','referencia historica'
    )
  )
);

-- Reusing command ID with a changed amount is a conflict.
do $$
begin
  begin
    perform public.create_payable_document(
      '81000000-0000-4000-8000-000000000200',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000100',
      '00000000-0000-4000-8000-000000000112',
      '00000000-0000-4000-8000-000000000500',
      'supplier_document','NF-DEMO-001','A','DEMO-ACCESS-KEY-001',current_date,
      'Documento financeiro de teste',
      jsonb_build_array(
        jsonb_build_object('number',1,'count',3,'amount',999.00,'due_date',((now() at time zone 'America/Sao_Paulo')::date - 1)),
        jsonb_build_object('number',2,'count',3,'amount',500.00,'due_date',(now() at time zone 'America/Sao_Paulo')::date),
        jsonb_build_object('number',3,'count',3,'amount',200.00,'due_date',((now() at time zone 'America/Sao_Paulo')::date + 7))
      )
    );
    raise exception 'document idempotency conflict unexpectedly succeeded';
  exception when unique_violation then null;
  end;
end;
$$;

-- Validate document/installments/instruction and derived initial statuses.
do $$
begin
  if (select total_amount from public.payable_documents where id='81000000-0000-4000-8000-000000000200') <> 1700.00 then
    raise exception 'payable total mismatch';
  end if;
  if (select count(*) from public.installments where payable_document_id='81000000-0000-4000-8000-000000000200') <> 3 then
    raise exception 'installment count mismatch';
  end if;
  if (select count(*) from public.payment_instructions pi join public.installments i on i.id=pi.installment_id where i.payable_document_id='81000000-0000-4000-8000-000000000200') <> 1 then
    raise exception 'payment instruction was not preserved separately';
  end if;
  if (select payment_status from public.payable_installment_summary where payable_document_id='81000000-0000-4000-8000-000000000200' and installment_number=1) <> 'overdue' then
    raise exception 'overdue status mismatch';
  end if;
  if (select payment_status from public.payable_installment_summary where payable_document_id='81000000-0000-4000-8000-000000000200' and installment_number=2) <> 'due_today' then
    raise exception 'due_today status mismatch';
  end if;
  if (select payment_status from public.payable_installment_summary where payable_document_id='81000000-0000-4000-8000-000000000200' and installment_number=3) <> 'upcoming' then
    raise exception 'upcoming status mismatch';
  end if;
end;
$$;

-- Multiple payment events are supported and overpayment is preserved, not classified.
select * from public.record_installment_payment(
  '81000000-0000-4000-8000-000000000300',
  '00000000-0000-4000-8000-000000000001',
  (select id from public.installments where payable_document_id='81000000-0000-4000-8000-000000000200' and installment_number=1),
  400.00,
  '2026-08-18T10:00:00Z',
  'PAY-REF-001',
  'primeiro pagamento'
);
select * from public.record_installment_payment(
  '81000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000001',
  (select id from public.installments where payable_document_id='81000000-0000-4000-8000-000000000200' and installment_number=1),
  700.00,
  '2026-08-18T11:00:00Z',
  null,
  'segundo pagamento com diferença preservada'
);

-- Retry same payment command does not duplicate.
select * from public.record_installment_payment(
  '81000000-0000-4000-8000-000000000300',
  '00000000-0000-4000-8000-000000000001',
  (select id from public.installments where payable_document_id='81000000-0000-4000-8000-000000000200' and installment_number=1),
  400.00,
  '2026-08-18T10:00:00Z',
  'PAY-REF-001',
  'primeiro pagamento'
);

do $$
begin
  if (select count(*) from public.payments where installment_id=(select id from public.installments where payable_document_id='81000000-0000-4000-8000-000000000200' and installment_number=1) and event_type='payment') <> 2 then
    raise exception 'payment retry duplicated event';
  end if;
  if (select net_paid_amount from public.payable_installment_summary where payable_document_id='81000000-0000-4000-8000-000000000200' and installment_number=1) <> 1100.00 then
    raise exception 'net paid mismatch after multiple payments';
  end if;
  if (select balance_amount from public.payable_installment_summary where payable_document_id='81000000-0000-4000-8000-000000000200' and installment_number=1) <> -100.00 then
    raise exception 'overpayment difference was not preserved';
  end if;
  if (select payment_status from public.payable_installment_summary where payable_document_id='81000000-0000-4000-8000-000000000200' and installment_number=1) <> 'paid' then
    raise exception 'paid status mismatch after overpayment';
  end if;
end;
$$;

-- Payment retry with changed amount conflicts.
do $$
begin
  begin
    perform public.record_installment_payment(
      '81000000-0000-4000-8000-000000000300',
      '00000000-0000-4000-8000-000000000001',
      (select id from public.installments where payable_document_id='81000000-0000-4000-8000-000000000200' and installment_number=1),
      401.00,
      '2026-08-18T10:00:00Z',
      'PAY-REF-001',
      'primeiro pagamento'
    );
    raise exception 'payment idempotency conflict unexpectedly succeeded';
  exception when unique_violation then null;
  end;
end;
$$;

-- Reverse first payment; retry is idempotent and a second reversal command is blocked.
select * from public.reverse_installment_payment(
  '81000000-0000-4000-8000-000000000400',
  '00000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000300',
  '2026-08-18T12:00:00Z',
  'estorno integral'
);
select * from public.reverse_installment_payment(
  '81000000-0000-4000-8000-000000000400',
  '00000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000300',
  '2026-08-18T12:00:00Z',
  'estorno integral'
);

do $$
begin
  if (select net_paid_amount from public.payable_installment_summary where payable_document_id='81000000-0000-4000-8000-000000000200' and installment_number=1) <> 700.00 then
    raise exception 'reversal did not reduce net paid';
  end if;
  begin
    perform public.reverse_installment_payment(
      '81000000-0000-4000-8000-000000000401',
      '00000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000300',
      '2026-08-18T12:05:00Z',
      'segundo estorno proibido'
    );
    raise exception 'second reversal unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

-- Document with net payments cannot be cancelled.
do $$
begin
  begin
    perform public.cancel_payable_document(
      '81000000-0000-4000-8000-000000000500',
      '00000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000200',
      'cancelamento com pagamento pendente'
    );
    raise exception 'document with net payments unexpectedly cancelled';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

-- Reverse remaining payment so net becomes zero, then cancellation is allowed.
select * from public.reverse_installment_payment(
  '81000000-0000-4000-8000-000000000402',
  '00000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000301',
  '2026-08-18T12:10:00Z',
  'neutralizar documento'
);
select * from public.cancel_payable_document(
  '81000000-0000-4000-8000-000000000501',
  '00000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000200',
  'documento cancelado após estornos'
);
select * from public.cancel_payable_document(
  '81000000-0000-4000-8000-000000000501',
  '00000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000200',
  'documento cancelado após estornos'
);

do $$
begin
  if (select lifecycle_status from public.payable_documents where id='81000000-0000-4000-8000-000000000200') <> 'cancelled' then
    raise exception 'document cancellation mismatch';
  end if;
  if exists (select 1 from public.payable_installment_summary where payable_document_id='81000000-0000-4000-8000-000000000200' and payment_status <> 'cancelled') then
    raise exception 'cancelled document status not derived on all installments';
  end if;
  begin
    perform public.cancel_payable_document(
      '81000000-0000-4000-8000-000000000501',
      '00000000-0000-4000-8000-000000000001',
      '81000000-0000-4000-8000-000000000200',
      'motivo diferente'
    );
    raise exception 'cancel idempotency conflict unexpectedly succeeded';
  exception when unique_violation then null;
  end;
  begin
    perform public.record_installment_payment(
      '81000000-0000-4000-8000-000000000302',
      '00000000-0000-4000-8000-000000000001',
      (select id from public.installments where payable_document_id='81000000-0000-4000-8000-000000000200' and installment_number=2),
      10.00,
      '2026-08-18T13:00:00Z',
      null,
      'pagamento em documento cancelado'
    );
    raise exception 'payment on cancelled document unexpectedly succeeded';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

-- Viewer can read same-Organization summaries but cannot mutate.
set role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  if (select count(*) from public.payable_installment_summary where payable_document_id='81000000-0000-4000-8000-000000000200') <> 3 then
    raise exception 'same-org viewer should read finance summary';
  end if;
  begin
    perform public.create_payable_document(
      '81000000-0000-4000-8000-000000000600',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000100',
      null,
      '00000000-0000-4000-8000-000000000500',
      'supplier_document',null,null,null,current_date,'viewer denied',
      jsonb_build_array(jsonb_build_object('number',1,'count',1,'amount',1.00,'due_date',current_date))
    );
    raise exception 'viewer unexpectedly mutated finance';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Finance user from another Organization cannot see or mutate the seeded Organization.
set role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000003', false);
select set_config('request.jwt.claim.role', 'authenticated', false);

do $$
begin
  if (select count(*) from public.payable_documents where organization_id='00000000-0000-4000-8000-000000000001') <> 0 then
    raise exception 'cross-org finance user saw payable documents';
  end if;
  begin
    perform public.create_payable_document(
      '81000000-0000-4000-8000-000000000601',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000100',
      null,
      '00000000-0000-4000-8000-000000000500',
      'supplier_document',null,null,null,current_date,'cross org denied',
      jsonb_build_array(jsonb_build_object('number',1,'count',1,'amount',1.00,'due_date',current_date))
    );
    raise exception 'cross-org finance user unexpectedly mutated seeded org';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Anon has neither table read nor RPC execute.
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claim.role', 'anon', false);

do $$
begin
  begin
    perform public.create_payable_document(
      '81000000-0000-4000-8000-000000000602',
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000100',
      null,
      '00000000-0000-4000-8000-000000000500',
      'supplier_document',null,null,null,current_date,'anon denied',
      jsonb_build_array(jsonb_build_object('number',1,'count',1,'amount',1.00,'due_date',current_date))
    );
    raise exception 'anon unexpectedly executed finance command';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
select 'finance payables tests passed' as result;
