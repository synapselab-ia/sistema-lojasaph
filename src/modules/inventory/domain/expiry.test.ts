import { describe, expect, it } from "vitest";
import { classifyExpiry } from "./expiry";

describe("classifyExpiry", () => {
  const reference = new Date("2026-08-17T12:00:00.000Z");

  it("classifies expiry windows by calendar date", () => {
    expect(classifyExpiry("2026-08-16", reference)).toBe("expired");
    expect(classifyExpiry("2026-08-24", reference)).toBe("within_7_days");
    expect(classifyExpiry("2026-08-30", reference)).toBe("within_15_days");
    expect(classifyExpiry("2026-09-10", reference)).toBe("within_30_days");
    expect(classifyExpiry("2026-10-01", reference)).toBe("later");
    expect(classifyExpiry(undefined, reference)).toBe("unknown");
  });
});
