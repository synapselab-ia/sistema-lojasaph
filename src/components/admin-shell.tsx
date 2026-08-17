"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const links = [
  { href: "/cadastros", label: "Visão geral" },
  { href: "/cadastros/estrutura", label: "Estrutura" },
  { href: "/cadastros/produtos", label: "Produtos" },
  { href: "/cadastros/fornecedores", label: "Fornecedores" },
  { href: "/cadastros/estoque", label: "Estoque" },
  { href: "/cadastros/validades", label: "Validades" },
  { href: "/cadastros/inventarios", label: "Inventários" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-neutral-100 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-neutral-200 bg-white p-4 lg:min-h-screen lg:border-b-0 lg:border-r lg:p-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">Sistema Lojasaph</Link>
        <p className="mt-1 text-xs text-neutral-500">Workspace de demonstração</p>
        <nav className="mt-5 flex gap-2 overflow-x-auto lg:flex-col" aria-label="Operação">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"}`}>
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          Dados desta fase ficam apenas na memória da sessão. Recarregar a aplicação restaura os fixtures de demonstração.
        </div>
      </aside>
      <main className="min-w-0 p-5 sm:p-8 lg:p-10">{children}</main>
    </div>
  );
}
