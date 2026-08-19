-- CI found that PL/pgSQL resolves the ON CONFLICT target against the function's
-- OUT parameter names under the default `error` conflict mode. For this function
-- all potentially colliding unqualified names in SQL targets are table columns;
-- keep that resolution explicit at function entry.
alter function private.record_stock_return(uuid,uuid,uuid,numeric,text)
  set plpgsql.variable_conflict = 'use_column';
