import { describe, expect, it } from "vitest";
import { safeInternalPath, urlWithMessage } from "./redirect";

describe("safeInternalPath", () => {
  it("accepts local absolute paths", () => {
    expect(safeInternalPath("/workspace/produtos?tab=ativos#lista")).toBe("/workspace/produtos?tab=ativos#lista");
  });

  it("rejects external and protocol-relative redirects", () => {
    expect(safeInternalPath("https://example.com/steal")).toBe("/workspace");
    expect(safeInternalPath("//example.com/steal")).toBe("/workspace");
  });

  it("uses the supplied fallback for malformed values", () => {
    expect(safeInternalPath("not-a-path", "/login")).toBe("/login");
    expect(safeInternalPath(null, "/login")).toBe("/login");
  });
});

describe("urlWithMessage", () => {
  it("preserves existing query parameters and safely encodes messages", () => {
    expect(urlWithMessage("/login?next=%2Fworkspace", "error", "Sessão expirada & inválida")).toBe(
      "/login?next=%2Fworkspace&error=Sess%C3%A3o+expirada+%26+inv%C3%A1lida",
    );
  });
});
