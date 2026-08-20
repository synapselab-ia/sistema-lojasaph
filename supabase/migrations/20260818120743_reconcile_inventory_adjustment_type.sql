-- Fase 9 repair: persistent inventory emits the generic inventory_adjustment type.
-- Legacy positive/negative values remain accepted for backwards compatibility.
alter table public.stock_movements
  drop constraint if exists stock_movements_movement_type_check;

alter table public.stock_movements
  add constraint stock_movements_movement_type_check
  check (
    movement_type in (
      'opening_balance', 'purchase_receipt', 'entry', 'sector_withdrawal', 'withdrawal',
      'transfer_out', 'transfer_in', 'return_in', 'return_out', 'loan_out', 'loan_return',
      'loss', 'expiration', 'inventory_adjustment', 'inventory_adjustment_positive',
      'inventory_adjustment_negative', 'manual_adjustment_positive', 'manual_adjustment_negative'
    )
  );
