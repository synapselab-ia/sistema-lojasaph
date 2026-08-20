drop policy if exists stock_loss_reasons_member_select on public.stock_loss_reasons;

create policy stock_loss_reasons_member_select
on public.stock_loss_reasons
for select
to authenticated
using (private.is_org_member(organization_id));
