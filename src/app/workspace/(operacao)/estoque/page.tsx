"use client";

import { FormEvent, useMemo, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { isBelowStockMinimum } from "@/modules/inventory/domain/stock-minimum";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

export default function RuntimeStockPage() {
  const workspace = useRuntimeWorkspace();
  const [entry, setEntry] = useState({ stockItemId: "", stockLocationId: "", quantity: "", unitCost: "", batchCode: "", expirationDate: "", notes: "" });
  const [withdrawal, setWithdrawal] = useState({ stockItemId: "", stockLocationId: "", sectorId: "", quantity: "", preferredBatchId: "", notes: "" });
  const [minimum, setMinimum] = useState({ stockItemId: "", stockLocationId: "", quantity: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [savingOperation, setSavingOperation] = useState<"entry" | "withdrawal" | "minimum" | null>(null);

  const itemNames = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item.name])), [workspace.stockItems]);
  const itemUnits = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item.baseUnitCode])), [workspace.stockItems]);
  const locationNames = useMemo(() => new Map(workspace.stockLocations.map((location) => [location.id, `${location.unitName} — ${location.name}`])), [workspace.stockLocations]);
  const activeMinimumByKey = useMemo(() => new Map(
    workspace.stockMinimumPolicies
      .filter((policy) => policy.active)
      .map((policy) => [`${policy.stockLocationId}:${policy.stockItemId}`, policy]),
  ), [workspace.stockMinimumPolicies]);
  const selectedMinimumPolicy = activeMinimumByKey.get(`${minimum.stockLocationId}:${minimum.stockItemId}`);
  const selectedWithdrawalItem = workspace.stockItems.find((item) => item.id === withdrawal.stockItemId);
  const withdrawalBatches = workspace.batches.filter((batch) => batch.stockItemId === withdrawal.stockItemId && batch.stockLocationId === withdrawal.stockLocationId);

  function selectMinimumItem(stockItemId: string) {
    const policy = activeMinimumByKey.get(`${minimum.stockLocationId}:${stockItemId}`);
    setMinimum({ ...minimum, stockItemId, quantity: policy?.minimumQuantity.toDecimal() ?? "" });
  }

  function selectMinimumLocation(stockLocationId: string) {
    const policy = activeMinimumByKey.get(`${stockLocationId}:${minimum.stockItemId}`);
    setMinimum({ ...minimum, stockLocationId, quantity: policy?.minimumQuantity.toDecimal() ?? "" });
  }

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingOperation("entry");
    setMessage(null);
    try {
      await workspace.recordEntry({
        stockItemId: entry.stockItemId as EntityId,
        stockLocationId: entry.stockLocationId as EntityId,
        quantity: entry.quantity,
        unitCost: entry.unitCost,
        batchCode: entry.batchCode || undefined,
        expirationDate: entry.expirationDate || undefined,
        notes: entry.notes || undefined,
      });
      setEntry({ stockItemId: "", stockLocationId: "", quantity: "", unitCost: "", batchCode: "", expirationDate: "", notes: "" });
      setMessage("Entrada persistida. Movimento, saldo, custo médio, lote e auditoria foram processados atomicamente.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingOperation(null);
    }
  }

  async function submitWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingOperation("withdrawal");
    setMessage(null);
    try {
      await workspace.recordWithdrawal({
        stockItemId: withdrawal.stockItemId as EntityId,
        stockLocationId: withdrawal.stockLocationId as EntityId,
        sectorId: withdrawal.sectorId as EntityId,
        quantity: withdrawal.quantity,
        preferredBatchId: withdrawal.preferredBatchId ? (withdrawal.preferredBatchId as EntityId) : undefined,
        notes: withdrawal.notes || undefined,
      });
      setWithdrawal({ stockItemId: "", stockLocationId: "", sectorId: "", quantity: "", preferredBatchId: "", notes: "" });
      setMessage("Retirada persistida com Setor explícito. Saldo, lotes, movimento e auditoria foram atualizados na mesma transação.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingOperation(null);
    }
  }

  async function submitMinimum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingOperation("minimum");
    setMessage(null);
    try {
      await workspace.saveStockMinimum({
        stockItemId: minimum.stockItemId as EntityId,
        stockLocationId: minimum.stockLocationId as EntityId,
        minimumQuantity: minimum.quantity,
      });
      setMessage("Estoque mínimo salvo para o produto e local selecionados.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingOperation(null);
    }
  }

  async function deactivateMinimum() {
    if (!selectedMinimumPolicy) return;
    setSavingOperation("minimum");
    setMessage(null);
    try {
      await workspace.deactivateStockMinimum({
        stockItemId: selectedMinimumPolicy.stockItemId,
        stockLocationId: selectedMinimumPolicy.stockLocationId,
      });
      setMinimum({ ...minimum, quantity: "" });
      setMessage("Estoque mínimo desativado. A combinação deixa de gerar alerta até nova configuração.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingOperation(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-sm font-medium text-emerald-700">Ledger persistente</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Estoque</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">O saldo é somente leitura. Entradas e retiradas usam RPCs PostgreSQL transacionais e idempotentes; o estoque mínimo é configuração separada por produto e local.</p>
      </header>
      {message && <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">{message}</p>}

      <section>
        <div className="mb-3 flex items-end justify-between"><div><h2 className="text-xl font-semibold">Saldos atuais</h2><p className="text-sm text-neutral-500">Custo médio e política de mínimo por produto e local.</p></div><span className="text-xs text-neutral-500">{workspace.balances.length} combinações</span></div>
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Produto</th><th className="px-4 py-3 font-medium">Local</th><th className="px-4 py-3 font-medium">Saldo</th><th className="px-4 py-3 font-medium">Estoque mínimo</th><th className="px-4 py-3 font-medium">Situação</th><th className="px-4 py-3 font-medium">Custo médio</th></tr></thead><tbody className="divide-y divide-neutral-100">{workspace.balances.map((balance) => {
            const policy = activeMinimumByKey.get(`${balance.stockLocationId}:${balance.stockItemId}`);
            const belowMinimum = isBelowStockMinimum(balance.quantity, policy);
            return <tr key={`${balance.stockLocationId}:${balance.stockItemId}`}><td className="px-4 py-3 font-medium">{itemNames.get(balance.stockItemId) ?? "Item desconhecido"}</td><td className="px-4 py-3 text-neutral-600">{locationNames.get(balance.stockLocationId) ?? "Local indisponível"}</td><td className="px-4 py-3 font-semibold">{balance.quantity.toDecimal()} {itemUnits.get(balance.stockItemId) ?? ""}</td><td className="px-4 py-3">{policy ? `${policy.minimumQuantity.toDecimal()} ${itemUnits.get(balance.stockItemId) ?? ""}` : <span className="text-neutral-400">Não configurado</span>}</td><td className="px-4 py-3">{belowMinimum ? <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">Abaixo do mínimo</span> : policy ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">Dentro do mínimo</span> : <span className="text-neutral-400">—</span>}</td><td className="px-4 py-3">R$ {balance.averageCost.toDecimal().replace(".", ",")}</td></tr>;
          })}{workspace.balances.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-500">Ainda não há saldos nesta organização.</td></tr>}</tbody></table></div>
        </div>
      </section>

      {workspace.permissions.manageStockMinimum ? (
        <section>
          <form onSubmit={submitMinimum} className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_1fr_0.7fr_auto] lg:items-end">
            <div className="lg:col-span-4"><h2 className="text-lg font-semibold">Estoque mínimo por local</h2><p className="mt-1 text-xs text-neutral-500">Ausência de configuração não gera alerta. Igualdade ao mínimo também não gera alerta; somente saldo estritamente menor.</p></div>
            <label className="block text-sm font-medium">Produto<select required value={minimum.stockItemId} onChange={(event) => selectMinimumItem(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Selecione</option>{workspace.stockItems.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="block text-sm font-medium">Local<select required value={minimum.stockLocationId} onChange={(event) => selectMinimumLocation(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Selecione</option>{workspace.stockLocations.map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}</select></label>
            <label className="block text-sm font-medium">Quantidade mínima<input required inputMode="decimal" value={minimum.quantity} onChange={(event) => setMinimum({ ...minimum, quantity: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
            <div className="flex gap-2"><button disabled={savingOperation !== null || !minimum.stockItemId || !minimum.stockLocationId || minimum.quantity === ""} type="submit" className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{savingOperation === "minimum" ? "Salvando..." : selectedMinimumPolicy ? "Atualizar mínimo" : "Definir mínimo"}</button>{selectedMinimumPolicy && <button disabled={savingOperation !== null} type="button" onClick={() => void deactivateMinimum()} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 disabled:opacity-50">Desativar</button>}</div>
          </form>
        </section>
      ) : <aside className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm leading-6 text-neutral-600 shadow-sm"><h2 className="font-semibold text-neutral-900">Estoque mínimo somente leitura</h2><p className="mt-1">Seu perfil pode consultar os mínimos visíveis, mas o banco exige papel e escopo de estoque autorizado para alterar a configuração.</p></aside>}

      <section className="grid gap-6 xl:grid-cols-2">
        {workspace.permissions.recordStockEntry ? (
          <form onSubmit={submitEntry} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div><h2 className="text-lg font-semibold">Registrar entrada</h2><p className="mt-1 text-xs text-neutral-500">Recalcula custo médio sob lock e usa command ID para idempotência.</p></div>
            <label className="block text-sm font-medium">Produto<select required value={entry.stockItemId} onChange={(event) => setEntry({ ...entry, stockItemId: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Selecione</option>{workspace.stockItems.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="block text-sm font-medium">Destino<select required value={entry.stockLocationId} onChange={(event) => setEntry({ ...entry, stockLocationId: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Selecione</option>{workspace.stockLocations.map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}</select></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Quantidade<input required inputMode="decimal" value={entry.quantity} onChange={(event) => setEntry({ ...entry, quantity: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label><label className="block text-sm font-medium">Custo unitário (R$)<input required inputMode="decimal" value={entry.unitCost} onChange={(event) => setEntry({ ...entry, unitCost: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label></div>
            <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium">Lote (opcional)<input value={entry.batchCode} onChange={(event) => setEntry({ ...entry, batchCode: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label><label className="block text-sm font-medium">Validade (opcional)<input type="date" value={entry.expirationDate} onChange={(event) => setEntry({ ...entry, expirationDate: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label></div>
            <label className="block text-sm font-medium">Observação (opcional)<textarea value={entry.notes} onChange={(event) => setEntry({ ...entry, notes: event.target.value })} rows={3} className="mt-1 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
            <button disabled={savingOperation !== null || workspace.stockItems.length === 0 || workspace.stockLocations.length === 0} type="submit" className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{savingOperation === "entry" ? "Registrando..." : "Registrar entrada"}</button>
          </form>
        ) : <aside className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm leading-6 text-neutral-600 shadow-sm"><h2 className="font-semibold text-neutral-900">Entrada não autorizada</h2><p className="mt-1">Seu perfil pode consultar o estoque, mas não possui papel permitido pelo RPC de entrada.</p></aside>}

        {workspace.permissions.recordStockWithdrawal ? (
          <form onSubmit={submitWithdrawal} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div><h2 className="text-lg font-semibold">Registrar retirada</h2><p className="mt-1 text-xs text-neutral-500">A retirada exige Setor de consumo explícito. Sem lote escolhido, itens rastreados consomem automaticamente por FEFO.</p></div>
            <label className="block text-sm font-medium">Produto<select required value={withdrawal.stockItemId} onChange={(event) => setWithdrawal({ ...withdrawal, stockItemId: event.target.value, preferredBatchId: "" })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Selecione</option>{workspace.stockItems.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="block text-sm font-medium">Origem<select required value={withdrawal.stockLocationId} onChange={(event) => setWithdrawal({ ...withdrawal, stockLocationId: event.target.value, preferredBatchId: "" })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Selecione</option>{workspace.stockLocations.map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}</select></label>
            <label className="block text-sm font-medium">Setor de consumo<select required value={withdrawal.sectorId} onChange={(event) => setWithdrawal({ ...withdrawal, sectorId: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Selecione um Setor</option>{workspace.sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.unitName} — {sector.name}</option>)}</select><span className="mt-1 block text-xs font-normal text-neutral-500">Somente Setores autorizados para o seu vínculo são listados.</span></label>
            <label className="block text-sm font-medium">Quantidade<input required inputMode="decimal" value={withdrawal.quantity} onChange={(event) => setWithdrawal({ ...withdrawal, quantity: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
            {(selectedWithdrawalItem?.trackBatch || selectedWithdrawalItem?.trackExpiration) && (
              <label className="block text-sm font-medium">Lote preferido (opcional)<select value={withdrawal.preferredBatchId} onChange={(event) => setWithdrawal({ ...withdrawal, preferredBatchId: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Automático — FEFO</option>{withdrawalBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchCode || "Lote sem código"} · {batch.expirationDate ? `validade ${batch.expirationDate}` : "validade desconhecida"} · saldo {batch.remainingQuantity.toDecimal()}</option>)}</select><span className="mt-1 block text-xs font-normal text-neutral-500">A ordem exibida já segue validade mais próxima e recebimento mais antigo.</span></label>
            )}
            <label className="block text-sm font-medium">Observação (opcional)<textarea value={withdrawal.notes} onChange={(event) => setWithdrawal({ ...withdrawal, notes: event.target.value })} rows={3} className="mt-1 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
            <button disabled={savingOperation !== null || workspace.stockItems.length === 0 || workspace.stockLocations.length === 0 || workspace.sectors.length === 0 || !withdrawal.sectorId} type="submit" className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{savingOperation === "withdrawal" ? "Registrando..." : "Registrar retirada"}</button>
          </form>
        ) : <aside className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm leading-6 text-neutral-600 shadow-sm"><h2 className="font-semibold text-neutral-900">Retirada não autorizada</h2><p className="mt-1">Seu perfil pode consultar o estoque, mas não possui papel permitido pelo RPC de retirada.</p></aside>}
      </section>
    </div>
  );
}
