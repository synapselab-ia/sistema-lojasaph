import { describe, expect, it } from "vitest";
import {
  buildStockMovementScopeFilter,
  stockPeriodUtcBounds,
} from "./supabase-stock-overview-query";

describe("stock dashboard overview query helpers", () => {
  it("converts an inclusive Sao Paulo business-date period to UTC bounds", () => {
    expect(stockPeriodUtcBounds(
      "2026-08-27",
      "2026-08-27",
      "America/Sao_Paulo",
    )).toEqual({
      startInclusive: "2026-08-27T03:00:00.000Z",
      endExclusive: "2026-08-28T03:00:00.000Z",
    });
  });

  it("keeps local-midnight boundaries correct across DST changes", () => {
    expect(stockPeriodUtcBounds(
      "2026-03-08",
      "2026-03-08",
      "America/New_York",
    )).toEqual({
      startInclusive: "2026-03-08T05:00:00.000Z",
      endExclusive: "2026-03-09T04:00:00.000Z",
    });
  });

  it("builds scope only from explicit stock locations and Sectors", () => {
    expect(buildStockMovementScopeFilter(
      [
        "10000000-0000-4000-8000-000000000001",
        "10000000-0000-4000-8000-000000000002",
      ],
      ["11000000-0000-4000-8000-000000000001"],
    )).toBe(
      "source_location_id.in.(10000000-0000-4000-8000-000000000001,10000000-0000-4000-8000-000000000002),"
      + "destination_location_id.in.(10000000-0000-4000-8000-000000000001,10000000-0000-4000-8000-000000000002),"
      + "sector_id.in.(11000000-0000-4000-8000-000000000001)",
    );
  });

  it("does not invent a scope when no explicit relation exists", () => {
    expect(buildStockMovementScopeFilter([], [])).toBeUndefined();
  });
});
