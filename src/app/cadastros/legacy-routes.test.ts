import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeMappings = [
  ["./page.tsx", 'redirect("/workspace")'],
  ["./estrutura/page.tsx", 'redirect("/workspace/administracao/estrutura")'],
  ["./produtos/page.tsx", 'redirect("/workspace/produtos")'],
  ["./fornecedores/page.tsx", 'redirect("/workspace/fornecedores")'],
  ["./estoque/page.tsx", 'redirect("/workspace/estoque")'],
  ["./inventarios/page.tsx", 'redirect("/workspace/inventarios")'],
  ["./validades/page.tsx", 'redirect("/workspace/estoque/lotes")'],
] as const;

const layoutSource = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");
const workspaceNavigationSource = readFileSync(
  new URL("../../lib/navigation/workspace-navigation.ts", import.meta.url),
  "utf8",
);

describe("legacy /cadastros route contract", () => {
  for (const [path, redirectCall] of routeMappings) {
    it(`${path} redirects to the canonical workspace route`, () => {
      const source = readFileSync(new URL(path, import.meta.url), "utf8");
      expect(source).toContain('from "next/navigation"');
      expect(source).toContain(redirectCall);
      expect(source).not.toContain("useDemoWorkspace");
      expect(source).not.toContain("DemoWorkspaceProvider");
      expect(source).not.toContain("Fase 4");
      expect(source).not.toContain("fixtures");
    });
  }

  it("does not mount the legacy demo shell for compatibility redirects", () => {
    expect(layoutSource).not.toContain("DemoWorkspaceProvider");
    expect(layoutSource).not.toContain("AdminShell");
  });

  it("keeps canonical workspace navigation free of legacy /cadastros links", () => {
    expect(workspaceNavigationSource).not.toContain("/cadastros");
  });
});
