import { Money } from "@/domain/common/money";
import {
  CashMovementType,
  CashPaymentMethod,
  CashRegister,
  CashSessionStatus,
  PaymentMethodKind,
  RuntimeCashMovement,
  RuntimeCashSession,
  RuntimePaymentTotal,
} from "@/modules/cash/adapters/supabase-cash-gateway";

export const cashSessionStatusLabel: Record<CashSessionStatus, string> = {
  open: "Aberta",
  closed: "Fechada",
  cancelled: "Cancelada",
};

export const cashSessionStatusTone: Record<CashSessionStatus, "info" | "success" | "neutral"> = {
  open: "info",
  closed: "success",
  cancelled: "neutral",
};

export const paymentMethodKindLabel: Record<PaymentMethodKind, string> = {
  cash: "Dinheiro",
  card: "Cartão",
  instant: "Pix / instantâneo",
  voucher: "Voucher",
  other: "Outro",
};

export const cashMovementTypeLabel: Record<CashMovementType, string> = {
  cash_in: "Entrada",
  cash_out: "Sangria",
  employee_consumption: "Consumo de funcionários",
};

export function moneyLabel(value?: Money): string {
  if (!value) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value.toDecimal()));
}

export function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`));
}

export function dateTimeLabel(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function normalizeCashSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export function filterCashSessions(
  sessions: readonly RuntimeCashSession[],
  search: string,
  status: CashSessionStatus | "all",
  registerById: ReadonlyMap<string, CashRegister>,
  unitNameById: ReadonlyMap<string, string>,
): RuntimeCashSession[] {
  const query = normalizeCashSearch(search);
  return sessions.filter((session) => {
    if (status !== "all" && session.status !== status) return false;
    if (!query) return true;
    const register = registerById.get(session.cashRegisterId);
    const unitName = register ? unitNameById.get(register.unitId) : undefined;
    const searchable = [
      register?.name,
      register?.code,
      unitName,
      cashSessionStatusLabel[session.status],
      session.businessDate,
      session.notes,
      String(session.sequence),
    ].filter(Boolean).join(" ");
    return normalizeCashSearch(searchable).includes(query);
  });
}

export function sessionTotals(
  sessionId: string,
  totals: readonly RuntimePaymentTotal[],
): { gross: Money; fees: Money; net: Money } {
  return totals
    .filter((total) => total.cashSessionId === sessionId)
    .reduce(
      (summary, total) => ({
        gross: summary.gross.add(total.grossAmount),
        fees: summary.fees.add(total.feeAmount),
        net: summary.net.add(total.netAmount),
      }),
      { gross: Money.zero(), fees: Money.zero(), net: Money.zero() },
    );
}

export function sessionMovementTotals(
  sessionId: string,
  movements: readonly RuntimeCashMovement[],
): { cashIn: Money; cashOut: Money } {
  return movements
    .filter((movement) => movement.cashSessionId === sessionId)
    .reduce(
      (summary, movement) => {
        if (movement.movementType === "cash_in") return { ...summary, cashIn: summary.cashIn.add(movement.amount) };
        if (movement.movementType === "cash_out") return { ...summary, cashOut: summary.cashOut.add(movement.amount) };
        return summary;
      },
      { cashIn: Money.zero(), cashOut: Money.zero() },
    );
}

export function drawerGrossTotal(
  sessionId: string,
  totals: readonly RuntimePaymentTotal[],
  paymentMethods: readonly CashPaymentMethod[],
): Money {
  const methodById = new Map(paymentMethods.map((method) => [method.id, method]));
  return totals
    .filter((total) => total.cashSessionId === sessionId && methodById.get(total.paymentMethodId)?.affectsCashDrawer)
    .reduce((sum, total) => sum.add(total.grossAmount), Money.zero());
}
