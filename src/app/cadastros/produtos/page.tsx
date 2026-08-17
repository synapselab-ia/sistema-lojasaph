"use client";

import { FormEvent, useMemo, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { StockItem, StockItemType } from "@/modules/catalog/domain/stock-item";
import { useDemoWorkspace } from "@/modules/master-data/ui/demo-workspace-provider";

const itemTypeLabels: Record<StockItemType, string> = {
  consumable: "Consumível",
  merchandise: "Mercadoria",
  reusable: "Retornável",
  supply: "Insumo",
};

interface FormState {
  name: string;
  categoryId: string;
  baseUnitCode: string;
  type: StockItemType;
  trackExpiration: boolean;
  trackBatch: boolean;
  isReturnable: boolean;
  active: boolean;
}

const emptyForm: FormState = {
  name: "",
  categoryId: "",
  baseUnitCode: "un",
  type: "merchandise",
  trackExpiration: false,
  trackBatch: false,
  isReturnable: false,
  active: true,
};

export default function ProdutosPage() {
  const workspace = useDemoWorkspace();
  const [editingId, setEditingId] = useState<EntityId | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const categoryNames = useMemo(() => new Map(workspace.categories.map((category) => [category.id, category.name])), [workspace.categories]);

  function startEdit(item: StockItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      categoryId: item.categoryId ?? "",
      baseUnitCode: item.baseUnitCode,
      type: item.type,
      trackExpiration: item.trackExpiration,
      trackBatch: item.trackBatch,
      isReturnable: item.isReturnable,
      active: item.active,
    });
    setMessage(null);
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      const payload = {
        categoryId: form.categoryId ? (form.categoryId as EntityId) : undefined,
        name: form.name,
        baseUnitCode: form.baseUnitCode,
        type: form.type,
        trackExpiration: form.trackExpiration,
        trackBatch: form.trackBatch,
        isReturnable: form.isReturnable,
        active: form.active,
      };
      if (editingId) {
        await workspace.updateStockItem(editingId, payload);
        setMessage("Produto atualizado.");
      } else {
        await workspace.createStockItem(payload);
        setMessage("Produto criado.");
      }
      reset();
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header>
        <p className="text-sm font-medium text-neutral-500">Catálogo</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Produtos e itens</h1>
        <p className="mt-3 text-sm text-neutral-600">Cadastro canônico que será reutilizado por estoque, fornecedores e compras.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Unidade</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Validade</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {workspace.stockItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-neutral-600">{item.categoryId ? categoryNames.get(item.categoryId) : "—"}</td>
                    <td className="px-4 py-3 text-neutral-600">{item.baseUnitCode}</td>
                    <td className="px-4 py-3 text-neutral-600">{itemTypeLabels[item.type]}</td>
                    <td className="px-4 py-3 text-neutral-600">{item.trackExpiration ? "Controlada" : "Não"}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${item.active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{item.active ? "Ativo" : "Inativo"}</span></td>
                    <td className="px-4 py-3 text-right"><button type="button" onClick={() => startEdit(item)} className="rounded-lg border border-neutral-200 px-3 py-1.5 font-medium hover:bg-neutral-50">Editar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <form onSubmit={submit} className="h-fit space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">{editingId ? "Editar produto" : "Novo produto"}</h2>
            <p className="mt-1 text-xs text-neutral-500">Campos mínimos do cadastro operacional.</p>
          </div>

          <label className="block text-sm font-medium">Nome<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal outline-none focus:border-neutral-800" /></label>
          <label className="block text-sm font-medium">Categoria<select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Sem categoria</option>{workspace.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">Unidade<select value={form.baseUnitCode} onChange={(e) => setForm({ ...form, baseUnitCode: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal">{workspace.unitsOfMeasure.map((unit) => <option key={unit.code} value={unit.code}>{unit.code} — {unit.name}</option>)}</select></label>
            <label className="block text-sm font-medium">Tipo<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as StockItemType })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal">{Object.entries(itemTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>

          <div className="space-y-2 rounded-xl bg-neutral-50 p-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.trackExpiration} onChange={(e) => setForm({ ...form, trackExpiration: e.target.checked, trackBatch: e.target.checked || form.trackBatch })} />Controlar validade</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.trackBatch} onChange={(e) => setForm({ ...form, trackBatch: e.target.checked })} />Controlar lote</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isReturnable} onChange={(e) => setForm({ ...form, isReturnable: e.target.checked })} />Item retornável</label>
            {editingId && <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />Ativo</label>}
          </div>

          {message && <p className="rounded-lg bg-neutral-100 px-3 py-2 text-sm">{message}</p>}
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700">{editingId ? "Salvar" : "Criar produto"}</button>
            {editingId && <button type="button" onClick={reset} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium">Cancelar</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
