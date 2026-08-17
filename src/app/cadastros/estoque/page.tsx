"use client";

import { FormEvent, useMemo, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { StockMovementType } from "@/modules/inventory/domain/inventory";
import { useDemoWorkspace } from "@/modules/master-data/ui/demo-workspace-provider";

const movementLabels: Record<StockMovementType, string> = {
  opening_balance: "Saldo inicial",
  entry: "Entrada",
  withdrawal: "Retirada",
  transfer_out: "Transferência — saída",
  transfer_in: "Transferência — recebimento",
};

export default function EstoquePage() {
  const workspace = useDemoWorkspace();
  const [message, setMessage] = useState<string | null>(null);
  const [entry, setEntry] = useState({ stockItemId: "", stockLocationId: "", quantity: "", unitCost: "", notes: "" });
  const [withdrawal, setWithdrawal] = useState({ stockItemId: "", stockLocationId: "", quantity: "", notes: "" });
  const [transfer, setTransfer] = useState({ stockItemId: "", sourceLocationId: "", destinationLocationId: "", quantity: "", notes: "" });

  const itemNames = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item.name])), [workspace.stockItems]);
  const itemUnits = useMemo(() => new Map(workspace.stockItems.map((item) => [item.id, item.baseUnitCode])), [workspace.stockItems]);
  const locationNames = useMemo(() => new Map(workspace.stockLocations.map((location) => [location.id, `${location.unitName} — ${location.name}`])), [workspace.stockLocations]);

  async function run(operation: () => Promise<void>, success: string) {
    setMessage(null);
    try {
      await operation();
      setMessage(success);
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    }
  }

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(
      () => workspace.recordEntry({ ...entry, stockItemId: entry.stockItemId as EntityId, stockLocationId: entry.stockLocationId as EntityId }),
      "Entrada registrada e saldo recalculado.",
    );
    setEntry({ stockItemId: "", stockLocationId: "", quantity: "", unitCost: "", notes: "" });
  }

  async function submitWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(
      () => workspace.withdraw({ ...withdrawal, stockItemId: withdrawal.stockItemId as EntityId, stockLocationId: withdrawal.stockLocationId as EntityId }),
      "Retirada registrada.",
    );
    setWithdrawal({ stockItemId: "", stockLocationId: "", quantity: "", notes: "" });
  }

  async function submitTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(
      () => workspace.dispatchTransfer({
        ...transfer,
        stockItemId: transfer.stockItemId as EntityId,
        sourceLocationId: transfer.sourceLocationId as EntityId,
        destinationLocationId: transfer.destinationLocationId as EntityId,
      }),
      "Transferência despachada. O destino ainda precisa confirmar o recebimento.",
    );
    setTransfer({ stockItemId: "", sourceLocationId: "", destinationLocationId: "", quantity: "", notes: "" });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-sm font-medium text-neutral-500">Ledger operacional</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Estoque</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">Saldo não é editado diretamente. Entradas, retiradas e transferências geram movimentos rastreáveis; transferência só entra no destino quando recebida.</p>
      </header>

      {message && <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">{message}</p>}

      <section>
        <div className="mb-3 flex items-end justify-between"><div><h2 className="text-xl font-semibold">Saldos atuais</h2><p className="text-sm text-neutral-500">Custo médio por produto e local.</p></div><span className="text-xs text-neutral-500">{workspace.balances.length} combinações</span></div>
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Produto</th><th className="px-4 py-3 font-medium">Local</th><th className="px-4 py-3 font-medium">Saldo</th><th className="px-4 py-3 font-medium">Custo médio</th></tr></thead><tbody className="divide-y divide-neutral-100">{workspace.balances.map((balance) => <tr key={`${balance.stockLocationId}:${balance.stockItemId}`}><td className="px-4 py-3 font-medium">{itemNames.get(balance.stockItemId) ?? "Item desconhecido"}</td><td className="px-4 py-3 text-neutral-600">{locationNames.get(balance.stockLocationId) ?? balance.stockLocationId}</td><td className="px-4 py-3 font-semibold">{balance.quantity.toDecimal()} {itemUnits.get(balance.stockItemId)}</td><td className="px-4 py-3">R$ {balance.averageCost.toDecimal().replace(".", ",")}</td></tr>)}</tbody></table></div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <form onSubmit={submitEntry} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div><h2 className="font-semibold">Entrada</h2><p className="mt-1 text-xs text-neutral-500">Recalcula custo médio ponderado.</p></div>
          <SelectItem value={entry.stockItemId} onChange={(value) => setEntry({ ...entry, stockItemId: value })} items={workspace.stockItems} />
          <SelectLocation label="Destino" value={entry.stockLocationId} onChange={(value) => setEntry({ ...entry, stockLocationId: value })} locations={workspace.stockLocations} />
          <div className="grid grid-cols-2 gap-2"><Input label="Quantidade" value={entry.quantity} onChange={(value) => setEntry({ ...entry, quantity: value })} /><Input label="Custo unitário" value={entry.unitCost} onChange={(value) => setEntry({ ...entry, unitCost: value })} /></div>
          <Input label="Observação" value={entry.notes} onChange={(value) => setEntry({ ...entry, notes: value })} required={false} />
          <button className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Registrar entrada</button>
        </form>

        <form onSubmit={submitWithdrawal} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div><h2 className="font-semibold">Retirada</h2><p className="mt-1 text-xs text-neutral-500">Bloqueia quantidade acima do saldo disponível.</p></div>
          <SelectItem value={withdrawal.stockItemId} onChange={(value) => setWithdrawal({ ...withdrawal, stockItemId: value })} items={workspace.stockItems} />
          <SelectLocation label="Origem" value={withdrawal.stockLocationId} onChange={(value) => setWithdrawal({ ...withdrawal, stockLocationId: value })} locations={workspace.stockLocations} />
          <Input label="Quantidade" value={withdrawal.quantity} onChange={(value) => setWithdrawal({ ...withdrawal, quantity: value })} />
          <Input label="Motivo/observação" value={withdrawal.notes} onChange={(value) => setWithdrawal({ ...withdrawal, notes: value })} required={false} />
          <button className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700">Registrar retirada</button>
        </form>

        <form onSubmit={submitTransfer} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div><h2 className="font-semibold">Transferência</h2><p className="mt-1 text-xs text-neutral-500">Despacho e recebimento são etapas separadas.</p></div>
          <SelectItem value={transfer.stockItemId} onChange={(value) => setTransfer({ ...transfer, stockItemId: value })} items={workspace.stockItems} />
          <SelectLocation label="Origem" value={transfer.sourceLocationId} onChange={(value) => setTransfer({ ...transfer, sourceLocationId: value })} locations={workspace.stockLocations} />
          <SelectLocation label="Destino" value={transfer.destinationLocationId} onChange={(value) => setTransfer({ ...transfer, destinationLocationId: value })} locations={workspace.stockLocations} />
          <Input label="Quantidade" value={transfer.quantity} onChange={(value) => setTransfer({ ...transfer, quantity: value })} />
          <Input label="Observação" value={transfer.notes} onChange={(value) => setTransfer({ ...transfer, notes: value })} required={false} />
          <button className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600">Despachar transferência</button>
        </form>
      </section>

      <section className="space-y-3">
        <div><h2 className="text-xl font-semibold">Transferências</h2><p className="text-sm text-neutral-500">Itens despachados permanecem em trânsito até o recebimento.</p></div>
        <div className="grid gap-3 lg:grid-cols-2">{workspace.transfers.length ? workspace.transfers.map((current) => {
          const line = current.lines[0]!;
          const pending = line.dispatchedQuantity.subtract(line.receivedQuantity);
          return <article key={current.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{itemNames.get(line.stockItemId)}</p><p className="mt-1 text-sm text-neutral-600">{locationNames.get(current.sourceLocationId)} → {locationNames.get(current.destinationLocationId)}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${current.status === "received" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{current.status === "received" ? "Recebida" : current.status === "partially_received" ? "Parcial" : "Em trânsito"}</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-sm"><div><p className="text-neutral-500">Enviado</p><p className="font-semibold">{line.dispatchedQuantity.toDecimal()}</p></div><div><p className="text-neutral-500">Recebido</p><p className="font-semibold">{line.receivedQuantity.toDecimal()}</p></div><div><p className="text-neutral-500">Pendente</p><p className="font-semibold">{pending.toDecimal()}</p></div></div>{current.status !== "received" && <button type="button" onClick={() => run(() => workspace.receiveTransfer(current.id), "Transferência recebida no destino." )} className="mt-4 w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100">Receber pendente</button>}</article>;
        }) : <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">Nenhuma transferência despachada nesta sessão.</p>}</div>
      </section>

      <section>
        <div className="mb-3"><h2 className="text-xl font-semibold">Histórico de movimentos</h2><p className="text-sm text-neutral-500">Ledger append-only da demonstração.</p></div>
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium">Tipo</th><th className="px-4 py-3 font-medium">Produto</th><th className="px-4 py-3 font-medium">Qtd.</th><th className="px-4 py-3 font-medium">Origem</th><th className="px-4 py-3 font-medium">Destino</th><th className="px-4 py-3 font-medium">Custo snapshot</th></tr></thead><tbody className="divide-y divide-neutral-100">{workspace.movements.map((movement) => { const line = movement.lines[0]!; return <tr key={movement.id}><td className="px-4 py-3 text-neutral-600">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(movement.occurredAt))}</td><td className="px-4 py-3 font-medium">{movementLabels[movement.type]}</td><td className="px-4 py-3">{itemNames.get(line.stockItemId)}</td><td className="px-4 py-3">{line.quantity.toDecimal()}</td><td className="px-4 py-3 text-neutral-600">{movement.sourceLocationId ? locationNames.get(movement.sourceLocationId) : "—"}</td><td className="px-4 py-3 text-neutral-600">{movement.destinationLocationId ? locationNames.get(movement.destinationLocationId) : "—"}</td><td className="px-4 py-3">R$ {line.unitCostSnapshot.toDecimal().replace(".", ",")}</td></tr>; })}</tbody></table></div></div>
      </section>
    </div>
  );
}

function SelectItem({ value, onChange, items }: { value: string; onChange(value: string): void; items: ReturnType<typeof useDemoWorkspace>["stockItems"] }) {
  return <label className="block text-sm font-medium">Produto<select required value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Selecione</option>{items.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>;
}

function SelectLocation({ label, value, onChange, locations }: { label: string; value: string; onChange(value: string): void; locations: ReturnType<typeof useDemoWorkspace>["stockLocations"] }) {
  return <label className="block text-sm font-medium">{label}<select required value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Selecione</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>)}</select></label>;
}

function Input({ label, value, onChange, required = true }: { label: string; value: string; onChange(value: string): void; required?: boolean }) {
  return <label className="block text-sm font-medium">{label}<input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>;
}
