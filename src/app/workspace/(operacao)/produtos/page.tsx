"use client";

import { FormEvent, useMemo, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { StockItem, StockItemType } from "@/modules/catalog/domain/stock-item";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

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
  ean: string;
  ncm: string;
  cest: string;
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
  ean: "",
  ncm: "",
  cest: "",
  trackExpiration: false,
  trackBatch: false,
  isReturnable: false,
  active: true,
};

function fiscalSummary(item: StockItem): string {
  const values = [item.ncm ? `NCM ${item.ncm}` : null, item.cest ? `CEST ${item.cest}` : null].filter(Boolean);
  return values.length > 0 ? values.join(" · ") : "Sem dados fiscais";
}

export default function RuntimeProductsPage() {
  const workspace = useRuntimeWorkspace();
  const [editingId, setEditingId] = useState<EntityId | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const categoryNames = useMemo(() => new Map(workspace.categories.map((category) => [category.id, category.name])), [workspace.categories]);

  function startEdit(item: StockItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      categoryId: item.categoryId,
      baseUnitCode: item.baseUnitCode,
      type: item.type,
      ean: item.ean ?? "",
      ncm: item.ncm ?? "",
      cest: item.cest ?? "",
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

    if (!form.categoryId) {
      setMessage("Selecione uma categoria para o produto.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        categoryId: form.categoryId as EntityId,
        name: form.name,
        baseUnitCode: form.baseUnitCode,
        type: form.type,
        ean: form.ean,
        ncm: form.ncm,
        cest: form.cest,
        trackExpiration: form.trackExpiration,
        trackBatch: form.trackBatch,
        isReturnable: form.isReturnable,
        active: form.active,
      };
      if (editingId) {
        await workspace.updateStockItem(editingId, payload);
        setMessage("Produto atualizado no banco.");
      } else {
        await workspace.createStockItem(payload);
        setMessage("Produto criado no banco.");
      }
      reset();
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header>
        <p className="text-sm font-medium text-emerald-700">Catálogo persistente</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Produtos e itens</h1>
        <p className="mt-3 text-sm text-neutral-600">Leitura e manutenção passam pelos adapters Supabase e pelas policies de catálogo da organização atual.</p>
      </header>
      {message && <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">{message}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Identificação</th>
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
                    <td className="px-4 py-3 text-neutral-600">
                      <span className="block text-neutral-800">{item.ean ? `EAN ${item.ean}` : "Sem EAN"}</span>
                      <span className="mt-1 block text-xs text-neutral-500">{fiscalSummary(item)}</span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{categoryNames.get(item.categoryId) ?? "Categoria indisponível"}</td>
                    <td className="px-4 py-3 text-neutral-600">{item.baseUnitCode}</td>
                    <td className="px-4 py-3 text-neutral-600">{itemTypeLabels[item.type]}</td>
                    <td className="px-4 py-3 text-neutral-600">{item.trackExpiration ? "Controlada" : "Não"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${item.active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{item.active ? "Ativo" : "Inativo"}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {workspace.permissions.manageCatalog && <button type="button" onClick={() => startEdit(item)} className="rounded-lg border border-neutral-200 px-3 py-1.5 font-medium hover:bg-neutral-50">Editar</button>}
                    </td>
                  </tr>
                ))}
                {workspace.stockItems.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-neutral-500">Nenhum produto cadastrado nesta organização.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {workspace.permissions.manageCatalog ? (
          <form onSubmit={submit} className="h-fit space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div><h2 className="text-lg font-semibold">{editingId ? "Editar produto" : "Novo produto"}</h2><p className="mt-1 text-xs text-neutral-500">A autorização final é conferida novamente pelo RLS.</p></div>
            <label className="block text-sm font-medium">Nome<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
            <label className="block text-sm font-medium">Categoria<select required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="" disabled>Selecione uma categoria</option>{workspace.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">Unidade<select required value={form.baseUnitCode} onChange={(event) => setForm({ ...form, baseUnitCode: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="" disabled>Selecione</option>{workspace.unitsOfMeasure.map((unit) => <option key={unit.id} value={unit.code}>{unit.code} — {unit.name}</option>)}</select></label>
              <label className="block text-sm font-medium">Tipo<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as StockItemType })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal">{Object.entries(itemTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>

            <fieldset className="space-y-3 rounded-xl border border-neutral-200 p-3">
              <legend className="px-1 text-sm font-semibold">Identificação e dados fiscais</legend>
              <label className="block text-sm font-medium">EAN / código de barras<input value={form.ean} onChange={(event) => setForm({ ...form, ean: event.target.value })} placeholder="Opcional" className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium">NCM<input value={form.ncm} onChange={(event) => setForm({ ...form, ncm: event.target.value })} placeholder="Opcional" className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
                <label className="block text-sm font-medium">CEST<input value={form.cest} onChange={(event) => setForm({ ...form, cest: event.target.value })} placeholder="Opcional" className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
              </div>
              <p className="text-xs leading-5 text-neutral-500">Campos opcionais. O sistema preserva os valores informados, mas não valida enquadramento fiscal, máscara ou dígito verificador nesta fase.</p>
            </fieldset>

            <div className="space-y-2 rounded-xl bg-neutral-50 p-3 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.trackExpiration} onChange={(event) => setForm({ ...form, trackExpiration: event.target.checked, trackBatch: event.target.checked || form.trackBatch })} />Controlar validade</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.trackBatch} onChange={(event) => setForm({ ...form, trackBatch: event.target.checked })} />Controlar lote</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.isReturnable} onChange={(event) => setForm({ ...form, isReturnable: event.target.checked })} />Item retornável</label>
              {editingId && <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />Ativo</label>}
            </div>
            <div className="flex gap-2"><button disabled={saving || workspace.unitsOfMeasure.length === 0 || workspace.categories.length === 0 || !form.categoryId} type="submit" className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Salvando..." : editingId ? "Salvar" : "Criar produto"}</button>{editingId && <button type="button" onClick={reset} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium">Cancelar</button>}</div>
          </form>
        ) : <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-5 text-sm leading-6 text-neutral-600 shadow-sm"><h2 className="font-semibold text-neutral-900">Somente leitura</h2><p className="mt-1">Seu perfil pode consultar o catálogo, mas não possui papel autorizado para alterações.</p></aside>}
      </div>
    </div>
  );
}
