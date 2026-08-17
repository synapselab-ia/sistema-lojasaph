import Link from "next/link";

const foundations = [
  "PostgreSQL/Supabase com migrations e RLS",
  "Sessão SSR e autorização por membership",
  "CI com aplicação + banco",
  "Arquitetura multi-negócio e multi-unidade",
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12 sm:px-10 lg:py-16">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">Sistema de gestão</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Sistema Lojasaph</h1>
        <p className="max-w-2xl text-base leading-7 text-neutral-600">Gestão operacional multi-unidade com núcleo de estoque persistente e evolução planejada para compras, financeiro e caixa.</p>
        <div className="flex flex-wrap gap-3 pt-3">
          <Link href="/workspace" className="inline-flex rounded-xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-700">Entrar no workspace persistente</Link>
          <Link href="/cadastros" className="inline-flex rounded-xl border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50">Abrir demonstração</Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Estado da fundação">
        {foundations.map((item) => <article key={item} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><p className="font-medium">{item}</p></article>)}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="text-xl font-semibold text-emerald-950">Núcleo de estoque persistente</h2>
          <p className="mt-2 leading-7 text-emerald-950">Produtos, fornecedores, entradas, retiradas, transferências e inventário físico usam Supabase, RLS e comandos PostgreSQL transacionais/auditados.</p>
        </article>
        <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Próxima fase</h2>
          <p className="mt-2 leading-7 text-neutral-600">Compras, pedidos e recebimento operacional serão ligados ao estoque persistente antes de avançar para financeiro e caixa.</p>
        </article>
      </section>
    </main>
  );
}
