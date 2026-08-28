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

  it("groups the complete stock journey below Estoque", () => {
    const stock = workspaceNavigation.find((area) => area.id === "stock");

    expect(stock?.href).toBe("/workspace/estoque");
    expect(stock?.items).toEqual([
      { href: "/workspace/estoque/entradas", label: "Entradas" },
      { href: "/workspace/estoque/retiradas", label: "Retiradas" },
      { href: "/workspace/baixas", label: "Baixas e perdas" },
      { href: "/workspace/devolucoes", label: "Devoluções" },
      { href: "/workspace/transferencias", label: "Transferências" },
      { href: "/workspace/inventarios", label: "Inventários" },
      { href: "/workspace/estoque/lotes", label: "Lotes e validades" },
      { href: "/workspace/estoque/minimos", label: "Estoque mínimo" },
    ]);
  });

  it("groups the purchase journey below Compras", () => {
    const purchases = workspaceNavigation.find((area) => area.id === "purchases");

    expect(purchases?.href).toBe("/workspace/compras");
    expect(purchases?.items).toEqual([
      { href: "/workspace/compras/pedidos", label: "Pedidos" },
      { href: "/workspace/compras/recebimentos", label: "Recebimentos" },
      { href: "/workspace/compras/historico", label: "Histórico" },
    ]);
  });

  it("keeps every current operational shell destination reachable", () => {
    expect(workspaceNavigationHrefs()).toEqual([
      "/workspace",
      "/workspace/estoque",
      "/workspace/estoque/entradas",
      "/workspace/estoque/retiradas",
      "/workspace/baixas",
      "/workspace/devolucoes",
      "/workspace/transferencias",
      "/workspace/inventarios",
      "/workspace/estoque/lotes",
      "/workspace/estoque/minimos",
      "/workspace/compras",
      "/workspace/compras/pedidos",
      "/workspace/compras/recebimentos",
      "/workspace/compras/historico",
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

  it("marks parent areas active for legacy and nested routes", () => {
    const stock = workspaceNavigation.find((area) => area.id === "stock");
    const purchases = workspaceNavigation.find((area) => area.id === "purchases");
    const catalogs = workspaceNavigation.find((area) => area.id === "catalogs");
    const administration = workspaceNavigation.find((area) => area.id === "administration");

    expect(stock && isWorkspaceAreaActive("/workspace/transferencias", stock)).toBe(true);
    expect(stock && isWorkspaceAreaActive("/workspace/estoque/entradas", stock)).toBe(true);
    expect(purchases && isWorkspaceAreaActive("/workspace/compras/pedidos/abc", purchases)).toBe(true);
    expect(catalogs && isWorkspaceAreaActive("/workspace/fornecedores", catalogs)).toBe(true);
    expect(administration && isWorkspaceAreaActive("/workspace/administracao/acessos", administration)).toBe(true);
  });
});
