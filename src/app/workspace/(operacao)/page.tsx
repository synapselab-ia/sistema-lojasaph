"use client";

import Link from "next/link";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

export default function WorkspacePage() {
  const workspace = useRuntimeWorkspace();
  const positiveBalances = workspace.balances.filter((balance) => !balance.quantity.isZero()).length;
  const transfersInTransit = workspace.transfers.filter((transfer) => transfer.status !== "received").length;

  const cards = [
    { label: "Produtos", value: String(workspace.stockItems.length), href: "/workspace/produtos" },
    { label: "Fornecedores", value: String(workspace.suppliers.length), href: "/workspace/fornecedores" },
    { label: "Saldos com estoque", value: String(positiveBalances), href: "/workspace/estoque" },
    { label: "Transferências em trânsito", value: String(transfersInTransit), href: "/workspace/transferencias" },
    { label: "Compras", value: "Abrir", href: "/workspace/compras" },
    { label: "Financeiro", value: "Abrir", href: "/workspace/financeiro" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-sm font-medium text-emerald-700">Dados persistentes</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{workspace.organizationName}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">Este workspace consulta o Supabase com sessão autenticada e RLS. Estoque, compras e contas a pagar já operam com commands PostgreSQL transacionais, idempotência e auditoria.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => <Link key={card.label} href={card.href} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:border-neutral-300"><p className="text-sm text-neutral-500">{card.label}</p><p className="mt-2 text-2xl font-semibold">{card.value}</p></Link>)}
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950">
        <h2 className="font-semibold">Operação persistente em expansão</h2>
        <p className="mt-1">Entrada, retirada, transferência, inventário físico, compras e contas a pagar já usam persistência real. A próxima fase registrada é Caixa e fechamento diário.</p>
      </section>
    </div>
  );
}
