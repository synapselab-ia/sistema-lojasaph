const foundations = [
  "Domínio e modelo lógico documentados",
  "Persistência desacoplada de fornecedor",
  "Qualidade automatizada por CI",
  "Preparado para múltiplos negócios e unidades",
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-12 sm:px-10 lg:py-16">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Fundação técnica
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Sistema Lojasaph
        </h1>
        <p className="max-w-2xl text-base leading-7 text-neutral-600">
          Base executável para estoque, compras, financeiro, caixa e gestão,
          sem acoplamento prematuro a um banco específico.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Estado da fundação">
        {foundations.map((item) => (
          <article key={item} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="font-medium">{item}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Próximo fluxo vertical</h2>
        <p className="mt-2 leading-7 text-neutral-600">
          Cadastros básicos de organização, produtos e fornecedores, seguidos
          pelo primeiro fluxo real de movimentação de estoque.
        </p>
      </section>
    </main>
  );
}
