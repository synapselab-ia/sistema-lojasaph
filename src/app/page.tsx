import Link from "next/link";

const foundations = [
  "Domínio e modelo lógico documentados",
  "Persistência desacoplada de fornecedor",
  "CI com lint, tipos, testes e build",
  "Preparado para múltiplos negócios e unidades",
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12 sm:px-10 lg:py-16">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">Sistema de gestão</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Sistema Lojasaph</h1>
        <p className="max-w-2xl text-base leading-7 text-neutral-600">Base profissional para estoque, compras, fornecedores, financeiro, caixa e gestão multi-unidade.</p>
        <div className="pt-3"><Link href="/cadastros" className="inline-flex rounded-xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white hover:bg-neutral-700">Abrir cadastros de demonstração</Link></div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Estado da fundação">
        {foundations.map((item) => <article key={item} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><p className="font-medium">{item}</p></article>)}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Fluxo atual</h2>
        <p className="mt-2 leading-7 text-neutral-600">A Fase 4 já permite experimentar a estrutura organizacional, produtos, fornecedores, contatos e preço por fornecedor sem depender de banco real.</p>
      </section>
    </main>
  );
}
