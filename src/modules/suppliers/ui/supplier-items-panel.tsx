"use client";

import { useEffect, useMemo, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { type SupplierItemDraft, type SupplierItemLink } from "@/lib/suppliers/supplier-items";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";
import { SupabaseSupplierItemsGateway } from "@/modules/suppliers/adapters/supabase-supplier-items-gateway";

interface RowDraft {
  purchaseUnit: string;
  unitsPerPackage: string;
  active: boolean;
}

const emptyNewDraft = { stockItemId: "", purchaseUnit: "", unitsPerPackage: "" };

export function SupplierItemsPanel({ supplierId }: { supplierId: EntityId }) {
  const workspace = useRuntimeWorkspace();
  const gateway = useMemo(() => new SupabaseSupplierItemsGateway(createBrowserSupabaseClient()), []);
  const [links, setLinks] = useState<readonly SupplierItemLink[]>([]);
  const [rowDrafts, setRowDrafts] = useState<Record<string, RowDraft>>({});
  const [newDraft, setNewDraft] = useState(emptyNewDraft);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const stockItemById = useMemo(
    () => new Map(workspace.stockItems.map((item) => [item.id, item])),
    [workspace.stockItems],
  );

  const availableStockItems = useMemo(() => {
    const linkedIds = new Set(links.map((link) => link.stockItemId));
    return workspace.stockItems.filter((item) => item.active && !linkedIds.has(item.id));
  }, [links, workspace.stockItems]);

  function applyLinks(nextLinks: readonly SupplierItemLink[]) {
    setLinks(nextLinks);
    setRowDrafts(Object.fromEntries(nextLinks.map((link) => [link.id, {
      purchaseUnit: link.purchaseUnit ?? "",
      unitsPerPackage: link.unitsPerPackage?.toDecimal() ?? "",
      active: link.active,
    }])));
  }

  async function refresh() {
    applyLinks(await gateway.list(workspace.organizationId, supplierId));
  }

  useEffect(() => {
    let active = true;
    void gateway.list(workspace.organizationId, supplierId)
      .then((nextLinks) => {
        if (!active) return;
        applyLinks(nextLinks);
      })
      .catch((error) => {
        if (active) setMessage(workspace.errorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [gateway, supplierId, workspace]);

  async function addLink() {
    setSavingKey("new");
    setMessage(null);
    try {
      await gateway.createOrReactivate(workspace.organizationId, supplierId, {
        stockItemId: newDraft.stockItemId as EntityId,
        purchaseUnit: newDraft.purchaseUnit,
        unitsPerPackage: newDraft.unitsPerPackage,
      });
      setNewDraft(emptyNewDraft);
      await refresh();
      setMessage("Produto vinculado ao fornecedor.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingKey(null);
    }
  }

  async function saveLink(link: SupplierItemLink) {
    const draft = rowDrafts[link.id];
    if (!draft) return;
    setSavingKey(link.id);
    setMessage(null);
    try {
      const payload: SupplierItemDraft = {
        stockItemId: link.stockItemId,
        purchaseUnit: draft.purchaseUnit,
        unitsPerPackage: draft.unitsPerPackage,
        active: draft.active,
      };
      await gateway.update(workspace.organizationId, supplierId, link.id, payload);
      await refresh();
      setMessage("Produto do fornecedor atualizado.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return <div className="mt-4 border-t border-neutral-100 pt-4 text-xs text-neutral-500">Carregando produtos do fornecedor...</div>;
  }

  return (
    <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
      <div>
        <h3 className="text-sm font-semibold">Produtos do fornecedor</h3>
        <p className="mt-1 text-xs text-neutral-500">A unidade e a quantidade por embalagem são informações comerciais. Pedidos continuam usando quantidade na unidade-base do estoque nesta fase.</p>
      </div>

      {links.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum produto vinculado a este fornecedor.</p>
      ) : (
        <div className="space-y-2">
          {links.map((link) => {
            const item = stockItemById.get(link.stockItemId);
            const draft = rowDrafts[link.id] ?? { purchaseUnit: "", unitsPerPackage: "", active: link.active };
            return (
              <div key={link.id} className="grid gap-2 rounded-xl bg-neutral-50 p-3 text-sm md:grid-cols-[minmax(180px,1fr)_130px_150px_auto] md:items-end">
                <div>
                  <p className="text-xs text-neutral-500">Produto</p>
                  <p className="font-medium">{item?.name ?? "Produto indisponível"}</p>
                </div>
                {workspace.permissions.manageSuppliers ? (
                  <>
                    <label className="text-xs font-medium text-neutral-600">Unidade de compra
                      <input value={draft.purchaseUnit} onChange={(event) => setRowDrafts((current) => ({ ...current, [link.id]: { ...draft, purchaseUnit: event.target.value } }))} placeholder="Ex.: cx" className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-normal text-neutral-900" />
                    </label>
                    <label className="text-xs font-medium text-neutral-600">Qtd. por embalagem
                      <input inputMode="decimal" value={draft.unitsPerPackage} onChange={(event) => setRowDrafts((current) => ({ ...current, [link.id]: { ...draft, unitsPerPackage: event.target.value } }))} placeholder="Ex.: 12" className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-normal text-neutral-900" />
                    </label>
                    <div className="flex items-center gap-2 md:justify-end">
                      <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={draft.active} onChange={(event) => setRowDrafts((current) => ({ ...current, [link.id]: { ...draft, active: event.target.checked } }))} />Ativo</label>
                      <button type="button" disabled={savingKey !== null} onClick={() => void saveLink(link)} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">{savingKey === link.id ? "Salvando..." : "Salvar"}</button>
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-3 md:text-right">
                    <p className="text-xs text-neutral-500">{link.purchaseUnit || "Unidade não informada"}{link.unitsPerPackage ? ` · ${link.unitsPerPackage.toDecimal()} por embalagem` : ""} · {link.active ? "Ativo" : "Inativo"}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {workspace.permissions.manageSuppliers && (
        <div className="grid gap-2 rounded-xl border border-dashed border-neutral-300 p-3 md:grid-cols-[minmax(180px,1fr)_130px_150px_auto] md:items-end">
          <label className="text-xs font-medium text-neutral-600">Novo produto
            <select value={newDraft.stockItemId} onChange={(event) => setNewDraft({ ...newDraft, stockItemId: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-normal text-neutral-900">
              <option value="">Selecione</option>
              {availableStockItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-neutral-600">Unidade de compra
            <input value={newDraft.purchaseUnit} onChange={(event) => setNewDraft({ ...newDraft, purchaseUnit: event.target.value })} placeholder="Ex.: cx" className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-900" />
          </label>
          <label className="text-xs font-medium text-neutral-600">Qtd. por embalagem
            <input inputMode="decimal" value={newDraft.unitsPerPackage} onChange={(event) => setNewDraft({ ...newDraft, unitsPerPackage: event.target.value })} placeholder="Ex.: 12" className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-900" />
          </label>
          <button type="button" disabled={savingKey !== null || !newDraft.stockItemId} onClick={() => void addLink()} className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{savingKey === "new" ? "Vinculando..." : "Vincular"}</button>
        </div>
      )}

      {message && <p aria-live="polite" className="text-xs text-neutral-600">{message}</p>}
    </div>
  );
}
