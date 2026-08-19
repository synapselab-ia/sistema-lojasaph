"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { SupabaseStockReturnGateway } from "@/modules/inventory/adapters/supabase-stock-return-gateway";
import { StockReturnService } from "@/modules/inventory/application/stock-return-service";
import {
  RuntimeStockReturn,
  RuntimeStockReturnCandidate,
  RuntimeStockReturnOverview,
} from "@/modules/inventory/domain/stock-return";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

const EMPTY_OVERVIEW: RuntimeStockReturnOverview = Object.freeze({
  candidates: [],
  recent: [],
});

export default function StockReturnsPage() {
  const workspace = useRuntimeWorkspace();
  const client = useMemo(() => createBrowserSupabaseClient(), []);
  const service = useMemo(
    () => new StockReturnService(new SupabaseStockReturnGateway(client)),
    [client],
  );
  const [overview, setOverview] = useState<RuntimeStockReturnOverview>(EMPTY_OVERVIEW);
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const itemNames = useMemo(
    () => new Map(workspace.stockItems.map((item) => [item.id, item.name])),
    [workspace.stockItems],
  );
  const locationNames = useMemo(
    () => new Map(workspace.stockLocations.map((location) => [
      location.id,
      `${location.unitName} — ${location.name}`,
    ])),
    [workspace.stockLocations],
  );
  const selectedCandidate = overview.candidates.find(
    (candidate) => candidate.withdrawalMovementId === selectedWithdrawalId,
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    service.loadOverview(workspace.organizationId)
      .then((next) => {
        if (!cancelled) setOverview(next);
      })
      .catch((error) => {
        if (!cancelled) setMessage(workspace.errorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [service, workspace]);

  async function reloadOverview() {
    const next = await service.loadOverview(workspace.organizationId);
    setOverview(next);
    if (!next.candidates.some((candidate) => candidate.withdrawalMovementId === selectedWithdrawalId)) {
      setSelectedWithdrawalId("");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCandidate) return;

    setSaving(true);
    setMessage(null);
    try {
      const result = await service.record({
        organizationId: workspace.organizationId,
        withdrawalMovementId: selectedCandidate.withdrawalMovementId,
        quantity,
        notes: notes || undefined,
      });
      await reloadOverview();
      setQuantity("");
      setNotes("");
      setMessage(
        `Devolução registrada. Restam ${result.remainingReturnableQuantity.toDecimal()} da retirada selecionada para eventual retorno.`,
      );
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-sm font-medium text-emerald-700">Ledger de estoque</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Devoluções de retiradas</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
          Registre o retorno parcial ou total de uma retirada já confirmada. O sistema cria um novo movimento
          <code className="mx-1 rounded bg-neutral-100 px-1 py-0.5 text-xs">return_in</code>
          relacionado ao original; a retirada histórica não é editada.
        </p>
      </header>

      {message && (
        <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">
          {message}
        </p>
      )}

      {workspace.permissions.recordStockWithdrawal ? (
        <form
          onSubmit={submit}
          className="grid gap-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:grid-cols-2"
        >
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold">Registrar devolução</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Local, produto, custo e lote são derivados da retirada original. A tela não aceita substituir esses dados manualmente.
            </p>
          </div>

          <label className="block text-sm font-medium lg:col-span-2">
            Retirada com saldo retornável
            <select
              required
              disabled={loading}
              value={selectedWithdrawalId}
              onChange={(event) => {
                setSelectedWithdrawalId(event.target.value);
                setQuantity("");
              }}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"
            >
              <option value="">{loading ? "Carregando retiradas..." : "Selecione"}</option>
              {overview.candidates.map((candidate) => (
                <CandidateOption
                  key={candidate.withdrawalMovementId}
                  candidate={candidate}
                  itemName={itemNames.get(candidate.stockItemId)}
                  locationName={locationNames.get(candidate.stockLocationId)}
                />
              ))}
            </select>
          </label>

          {selectedCandidate && (
            <div className="grid gap-3 rounded-xl bg-neutral-50 p-4 text-sm lg:col-span-2 sm:grid-cols-4">
              <Summary label="Retirado" value={selectedCandidate.withdrawnQuantity.toDecimal()} />
              <Summary label="Já devolvido" value={selectedCandidate.returnedQuantity.toDecimal()} />
              <Summary label="Pendente" value={selectedCandidate.remainingQuantity.toDecimal()} />
              <Summary
                label="Custo histórico"
                value={`R$ ${selectedCandidate.unitCostSnapshot.toDecimal().replace(".", ",")}`}
              />
            </div>
          )}

          <label className="block text-sm font-medium">
            Quantidade a devolver
            <input
              required
              inputMode="decimal"
              step="0.001"
              min="0.001"
              max={selectedCandidate?.remainingQuantity.toDecimal()}
              disabled={!selectedCandidate}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal disabled:bg-neutral-100"
            />
          </label>

          <div className="rounded-xl border border-neutral-200 p-3 text-xs leading-5 text-neutral-600">
            <span className="font-semibold text-neutral-900">Destino fixo:</span>{" "}
            {selectedCandidate
              ? locationNames.get(selectedCandidate.stockLocationId) ?? "Local da retirada"
              : "selecione uma retirada"}.
            O PostgreSQL impede que a soma dos retornos ultrapasse a quantidade retirada.
          </div>

          <label className="block text-sm font-medium lg:col-span-2">
            Observação complementar (opcional)
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 font-normal"
            />
          </label>

          <button
            disabled={saving || loading || !selectedCandidate}
            type="submit"
            className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 lg:col-span-2"
          >
            {saving ? "Registrando..." : "Registrar devolução"}
          </button>
        </form>
      ) : (
        <aside className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm leading-6 text-neutral-600 shadow-sm">
          <h2 className="font-semibold text-neutral-900">Devolução não autorizada</h2>
          <p className="mt-1">
            Seu perfil pode consultar retiradas visíveis no escopo, mas não possui papel autorizado para devolver estoque.
          </p>
        </aside>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Devoluções recentes</h2>
            <p className="text-sm text-neutral-500">
              Movimentos de retorno relacionados a retiradas visíveis no seu escopo.
            </p>
          </div>
          <span className="text-xs text-neutral-500">{overview.recent.length} movimentos</span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Retirada relacionada</th>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Local</th>
                  <th className="px-4 py-3 font-medium">Quantidade</th>
                  <th className="px-4 py-3 font-medium">Custo histórico</th>
                  <th className="px-4 py-3 font-medium">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {overview.recent.map((stockReturn) => (
                  <ReturnRow
                    key={stockReturn.id}
                    stockReturn={stockReturn}
                    itemName={itemNames.get(stockReturn.stockItemId)}
                    locationName={locationNames.get(stockReturn.stockLocationId)}
                  />
                ))}
                {!loading && overview.recent.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                      Ainda não há devoluções relacionadas visíveis neste escopo.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                      Carregando devoluções...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function CandidateOption({
  candidate,
  itemName,
  locationName,
}: {
  candidate: RuntimeStockReturnCandidate;
  itemName?: string;
  locationName?: string;
}) {
  return (
    <option value={candidate.withdrawalMovementId}>
      {new Date(candidate.occurredAt).toLocaleString("pt-BR")} · {itemName ?? "Item indisponível"} ·{" "}
      {locationName ?? "Local indisponível"} · pendente {candidate.remainingQuantity.toDecimal()}
    </option>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function ReturnRow({
  stockReturn,
  itemName,
  locationName,
}: {
  stockReturn: RuntimeStockReturn;
  itemName?: string;
  locationName?: string;
}) {
  return (
    <tr>
      <td className="whitespace-nowrap px-4 py-3">{new Date(stockReturn.occurredAt).toLocaleString("pt-BR")}</td>
      <td className="px-4 py-3 font-mono text-xs">{stockReturn.withdrawalMovementId.slice(0, 8)}…</td>
      <td className="px-4 py-3">{itemName ?? "Item indisponível"}</td>
      <td className="px-4 py-3">{locationName ?? "Local indisponível"}</td>
      <td className="px-4 py-3 font-semibold">{stockReturn.quantity.toDecimal()}</td>
      <td className="px-4 py-3">R$ {stockReturn.unitCostSnapshot.toDecimal().replace(".", ",")}</td>
      <td className="px-4 py-3 text-neutral-600">{stockReturn.notes || "—"}</td>
    </tr>
  );
}
