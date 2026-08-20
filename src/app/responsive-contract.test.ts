import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const responsiveCss = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("responsive workspace contract", () => {
  it("stacks fixed two- and three-column grids on narrow screens", () => {
    expect(responsiveCss).toContain("@media (max-width: 639px)");
    expect(responsiveCss).toContain(".grid.grid-cols-2");
    expect(responsiveCss).toContain(".grid.grid-cols-3");
    expect(responsiveCss).toContain("grid-template-columns: minmax(0, 1fr)");
  });

  it("keeps coarse-pointer form controls operable", () => {
    expect(responsiveCss).toContain("@media (pointer: coarse)");
    expect(responsiveCss).toContain("min-height: 44px");
    expect(responsiveCss).toContain('input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])');
  });
});
