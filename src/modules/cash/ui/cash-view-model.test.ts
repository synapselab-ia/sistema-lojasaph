import { describe, expect, it } from "vitest";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { CashPaymentMethod, CashRegister, RuntimeCashMovement, RuntimeCashSession, RuntimePaymentTotal } from "@/modules/cash/adapters/supabase-cash-gateway";
import { drawerGrossTotal, filterCashSessions, sessionMovementTotals, sessionTotals } from "./cash-view-model";

const session: RuntimeCashSession = {
  id: "session-1" as EntityId,
  cashRegisterId: "register-1" as EntityId,
  businessDate: "2026-08-31",
  sequence: 1,
  openingFloat: Money.fromDecimal("100"),
  status: "open",
  openedAt: "2026-08-31T12:00:00.000Z",
  notes: "Turno manhã",
};

const register: CashRegister = {
  id: "register-1" as EntityId,
  unitId: "unit-1" as EntityId,
  name: "Caixa Balcão",
  code: "CB01",
  status: "active",
};

const methods: readonly CashPaymentMethod[] = [
  { id: "cash" as EntityId, code: "dinheiro", name: "Dinheiro", methodKind: "cash", affectsCashDrawer: true, status: "active" },
  { id: "pix" as EntityId, code: "pix", name: "Pix", methodKind: "instant", affectsCashDrawer: false, status: "active" },
];

const totals: readonly RuntimePaymentTotal[] = [
  { id: "t1" as EntityId, cashSessionId: session.id, paymentMethodId: methods[0].id, grossAmount: Money.fromDecimal("500"), feeAmount: Money.zero(), netAmount: Money.fromDecimal("500") },
  { id: "t2" as EntityId, cashSessionId: session.id, paymentMethodId: methods[1].id, grossAmount: Money.fromDecimal("300"), feeAmount: Money.fromDecimal("3"), netAmount: Money.fromDecimal("297") },
];

const movements: readonly RuntimeCashMovement[] = [
  { id: "m1" as EntityId, cashSessionId: session.id, movementType: "cash_in", amount: Money.fromDecimal("100"), occurredAt: "2026-08-31T13:00:00.000Z" },
  { id: "m2" as EntityId, cashSessionId: session.id, movementType: "cash_out", amount: Money.fromDecimal("40"), occurredAt: "2026-08-31T14:00:00.000Z" },
  { id: "m3" as EntityId, cashSessionId: session.id, movementType: "employee_consumption", amount: Money.fromDecimal("25"), occurredAt: "2026-08-31T15:00:00.000Z" },
];

describe("cash view model", () => {
  it("filters sessions by operational labels without accents", () => {
    const registerById = new Map([[register.id, register]]);
    const unitById = new Map([[register.unitId, "Loja São José"]]);

    expect(filterCashSessions([session], "sao jose", "all", registerById, unitById)).toEqual([session]);
    expect(filterCashSessions([session], "balcao", "open", registerById, unitById)).toEqual([session]);
    expect(filterCashSessions([session], "balcao", "closed", registerById, unitById)).toEqual([]);
  });

  it("summarizes gross, fees and net without changing persisted values", () => {
    expect(sessionTotals(session.id, totals).gross.toDecimal()).toBe("800.00");
    expect(sessionTotals(session.id, totals).fees.toDecimal()).toBe("3.00");
    expect(sessionTotals(session.id, totals).net.toDecimal()).toBe("797.00");
  });

  it("keeps employee consumption outside cash in/out summaries", () => {
    const summary = sessionMovementTotals(session.id, movements);
    expect(summary.cashIn.toDecimal()).toBe("100.00");
    expect(summary.cashOut.toDecimal()).toBe("40.00");
  });

  it("counts only gross totals whose configured method affects the drawer", () => {
    expect(drawerGrossTotal(session.id, totals, methods).toDecimal()).toBe("500.00");
  });
});
