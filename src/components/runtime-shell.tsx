"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const links = [
  { href: "/workspace", label: "Visão geral" },
  { href: "/workspace/produtos", label: "Produtos" },
  { href: "/workspace/fornecedores", label: "Fornecedores" },
  { href: "/workspace/estoque", label: "Estoque" },
  { href: "/workspace/transferencias", label: "Transferências" },
  { href: "/workspace/inventarios", label: "Inventários" },
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
      <aside className="border-b border-neutral-200 bg-white p-4 lg:min-h-screen lg:border-b-0 lg:border-r lg:p-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">Sistema Lojasaph</Link>
        <p className="mt-1 text-xs font-medium text-emerald-700">Workspace persistente</p>
        <div className="mt-4 rounded-xl bg-neutral-100 p-3">
          <p className="text-xs text-neutral-500">Organização</p>
          <p className="mt-1 text-sm font-semibold">{organizationName}</p>
          <p className="mt-1 text-xs text-neutral-500">Perfis: {roles.join(", ")}</p>
        </div>
        <nav className="mt-5 flex gap-2 overflow-x-auto lg:flex-col" aria-label="Operação persistente">
          {links.map((link) => {
            const active = pathname === link.href;
            return <Link key={link.href} href={link.href} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"}`}>{link.label}</Link>;
          })}
        </nav>
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
          Produtos, fornecedores, entradas, retiradas, transferências e inventário físico desta área usam Supabase + RLS. Compras evolui em uma fase separada.
        </div>
        <div className="mt-5 flex flex-wrap gap-2 lg:flex-col">
          {canSwitchOrganization && <Link href="/workspace/selecionar-organizacao" className="rounded-lg border border-neutral-300 px-3 py-2 text-center text-xs font-medium">Trocar organização</Link>}
          <Link href="/cadastros" className="rounded-lg border border-neutral-300 px-3 py-2 text-center text-xs font-medium">Abrir demonstração</Link>
          <form action="/auth/signout" method="post"><button type="submit" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium">Sair</button></form>
        </div>
      </aside>
      <main className="min-w-0 p-5 sm:p-8 lg:p-10">{children}</main>
    </div>
  );
}
