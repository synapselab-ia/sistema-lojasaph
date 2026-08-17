import { InventoryBatch } from "./inventory";

export type ExpiryStatus = "unknown" | "expired" | "within_7_days" | "within_15_days" | "within_30_days" | "later";

function utcDateOnly(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function parseDateOnly(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getTime();
}

export function classifyExpiry(expirationDate?: string, referenceDate = new Date()): ExpiryStatus {
  if (!expirationDate) return "unknown";
  const expiration = parseDateOnly(expirationDate);
  if (expiration === null) return "unknown";

  const days = Math.floor((expiration - utcDateOnly(referenceDate)) / 86_400_000);
  if (days < 0) return "expired";
  if (days <= 7) return "within_7_days";
  if (days <= 15) return "within_15_days";
  if (days <= 30) return "within_30_days";
  return "later";
}

export function sortBatchesFefo(batches: readonly InventoryBatch[]): readonly InventoryBatch[] {
  return [...batches].sort((a, b) => {
    const aDate = a.expirationDate ?? "9999-12-31";
    const bDate = b.expirationDate ?? "9999-12-31";
    const expiryCompare = aDate.localeCompare(bDate);
    if (expiryCompare !== 0) return expiryCompare;
    return a.receivedAt.localeCompare(b.receivedAt);
  });
}
