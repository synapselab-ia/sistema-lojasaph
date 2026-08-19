import { describe, expect, it } from "vitest";
import { Money } from "@/domain/common/money";
import { EntityId } from "@/domain/common/entity-id";
import {
  buildDashboardSummary,
  DashboardRawData,
  localIsoDate,
  validateDashboardPeriod,
} from "./dashboard-summary";

const unitA = "10000000-0000-4000-8000-000000000001" as EntityId;
const unitB = "10000000-0000-4000-8000-000000000002" as EntityId;
const sectorA = "11000000-0000-4000-8000-000000000001" as EntityId;
const sectorA2 = "11000000-0000-4000-8000-000000000002" as EntityId;
const sectorB = "11000000-0000-4000-8000-000000000003" as EntityId;
const id = (value: number) => `20000000-0000-4000-8000-${String(value).padStart(12, "0")}` as EntityId;

function demoData(): DashboardRawData {
  return {
    finance: [
      { id: id(1), unitId: unitA, sectorId: sectorA, nominalAmount: Money.fromDecimal("1000.00"), netPaidAmount: Money.fromDecimal("0.00"), balanceAmount: Money.fromDecimal("1000.00"), status: "overdue", dueDate: "2026-08-17" },
      { id: id(2), unitId: unitA, sectorId: sectorA2, nominalAmount: Money.fromDecimal("500.00"), netPaidAmount: Money.fromDecimal("100.00"), balanceAmount: Money.fromDecimal("400.00"), status: "due_today", dueDate: "2026-08-18" },
      { id: id(3), unitId: unitA, sectorId: sectorA, nominalAmount: Money.fromDecimal("300.00"), netPaidAmount: Money.fromDecimal("300.00"), balanceAmount: Money.fromDecimal("0.00"), status: "paid", dueDate: "2026-08-10" },
      { id: id(4), unitId: unitA, nominalAmount: Money.fromDecimal("200.00"), netPaidAmount: Money.fromDecimal("0.00"), balanceAmount: Money.fromDecimal("200.00"), status: "upcoming", dueDate: "2026-08-22" },
      { id: id(5), unitId: unitB, sectorId: sectorB, nominalAmount: Money.fromDecimal("999.00"), netPaidAmount: Money.zero(), balanceAmount: Money.fromDecimal("999.00"), status: "overdue", dueDate: "2026-08-01" },
      { id: id(6), unitId: unitA, sectorId: sectorA, nominalAmount: Money.fromDecimal("700.00"), netPaidAmount: Money.zero(), balanceAmount: Money.fromDecimal("700.00"), status: "cancelled", dueDate: "2026-08-01" },
    ],
    cash: [
      { id: id(10), unitId: unitA, businessDate: "2026-08-18", status: "open" },
      { id: id(11), unitId: unitA, businessDate: "2026-08-17", status: "closed", cashDifference: Money.fromDecimal("-10.00") },
      { id: id(13), unitId: unitA, businessDate: "2026-08-12", status: "closed" },
      { id: id(12), unitId: unitB, businessDate: "2026-08-17", status: "closed", cashDifference: Money.fromDecimal("50.00") },
    ],
    purchases: [
      { id: id(20), unitId: unitA, sectorId: sectorA, status: "ordered", expectedDeliveryDate: "2026-08-17" },
      { id: id(21), unitId: unitA, status: "partially_received", expectedDeliveryDate: "2026-08-20" },
      { id: id(23), unitId: unitA, sectorId: sectorA, status: "ordered" },
      { id: id(22), unitId: unitB, sectorId: sectorB, status: "ordered", expectedDeliveryDate: "2026-08-17" },
    ],
    transfers: [
      { id: id(30), sourceUnitId: unitA, sourceSectorId: sectorA, destinationUnitId: unitB, destinationSectorId: sectorB, status: "dispatched" },
      { id: id(31), sourceUnitId: unitB, sourceSectorId: sectorB, destinationUnitId: unitB, destinationSectorId: sectorB, status: "received" },
    ],
    inventoryCounts: [
      { id: id(40), unitId: unitA, sectorId: sectorA, status: "counting" },
      { id: id(41), unitId: unitB, sectorId: sectorB, status: "confirmed" },
    ],
    expiries: [
      { id: id(50), unitId: unitA, sectorId: sectorA, expirationDate: "2026-08-17" },
      { id: id(51), unitId: unitA, expirationDate: "2026-08-21" },
      { id: id(52), unitId: unitB, sectorId: sectorB, expirationDate: "2026-08-17" },
    ],
  };
}

