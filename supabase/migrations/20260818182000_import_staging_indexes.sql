-- Cover import staging foreign keys reported by the Supabase performance advisor.

create index import_batches_requested_by_user_idx
  on public.import_batches(requested_by_user_id);

create index import_rows_batch_org_idx
  on public.import_rows(import_batch_id, organization_id);
