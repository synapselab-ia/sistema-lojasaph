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
      { href: "/workspace/baixas", label: "Baixas" },
      { href: "/workspace/devolucoes", label: "Devoluções" },
      { href: "/workspace/transferencias", label: "Transferências" },
      { href: "/workspace/inventarios", label: "Inventários" },
    ],
  },
  {
    id: "purchases",
    label: "Compras",
    href: "/workspace/compras",
  },
  {
    id: "finance",
    label: "Financeiro",
    href: "/workspace/financeiro",
  },
  {
    id: "cash",
    label: "Caixa",
    href: "/workspace/caixa",
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
    items: [{ href: "/workspace/backup", label: "Proteção dos dados" }],
  },
];

export function isWorkspaceRouteActive(pathname: string, href: string): boolean {
  if (href === "/workspace") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isWorkspaceAreaActive(pathname: string, area: WorkspaceNavigationArea): boolean {
  if (area.href && isWorkspaceRouteActive(pathname, area.href)) return true;
  return area.items?.some((item) => isWorkspaceRouteActive(pathname, item.href)) ?? false;
}

export function workspaceNavigationHrefs(): string[] {
  return workspaceNavigation.flatMap((area) => [
    ...(area.href ? [area.href] : []),
    ...(area.items?.map((item) => item.href) ?? []),
  ]);
}
