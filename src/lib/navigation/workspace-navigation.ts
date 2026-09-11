import type { CapabilityId } from "@/modules/composition/domain/capability";

export type WorkspaceNavigationItem = {
  href: string;
  label: string;
};

export type WorkspaceNavigationArea = {
  id: string;
  label: string;
  href?: string;
  items?: readonly WorkspaceNavigationItem[];
};

export const workspaceNavigation: readonly WorkspaceNavigationArea[] = [
  {
    id: "overview",
    label: "Visão geral",
    href: "/workspace",
  },
  {
    id: "stock",
    label: "Estoque",
    href: "/workspace/estoque",
    items: [
      { href: "/workspace/estoque/entradas", label: "Entradas" },
      { href: "/workspace/estoque/retiradas", label: "Retiradas" },
      { href: "/workspace/baixas", label: "Baixas e perdas" },
      { href: "/workspace/devolucoes", label: "Devoluções" },
      { href: "/workspace/emprestimos", label: "Empréstimos" },
      { href: "/workspace/transferencias", label: "Transferências" },
      { href: "/workspace/inventarios", label: "Inventários" },
      { href: "/workspace/estoque/lotes", label: "Lotes e validades" },
      { href: "/workspace/estoque/minimos", label: "Estoque mínimo" },
    ],
  },
  {
    id: "purchases",
    label: "Compras",
    href: "/workspace/compras",
    items: [
      { href: "/workspace/compras/pedidos", label: "Pedidos" },
      { href: "/workspace/compras/recebimentos", label: "Recebimentos" },
      { href: "/workspace/compras/historico", label: "Histórico" },
    ],
  },
  {
    id: "finance",
    label: "Financeiro",
    href: "/workspace/financeiro",
    items: [
      { href: "/workspace/financeiro/contas", label: "Contas a pagar" },
      { href: "/workspace/financeiro/vencimentos", label: "Vencimentos" },
      { href: "/workspace/financeiro/pagamentos", label: "Pagamentos" },
    ],
  },
  {
    id: "cash",
    label: "Caixa",
    href: "/workspace/caixa",
    items: [
      { href: "/workspace/caixa/sessoes", label: "Sessões" },
      { href: "/workspace/caixa/configuracao", label: "Configuração" },
    ],
  },
  {
    id: "catalogs",
    label: "Cadastros",
    items: [
      { href: "/workspace/produtos", label: "Produtos" },
      { href: "/workspace/fornecedores", label: "Fornecedores" },
      { href: "/workspace/funcionarios", label: "Funcionários" },
    ],
  },
  {
    id: "administration",
    label: "Administração",
    items: [
      { href: "/workspace/administracao/estrutura", label: "Estrutura" },
      { href: "/workspace/administracao/acessos", label: "Usuários e permissões" },
      { href: "/workspace/backup", label: "Proteção dos dados" },
    ],
  },
];

const capabilityByHref = new Map<string, CapabilityId>([
  ["/workspace/emprestimos", "stock-loans"],
]);

const compositionNavigationItem: WorkspaceNavigationItem = {
  href: "/workspace/administracao/modulos",
  label: "Montar sistema",
};

export function resolveWorkspaceNavigation(input: {
  readonly enabledCapabilities: readonly CapabilityId[];
  readonly isOrganizationOwner: boolean;
}): readonly WorkspaceNavigationArea[] {
  const enabledCapabilities = new Set(input.enabledCapabilities);

  return workspaceNavigation.map((area) => {
    const visibleItems = area.items?.filter((item) => {
      const capability = capabilityByHref.get(item.href);
      return !capability || enabledCapabilities.has(capability);
    });

    if (area.id !== "administration" || !input.isOrganizationOwner) {
      return { ...area, items: visibleItems };
    }

    const items = [...(visibleItems ?? [])];
    const backupIndex = items.findIndex((item) => item.href === "/workspace/backup");
    if (backupIndex >= 0) items.splice(backupIndex, 0, compositionNavigationItem);
    else items.push(compositionNavigationItem);
    return { ...area, items };
  });
}

export function isWorkspaceRouteActive(pathname: string, href: string): boolean {
  if (href === "/workspace") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isWorkspaceAreaActive(pathname: string, area: WorkspaceNavigationArea): boolean {
  if (area.href && isWorkspaceRouteActive(pathname, area.href)) return true;
  return area.items?.some((item) => isWorkspaceRouteActive(pathname, item.href)) ?? false;
}

export function workspaceNavigationHrefs(
  navigation: readonly WorkspaceNavigationArea[] = workspaceNavigation,
): string[] {
  return navigation.flatMap((area) => [
    ...(area.href ? [area.href] : []),
    ...(area.items?.map((item) => item.href) ?? []),
  ]);
}
