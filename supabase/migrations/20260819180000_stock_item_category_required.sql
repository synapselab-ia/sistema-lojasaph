do $$
begin
  if exists (
    select 1
    from public.stock_items
    where category_id is null
  ) then
    raise exception using
      errcode = '23502',
      message = 'STOCK_ITEM_CATEGORY_REQUIRED_PRECONDITION',
      detail = 'public.stock_items contains uncategorized rows; assign an explicit category before applying this migration.';
  end if;
end;
$$;

alter table public.stock_items
  alter column category_id set not null;
