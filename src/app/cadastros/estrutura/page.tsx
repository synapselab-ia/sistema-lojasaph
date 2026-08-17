"use client";

import { useDemoWorkspace } from "@/modules/master-data/ui/demo-workspace-provider";

export default function EstruturaPage() {
  const { structure } = useDemoWorkspace();

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header>
        <p className="text-sm font-medium text-neutral-500">Organização</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Estrutura operacional</h1>
        <p className="mt-3 text-sm text-neutral-600">
          Modelo inicial revisável: grupo → negócio → unidade → setor/local de estoque.
        </p>
      </header>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">{structure.name}</h2>
        <div className="mt-5 space-y-5">
          {structure.businesses.map((business) => (
            <div key={business.id} className="rounded-xl border border-neutral-200 p-4">
              <p className="font-semibold">{business.name}</p>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                {business.units.map((unit) => (
                  <article key={unit.id} className="rounded-xl bg-neutral-50 p-4">
                    <h3 className="font-semibold">{unit.name}</h3>
                    <div className="mt-3 text-sm text-neutral-600">
                      <p className="font-medium text-neutral-800">Setores</p>
                      <p>{unit.sectors.length ? unit.sectors.map((sector) => sector.name).join(", ") : "Ainda não detalhados"}</p>
                    </div>
                    <div className="mt-3 text-sm text-neutral-600">
                      <p className="font-medium text-neutral-800">Locais de estoque</p>
                      <p>{unit.stockLocations.map((location) => location.name).join(", ")}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
