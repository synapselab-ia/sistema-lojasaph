\set ON_ERROR_STOP on

begin;

do $$
begin
  if not exists (
    select 1
    from pg_attribute
    where attrelid = 'public.stock_items'::regclass
      and attname = 'category_id'
      and attnotnull
      and not attisdropped
  ) then
    raise exception 'stock_items.category_id must be NOT NULL';
  end if;
end;
$$;

insert into public.organizations (id, name)
values
  ('57000000-0000-4000-8000-000000000001', 'Category Required Org A'),
  ('57000000-0000-4000-8000-000000000002', 'Category Required Org B');

insert into public.units_of_measure (id, organization_id, code, name, decimal_scale)
values
  ('57000000-0000-4000-8000-000000000010', '57000000-0000-4000-8000-000000000001', 'un', 'Unidade', 0),
  ('57000000-0000-4000-8000-000000000011', '57000000-0000-4000-8000-000000000002', 'un', 'Unidade', 0);

insert into public.item_categories (id, organization_id, name, code)
values
  ('57000000-0000-4000-8000-000000000020', '57000000-0000-4000-8000-000000000001', 'Categoria A', 'categoria-a'),
  ('57000000-0000-4000-8000-000000000021', '57000000-0000-4000-8000-000000000002', 'Categoria B', 'categoria-b');

insert into public.stock_items (
  id, organization_id, category_id, base_unit_id, name, internal_code, item_type
) values (
  '57000000-0000-4000-8000-000000000030',
  '57000000-0000-4000-8000-000000000001',
  '57000000-0000-4000-8000-000000000020',
  '57000000-0000-4000-8000-000000000010',
  'Item categorizado',
  'CATEGORY-REQUIRED-VALID',
  'supply'
);

do $$
begin
  begin
    insert into public.stock_items (
      id, organization_id, base_unit_id, name, internal_code, item_type
    ) values (
      '57000000-0000-4000-8000-000000000031',
      '57000000-0000-4000-8000-000000000001',
      '57000000-0000-4000-8000-000000000010',
      'Item sem categoria',
      'CATEGORY-REQUIRED-MISSING',
      'supply'
    );
    raise exception 'stock item insert without category unexpectedly succeeded';
  exception
    when not_null_violation then null;
  end;

  begin
    update public.stock_items
    set category_id = null
    where id = '57000000-0000-4000-8000-000000000030';
    raise exception 'stock item update removing category unexpectedly succeeded';
  exception
    when not_null_violation then null;
  end;

  begin
    insert into public.stock_items (
      id, organization_id, category_id, base_unit_id, name, internal_code, item_type
    ) values (
      '57000000-0000-4000-8000-000000000032',
      '57000000-0000-4000-8000-000000000001',
      '57000000-0000-4000-8000-000000000021',
      '57000000-0000-4000-8000-000000000010',
      'Item com categoria externa',
      'CATEGORY-REQUIRED-CROSS-ORG',
      'supply'
    );
    raise exception 'cross-organization category unexpectedly succeeded';
  exception
    when foreign_key_violation then null;
  end;
end;
$$;

-- Reproduce the migration precondition inside the rolled-back synthetic test:
-- a nullable legacy row must stop the migration instead of receiving a default category.
alter table public.stock_items alter column category_id drop not null;

insert into public.stock_items (
  id, organization_id, base_unit_id, name, internal_code, item_type
) values (
  '57000000-0000-4000-8000-000000000033',
  '57000000-0000-4000-8000-000000000001',
  '57000000-0000-4000-8000-000000000010',
  'Legacy uncategorized item',
  'CATEGORY-REQUIRED-LEGACY',
  'supply'
);

do $$
begin
  begin
    if exists (select 1 from public.stock_items where category_id is null) then
      raise exception using
        errcode = '23502',
        message = 'STOCK_ITEM_CATEGORY_REQUIRED_PRECONDITION';
    end if;
    raise exception 'migration precondition unexpectedly accepted an uncategorized row';
  exception
    when not_null_violation then
      if sqlerrm <> 'STOCK_ITEM_CATEGORY_REQUIRED_PRECONDITION' then
        raise;
      end if;
  end;
end;
$$;

delete from public.stock_items
where id = '57000000-0000-4000-8000-000000000033';

alter table public.stock_items alter column category_id set not null;

rollback;

select 'stock item category requirement tests passed' as result;