describe("dashboard summary", () => {
  it("aggregates actionable signals without mixing another unit", () => {
    const summary = buildDashboardSummary(demoData(), {
      today: "2026-08-18",
      horizonDays: 7,
      unitId: unitA,
    });

    expect(summary.finance.nominal.toDecimal()).toBe("2000.00");
    expect(summary.finance.paid.toDecimal()).toBe("400.00");
    expect(summary.finance.openBalance.toDecimal()).toBe("1600.00");
    expect(summary.finance.overdueCount).toBe(1);
    expect(summary.finance.dueTodayCount).toBe(1);
    expect(summary.finance.dueSoonCount).toBe(1);
    expect(summary.cash).toEqual({ openCount: 1, discrepancyCount: 1, recentClosedCount: 2 });
    expect(summary.purchases).toEqual({ pendingCount: 3, lateDeliveryCount: 1, deliverySoonCount: 1 });
    expect(summary.stock).toEqual({ transfersInTransitCount: 1, openInventoryCount: 1, expiredBatchCount: 1, expiringSoonCount: 1 });
    expect(summary.attention.map((item) => item.key)).toContain("finance-overdue");
    expect(summary.attention.map((item) => item.key)).toContain("cash-discrepancy");
    expect(summary.attention.map((item) => item.key)).toContain("expiry-expired");
  });

  it("filters only records explicitly related to the selected Sector", () => {
    const summary = buildDashboardSummary(demoData(), {
      today: "2026-08-18",
      horizonDays: 7,
      unitId: unitA,
      sectorId: sectorA,
    });

    expect(summary.finance.nominal.toDecimal()).toBe("1300.00");
    expect(summary.finance.paid.toDecimal()).toBe("300.00");
    expect(summary.finance.openBalance.toDecimal()).toBe("1000.00");
    expect(summary.finance.overdueCount).toBe(1);
    expect(summary.finance.dueTodayCount).toBe(0);
    expect(summary.finance.dueSoonCount).toBe(0);
    expect(summary.purchases).toEqual({ pendingCount: 2, lateDeliveryCount: 1, deliverySoonCount: 0 });
    expect(summary.stock).toEqual({ transfersInTransitCount: 1, openInventoryCount: 1, expiredBatchCount: 1, expiringSoonCount: 0 });

    expect(summary.attention.map((item) => item.key)).not.toContain("finance-soon");
    expect(summary.attention.map((item) => item.key)).not.toContain("purchase-soon");
    expect(summary.attention.map((item) => item.key)).not.toContain("expiry-soon");
  });

  it("keeps Cash at Unit scope when a Sector filter is active", () => {
    const sectorAResult = buildDashboardSummary(demoData(), {
      today: "2026-08-18",
      horizonDays: 7,
      unitId: unitA,
      sectorId: sectorA,
    });
    const sectorA2Result = buildDashboardSummary(demoData(), {
      today: "2026-08-18",
      horizonDays: 7,
      unitId: unitA,
      sectorId: sectorA2,
    });

    expect(sectorAResult.cash).toEqual({ openCount: 1, discrepancyCount: 1, recentClosedCount: 2 });
    expect(sectorA2Result.cash).toEqual(sectorAResult.cash);
    expect(sectorAResult.attention.map((item) => item.key)).toContain("cash-discrepancy");
  });

  it("requires transfer Unit and Sector to match on the same endpoint", () => {
    const mismatched = buildDashboardSummary(demoData(), {
      today: "2026-08-18",
      horizonDays: 7,
      unitId: unitB,
      sectorId: sectorA,
    });

    expect(mismatched.stock.transfersInTransitCount).toBe(0);
  });

  it("applies an explicit period inclusively only to canonical period metrics", () => {
    const summary = buildDashboardSummary(demoData(), {
      today: "2026-08-18",
      horizonDays: 7,
      unitId: unitA,
      dateFrom: "2026-08-17",
      dateTo: "2026-08-17",
    });

    expect(summary.finance.nominal.toDecimal()).toBe("1000.00");
    expect(summary.finance.paid.toDecimal()).toBe("0.00");
    expect(summary.finance.openBalance.toDecimal()).toBe("1000.00");
    expect(summary.finance.overdueCount).toBe(1);
    expect(summary.finance.dueTodayCount).toBe(0);
    expect(summary.cash).toEqual({ openCount: 1, discrepancyCount: 1, recentClosedCount: 1 });
    expect(summary.purchases).toEqual({ pendingCount: 3, lateDeliveryCount: 1, deliverySoonCount: 0 });
    expect(summary.stock).toEqual({ transfersInTransitCount: 1, openInventoryCount: 1, expiredBatchCount: 1, expiringSoonCount: 0 });
  });

  it("does not manufacture a delivery date for pending purchases without one", () => {
    const summary = buildDashboardSummary(demoData(), {
      today: "2026-08-18",
      horizonDays: 7,
      unitId: unitA,
      dateFrom: "2026-08-19",
      dateTo: "2026-08-21",
    });

    expect(summary.purchases.pendingCount).toBe(3);
    expect(summary.purchases.lateDeliveryCount).toBe(0);
    expect(summary.purchases.deliverySoonCount).toBe(1);
  });

  it("keeps horizon semantics separate from the explicit period", () => {
    const wideHorizon = buildDashboardSummary(demoData(), {
      today: "2026-08-18",
      horizonDays: 7,
      unitId: unitA,
      dateFrom: "2026-08-20",
      dateTo: "2026-08-22",
    });
    const narrowHorizon = buildDashboardSummary(demoData(), {
      today: "2026-08-18",
      horizonDays: 2,
      unitId: unitA,
      dateFrom: "2026-08-20",
      dateTo: "2026-08-22",
    });

    expect(wideHorizon.finance.dueSoonCount).toBe(1);
    expect(narrowHorizon.finance.dueSoonCount).toBe(0);
    expect(wideHorizon.purchases.deliverySoonCount).toBe(1);
    expect(narrowHorizon.purchases.deliverySoonCount).toBe(1);
  });

  it("uses the configured horizon for upcoming and recent signals", () => {
    const sevenDays = buildDashboardSummary(demoData(), { today: "2026-08-18", horizonDays: 7, unitId: unitA });
    const twoDays = buildDashboardSummary(demoData(), { today: "2026-08-18", horizonDays: 2, unitId: unitA });

    expect(sevenDays.finance.dueSoonCount).toBe(1);
    expect(twoDays.finance.dueSoonCount).toBe(0);
    expect(sevenDays.stock.expiringSoonCount).toBe(1);
    expect(twoDays.stock.expiringSoonCount).toBe(0);
  });

  it("validates explicit period completeness, dates and ordering", () => {
    expect(() => validateDashboardPeriod({})).not.toThrow();
    expect(() => validateDashboardPeriod({ dateFrom: "2026-08-01", dateTo: "2026-08-31" })).not.toThrow();
    expect(() => validateDashboardPeriod({ dateFrom: "2026-08-01" })).toThrow("DASHBOARD_PERIOD_INCOMPLETE");
    expect(() => validateDashboardPeriod({ dateFrom: "2026-02-30", dateTo: "2026-03-01" })).toThrow("DASHBOARD_PERIOD_INVALID_DATE");
    expect(() => validateDashboardPeriod({ dateFrom: "18/08/2026", dateTo: "2026-08-20" })).toThrow("DASHBOARD_PERIOD_INVALID_DATE");
    expect(() => validateDashboardPeriod({ dateFrom: "2026-08-20", dateTo: "2026-08-19" })).toThrow("DASHBOARD_PERIOD_INVALID_RANGE");
  });

  it("resolves the business date using Organization timezone", () => {
    const instant = new Date("2026-08-18T01:30:00.000Z");
    expect(localIsoDate(instant, "America/Sao_Paulo")).toBe("2026-08-17");
    expect(localIsoDate(instant, "UTC")).toBe("2026-08-18");
  });

  it("rejects an unreasonable dashboard horizon", () => {
    expect(() => buildDashboardSummary(demoData(), { today: "2026-08-18", horizonDays: 0 })).toThrow();
  });
});
