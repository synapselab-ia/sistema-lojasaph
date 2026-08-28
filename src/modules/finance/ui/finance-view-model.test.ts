import { describe, expect, it } from "vitest";
import { Money } from "@/domain/common/money";
import { EntityId } from "@/domain/common/entity-id";
import {
  RuntimeInstallmentSummary,
  RuntimePayableDocument,
} from "@/modules/finance/adapters/supabase-finance-gateway";
import { filterFinanceDocuments, summarizeDocument } from "./finance-view-model";

function document(overrides: Partial<RuntimePayableDocument> = {}): RuntimePayableDocument {
  return {
    id: "document-1" as EntityId,
    unitId: "unit-1" as EntityId,
    supplierId: "supplier-1" as EntityId,
    documentType: "Nota fiscal",
    totalAmount: Money.fromDecimal("100.00"),
    lifecycleStatus: "active",
    createdAt: "2026-08-28T12:00:00Z",
    ...overrides,
  };
}

function installment(
  number: number,
  status: RuntimeInstallmentSummary["paymentStatus"],
  nominal = "100.00",
  paid = "0.00",
): RuntimeInstallmentSummary {
  return {
    id: `installment-${number}` as EntityId,
    payableDocumentId: "document-1" as EntityId,
    installmentNumber: number,
    installmentCount: 2,
    nominalAmount: Money.fromDecimal(nominal),
    dueDate: number === 1 ? "2026-08-20" : "2026-09-20",
    netPaidAmount: Money.fromDecimal(paid),
    balanceAmount: Money.fromDecimal(String(Number(nominal) - Number(paid))),
    paymentStatus: status,
  };
}

describe("summarizeDocument", () => {
  it("prioritizes overdue installments and preserves monetary differences", () => {
    const summary = summarizeDocument(document(), [
      installment(1, "overdue", "100.00", "110.00"),
      installment(2, "upcoming", "50.00", "0.00"),
    ]);

    expect(summary.situation).toBe("overdue");
    expect(summary.nominalAmount.toDecimal()).toBe("150.00");
    expect(summary.netPaidAmount.toDecimal()).toBe("110.00");
    expect(summary.balanceAmount.toDecimal()).toBe("40.00");
    expect(summary.nextDueDate).toBe("2026-08-20");
  });

  it("marks a cancelled document independently of installment status", () => {
    const summary = summarizeDocument(document({ lifecycleStatus: "cancelled" }), [installment(1, "cancelled")]);
    expect(summary.situation).toBe("cancelled");
  });

  it("marks a document paid only when every installment is paid", () => {
    const summary = summarizeDocument(document(), [
      installment(1, "paid", "50.00", "50.00"),
      installment(2, "paid", "50.00", "50.00"),
    ]);
    expect(summary.situation).toBe("paid");
    expect(summary.nextDueDate).toBeUndefined();
  });
});

describe("filterFinanceDocuments", () => {
  it("filters by business-facing labels without depending on internal ids", () => {
    const documents = [document({ documentNumber: "NF-123" })];
    const labels = new Map([
      ["supplier-1", "Fornecedor Exemplo"],
      ["unit-1", "Unidade Centro"],
    ]);

    expect(filterFinanceDocuments(documents, [installment(1, "upcoming")], "centro", "all", labels)).toHaveLength(1);
    expect(filterFinanceDocuments(documents, [installment(1, "upcoming")], "supplier-1", "all", labels)).toHaveLength(0);
  });
});
