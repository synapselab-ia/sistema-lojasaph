import { describe, expect, it } from "vitest";
import { buttonClasses, controlClasses, fieldDescriptionIds, panelClasses, statusBadgeClasses } from "./styles";

describe("design-system style contracts", () => {
  it("keeps buttons keyboard/touch friendly and variants distinct", () => {
    const primary = buttonClasses({ variant: "primary" });
    const secondary = buttonClasses({ variant: "secondary" });
    const danger = buttonClasses({ variant: "danger" });

    expect(primary).toContain("min-h-11");
    expect(primary).toContain("bg-neutral-900");
    expect(secondary).toContain("bg-white");
    expect(danger).toContain("bg-red-700");
    expect(new Set([primary, secondary, danger]).size).toBe(3);
  });

  it("keeps form controls focused and disabled consistently", () => {
    const classes = controlClasses();
    expect(classes).toContain("focus:ring-2");
    expect(classes).toContain("disabled:cursor-not-allowed");
    expect(classes).toContain("w-full");
  });

  it("builds deterministic accessible field descriptions", () => {
    expect(fieldDescriptionIds("email", false, false)).toBeUndefined();
    expect(fieldDescriptionIds("email", true, false)).toBe("email-hint");
    expect(fieldDescriptionIds("email", false, true)).toBe("email-error");
    expect(fieldDescriptionIds("email", true, true)).toBe("email-hint email-error");
  });

  it("provides shared semantic tones for badges and panels", () => {
    expect(statusBadgeClasses("success")).toContain("border-emerald-200");
    expect(statusBadgeClasses("attention")).toContain("border-amber-200");
    expect(statusBadgeClasses("danger")).toContain("border-red-200");
    expect(panelClasses({ tone: "info" })).toContain("border-sky-200");
  });
});
