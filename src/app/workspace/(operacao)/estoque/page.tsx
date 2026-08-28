"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { isBelowStockMinimum } from "@/modules/inventory/domain/stock-minimum";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

type MinimumFilter = "all" | "below" | "ok" | "unconfigured";

export default function RuntimeStockPage() {
  const workspace = useRuntimeWorkspace();
  const [query, setQuery] = useState("");
  const [minimumFilter, setMinimumFilter] = useState<MinimumFilter>("all");

  const itemNames = useMemo(
    () => new Map(workspace.stockItems.map((item) => [item.id, item.name])),
    [workspace.stockItems],
  );
  const itemUnits = useMemo(
    () => new Map(workspace.stockItems.map((item) => [item.id, item.baseUnitCode])),
    [workspace.stockItems],
  );
  const locationNames = useMemo(
    () => new Map(workspace.stockLocations.map((location) => [location.id, `${location.unitName} — ${location.name}`])),
    [workspace.stockLocations],
  );
  const activeMinimumByKey = useMemo(
    () => new Map(
      workspace.stockMinimumPolicies
        .filter((policy) => policy.active)
        .map((policy) => [`${policy.stockLocationId}:${policy.stockItemId}`, policy]),
    ),
    [workspace.stockMinimumPolicies],
  );

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");

    return workspace.balances.filter((balance) => {
      const itemName = itemNames.get(balance.stockItemId) ?? "Item indisponível";
      const locationName = locationNames.get(balance.stockLocationId) ?? "Local indisponível";
      const policy = activeMinimumByKey.get(`${balance.stockLocationId}:${balance.stockItemId}`);
      const belowMinimum = isBelowStockMinimum(balance.quantity, policy);
      const status: Exclude<MinimumFilter, "all"> = !policy ? "unconfigured" : belowMinimum ? "below" : "ok";
      const matchesQuery = !normalizedQuery || `${itemName} ${locationName}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
      const matchesStatus = minimumFilter === "all" || minimumFilter === status;
      return matchesQuery && matchesStatus;
    });
  }, [activeMinimumByKey, itemNames, locationNames, minimumFilter, query, workspace.balances]);

  const belowMinimumCount = workspace.balances.filter((balance) => {
    const policy = activeMinimumByKey.get(`${balance.stockLocationId}:${balance.stockItemId}`);
    return isBelowStockMinimum(balance.quantity, policy);
  }).length;
  const expiredBatchCount = workspace.batches.filter((batch) => batch.expirationDate && batch.expirationDate <= new Date().toISOString().slice(0, 10)).length;
  const openTransferCount = workspace.transfers.filter((transfer) => transfer.status !== "received").length;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        eyebrow="Estoque"
        title="Posição de estoque"
        description="Consulte o que existe em cada local, identifique situações que exigem atenção e acesse as operações de movimentação sem misturar cadastro e execução na mesma tela."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo do estoque">
        <SummaryPanel label="Posições com saldo" value={String(workspace.balances.length)} />
        <SummaryPanel label="Abaixo do mínimo" value={String(belowMinimumCount)} attention={belowMinimumCount > 0} />
        <SummaryPanel label="Lotes vencidos com saldo" value={String(expiredBatchCount)} attention={expiredBatchCount > 0} />
        <SummaryPanel label="Transferências em trânsito" value={String(openTransferCount)} attention={openTransferCount > 0} />
      </section>

      <section>
        <h2 className="text-lg font-semibold">Operações</h2>
        <p className="mt-1 text-sm text-neutral-600">Escolha a tarefa que deseja executar. Cada operação mantém suas validações e permissões existentes.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StockShortcut href="/workspace/estoque/entradas" title="Entradas" description="Registrar recebimento direto de estoque." />
          <StockShortcut href="/workspace/estoque/retiradas" title="Retiradas" description="Registrar consumo por setor." />
          <StockShortcut href="/workspace/baixas" title="Baixas e perdas" description="Perdas, quebras e vencimentos." />
          <StockShortcut href="/workspace/devolucoes" title="Devoluções" description="Retornar itens de retiradas anteriores." />
          <StockShortcut href="/workspace/transferencias" title="Transferências" description="Expedir e receber entre locais." />
          <StockShortcut href="/workspace/inventarios" title="Inventários" description="Contar e reconciliar estoque físico." />
          <StockShortcut href="/workspace/estoque/lotes" title="Lotes e validades" description="Consultar rastreabilidade e vencimentos." />
          <StockShortcut href="/workspace/estoque/minimos" title="Estoque mínimo" description="Consultar e manter limites por local." />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Saldos por produto e local</h2>
            <p className="text-sm text-neutral-600">A posição é somente leitura; alterações de saldo acontecem pelas operações próprias.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_190px]">
            <label className="text-sm font-medium">
              Buscar
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Produto ou local"
                className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"
              />
            </label>
            <label className="text-sm font-medium">
              Situação
              <select
                value={minimumFilter}
                onChange={(event) => setMinimumFilter(event.target.value as MinimumFilter)}
                className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"
              >
                <option value="all">Todas</option>
                <option value="below">Abaixo do mínimo</option>
                <option value="ok">Dentro do mínimo</option>
                <option value="unconfigured">Sem mínimo definido</option>
              </select>
            </label>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title={workspace.balances.length === 0 ? "Ainda não há saldos" : "Nenhuma posição encontrada"}
            description={workspace.balances.length === 0 ? "Registre uma entrada para iniciar a posição de estoque." : "Ajuste a busca ou o filtro de situação."}
            action={workspace.balances.length === 0 && workspace.permissions.recordStockEntry ? (
              <Link href="/workspace/estoque/entradas" className="inline-flex min-h-11 items-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">Registrar entrada</Link>
            ) : undefined}
          />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Produto</th>
                    <th className="px-4 py-3 font-medium">Local</th>
                    <th className="px-4 py-3 font-medium">Saldo</th>
                    <th className="px-4 py-3 font-medium">Mínimo</th>
                    <th className="px-4 py-3 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rows.map((balance) => {
                    const policy = activeMinimumByKey.get(`${balance.stockLocationId}:${balance.stockItemId}`);
                    const belowMinimum = isBelowStockMinimum(balance.quantity, policy);
                    return (
                      <tr key={`${balance.stockLocationId}:${balance.stockItemId}`}>
                        <td className="px-4 py-3 font-medium">{itemNames.get(balance.stockItemId) ?? "Item indisponível"}</td>
                        <td className="px-4 py-3 text-neutral-600">{locationNames.get(balance.stockLocationId) ?? "Local indisponível"}</td>
                        <td className="px-4 py-3 font-semibold">{balance.quantity.toDecimal()} {itemUnits.get(balance.stockItemId) ?? ""}</td>
                        <td className="px-4 py-3">{policy ? `${policy.minimumQuantity.toDecimal()} ${itemUnits.get(balance.stockItemId) ?? ""}` : "—"}</td>
                        <td className="px-4 py-3"><MinimumStatus configured={Boolean(policy)} below={belowMinimum} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 md:hidden">
              {rows.map((balance) => {
                const policy = activeMinimumByKey.get(`${balance.stockLocationId}:${balance.stockItemId}`);
                const belowMinimum = isBelowStockMinimum(balance.quantity, policy);
                return (
                  <Panel key={`${balance.stockLocationId}:${balance.stockItemId}`} padding="sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold">{itemNames.get(balance.stockItemId) ?? "Item indisponível"}</h3>
                        <p className="mt-1 text-sm text-neutral-600">{locationNames.get(balance.stockLocationId) ?? "Local indisponível"}</p>
                      </div>
                      <MinimumStatus configured={Boolean(policy)} below={belowMinimum} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-neutral-500">Saldo</p><p className="mt-1 font-semibold">{balance.quantity.toDecimal()} {itemUnits.get(balance.stockItemId) ?? ""}</p></div>
                      <div><p className="text-xs text-neutral-500">Mínimo</p><p className="mt-1 font-semibold">{policy ? `${policy.minimumQuantity.toDecimal()} ${itemUnits.get(balance.stockItemId) ?? ""}` : "Não definido"}</p></div>
                    </div>
                  </Panel>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SummaryPanel({ label, value, attention = false }: { label: string; value: string; attention?: boolean }) {
  return (
    <Panel tone={attention ? "attention" : "neutral"} padding="sm">
      <p className="text-xs font-medium text-neutral-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </Panel>
  );
}

function StockShortcut({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-400 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900">
      <span className="font-semibold">{title}</span>
      <span className="mt-1 block text-sm leading-5 text-neutral-600">{description}</span>
    </Link>
  );
}

function MinimumStatus({ configured, below }: { configured: boolean; below: boolean }) {
  if (!configured) return <StatusBadge tone="neutral">Sem mínimo</StatusBadge>;
  if (below) return <StatusBadge tone="danger">Abaixo do mínimo</StatusBadge>;
  return <StatusBadge tone="success">Dentro do mínimo</StatusBadge>;
}
