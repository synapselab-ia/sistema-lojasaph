import Link from "next/link";

const cards = [
  {
    href: "/cadastros/estrutura",
    title: "Estrutura organizacional",
    description: "Visualize negócios, unidades, setores e locais de estoque.",
  },
  {
    href: "/cadastros/produtos",
    title: "Produtos e itens",
    description: "Crie e edite itens de estoque com categoria e unidade de medida.",
  },
  {
    href: "/cadastros/fornecedores",
    title: "Fornecedores",
    description: "Gerencie fornecedores, contatos e preços observados por item.",
  },
];

export default function CadastrosPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-sm font-medium text-neutral-500">Fase 4</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Cadastros base</h1>
        <p className="mt-3 max-w-2xl leading-7 text-neutral-600">
          Primeiro fluxo funcional do sistema. Os dados abaixo são fixtures seguros e alterações duram apenas durante a sessão.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <h2 className="text-lg font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">{card.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
