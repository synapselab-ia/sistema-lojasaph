import { describe, expect, it } from "vitest";
import {
  isWorkspaceAreaActive,
  isWorkspaceRouteActive,
  workspaceNavigation,
  workspaceNavigationHrefs,
} from "./workspace-navigation";

describe("workspaceNavigation", () => {
  it("exposes the approved first-level product areas in order", () => {
    expect(workspaceNavigation.map((area) => area.label)).toEqual([
      "Visão geral",
      "Estoque",
      "Compras",
      "Financeiro",
      "Caixa",
      "Cadastros",
      "Administração",
    ]);
  });

  it("groups stock operations below Estoque instead of the first level", () => {
    const stock = workspaceNavigation.find((area) => area.id === "stock");

    expect(stock?.href).toBe("/workspace/estoque");
    expect(stock?.items?.map((item) => item.href)).toEqual([
      "/workspace/baixas",
      "/workspace/devolucoes",
      "/workspace/transferencias",
      "/workspace/inventarios",
    ]);
  });

  it("keeps every current operational shell destination reachable", () => {
    expect(workspaceNavigationHrefs()).toEqual([
      "/workspace",
      "/workspace/estoque",
      "/workspace/baixas",
      "/workspace/devolucoes",
      "/workspace/transferencias",
      "/workspace/inventarios",
      "/workspace/compras",
      "/workspace/financeiro",
      "/workspace/caixa",
      "/workspace/produtos",
      "/workspace/fornecedores",
      "/workspace/funcionarios",
      "/workspace/administracao/estrutura",
      "/workspace/administracao/acessos",
      "/workspace/backup",
    ]);
  });

  it("does not promote demonstration routes to the normal workspace navigation", () => {
    expect(workspaceNavigationHrefs()).not.toContain("/cadastros");
  });
});

describe("workspace navigation active state", () => {
  it("keeps the workspace overview exact so subroutes do not activate it", () => {
    expect(isWorkspaceRouteActive("/workspace", "/workspace")).toBe(true);
    expect(isWorkspaceRouteActive("/workspace/produtos", "/workspace")).toBe(false);
  });

  it("keeps a destination active on nested detail routes", () => {
    expect(isWorkspaceRouteActive("/workspace/produtos/abc", "/workspace/produtos")).toBe(true);
    expect(isWorkspaceRouteActive("/workspace/produtos-antigos", "/workspace/produtos")).toBe(false);
  });

  it("marks the parent area active when a grouped subarea is active", () => {
    const stock = workspaceNavigation.find((area) => area.id === "stock");
    const catalogs = workspaceNavigation.find((area) => area.id === "catalogs");
    const administration = workspaceNavigation.find((area) => area.id === "administration");

    expect(stock && isWorkspaceAreaActive("/workspace/transferencias", stock)).toBe(true);
    expect(catalogs && isWorkspaceAreaActive("/workspace/fornecedores", catalogs)).toBe(true);
    expect(administration && isWorkspaceAreaActive("/workspace/administracao/acessos", administration)).toBe(true);
  });
});
