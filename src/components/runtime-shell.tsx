"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const links = [
  { href: "/workspace", label: "Visão geral" },
  { href: "/workspace/produtos", label: "Produtos" },
  { href: "/workspace/fornecedores", label: "Fornecedores" },
  { href: "/workspace/funcionarios", label: "Funcionários" },
  { href: "/workspace/estoque", label: "Estoque" },
  { href: "/workspace/baixas", label: "Baixas" },
  { href: "/workspace/devolucoes", label: "Devoluções" },
  { href: "/workspace/transferencias", label: "Transferências" },
  { href: "/workspace/inventarios", label: "Inventários" },
  { href: "/workspace/compras", label: "Compras" },
  { href: "/workspace/financeiro", label: "Financeiro" },
  { href: "/workspace/caixa", label: "Caixa" },
];

export function RuntimeShell({
  children,
  organizationName,
  roles,
  canSwitchOrganization,
}: {
  children: ReactNode;
  organizationName: string;
  roles: readonly string[];
  canSwitchOrganization: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-neutral-100 lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="min-w-0 border-b border-neutral-200 bg-white p-4 lg:min-h-screen lg:border-b-0 lg:border-r lg:p-6">
        <Link href="/" className="inline-flex min-h-11 items-center text-lg font-semibold tracking-tight">Sistema Lojasaph</Link>
        <p className="mt-1 text-xs font-medium text-emerald-700">Workspace persistente</p>
        <div className="mt-4 min-w-0 rounded-xl bg-neutral-100 p-3">
          <p className="text-xs text-neutral-500">Organização</p>
          <p className="mt-1 break-words text-sm font-semibold">{organizationName}</p>
          <p className="mt-1 break-words text-xs text-neutral-500">Perfis: {roles.join(", ")}</p>
        </div>
        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible" aria-label="Operação persistente">
          {links.map((link) => {
            const active = pathname === link.href;
            return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"}`}>{link.label}</Link>;
          })}
        </nav>
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
          Estoque, compras, contas a pagar, caixa e cadastros administrativos usam Supabase + RLS.
        </div>
        <div className="mt-5 flex flex-wrap gap-2 lg:flex-col">
          {canSwitchOrganization && <Link href="/workspace/selecionar-organizacao" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-neutral-300 px-3 py-2 text-center text-xs font-medium">Trocar organização</Link>}
          <Link href="/cadastros" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-neutral-300 px-3 py-2 text-center text-xs font-medium">Abrir demonstração</Link>
          <form action="/auth/signout" method="post"><button type="submit" className="min-h-11 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium">Sair</button></form>
        </div>
      </aside>
      <main className="min-w-0 p-4 sm:p-6 lg:p-10">{children}</main>
    </div>
  );
}
