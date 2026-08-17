import Link from "next/link";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

export default function WorkspacePage() {
  return <WorkspaceOverview />;
}

function WorkspaceOverview() {
  "use client";
  const workspace = useRuntimeWorkspace();
  const positiveBalances = workspace.balances.filter((balance) => !balance.quantity.isZero()).length;

  const cards = [
    { label: "Produtos", value: workspace.stockItems.length, href: "/workspace/produtos" },
    { label: "Fornecedores", value: workspace.suppliers.length, href: "/workspace/fornecedores" },
    { label: "Locais de estoque", value: workspace.stockLocations.length, href: "/workspace/estoque" },
    { label: "Saldos com estoque", value: positiveBalances, href: "/workspace/estoque" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-sm font-medium text-emerald-700">Dados persistentes</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{workspace.organizationName}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">Este workspace consulta o Supabase com a sessão autenticada e respeita RLS. Nesta fase, cadastros de produtos/fornecedores e entrada de estoque já são persistentes.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <Link key={card.label} href={card.href} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:border-neutral-300"><p className="text-sm text-neutral-500">{card.label}</p><p className="mt-2 text-3xl font-semibold">{card.value}</p></Link>)}
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        <h2 className="font-semibold">Limite operacional desta fase</h2>
        <p className="mt-1">Retiradas, transferências, FEFO e inventários ainda não são executados neste workspace persistente. Eles permanecem disponíveis somente na demonstração até possuírem comandos PostgreSQL transacionais equivalentes aos já criados para entrada.</p>
      </section>
    </div>
  );
}
