"use client";

import { useEffect, useMemo, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { type SupplierCommercialTermsDraft } from "@/lib/suppliers/commercial-terms";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";
import { SupabaseSupplierCommercialTermsGateway } from "@/modules/suppliers/adapters/supabase-supplier-commercial-terms-gateway";

const emptyDraft: SupplierCommercialTermsDraft = Object.freeze({
  notes: "",
  minimumOrderValue: "",
  paymentTerms: "",
  orderSchedule: "",
  deliverySchedule: "",
});

function moneyLabel(value?: Money): string {
  if (!value) return "Não informado";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value.toDecimal()));
}

export function SupplierCommercialTermsPanel({ supplierId }: { supplierId: EntityId }) {
  const workspace = useRuntimeWorkspace();
  const gateway = useMemo(() => new SupabaseSupplierCommercialTermsGateway(createBrowserSupabaseClient()), []);
  const [draft, setDraft] = useState<SupplierCommercialTermsDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void gateway
      .load(workspace.organizationId, supplierId)
      .then((terms) => {
        if (!active) return;
        setDraft({
          notes: terms.notes ?? "",
          minimumOrderValue: terms.minimumOrderValue?.toDecimal() ?? "",
          paymentTerms: terms.paymentTerms ?? "",
          orderSchedule: terms.orderSchedule ?? "",
          deliverySchedule: terms.deliverySchedule ?? "",
        });
      })
      .catch((error) => {
        if (active) setMessage(workspace.errorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [gateway, supplierId, workspace]);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const terms = await gateway.save(workspace.organizationId, supplierId, draft);
      setDraft({
        notes: terms.notes ?? "",
        minimumOrderValue: terms.minimumOrderValue?.toDecimal() ?? "",
        paymentTerms: terms.paymentTerms ?? "",
        orderSchedule: terms.orderSchedule ?? "",
        deliverySchedule: terms.deliverySchedule ?? "",
      });
      setMessage("Condições comerciais salvas.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="mt-4 border-t border-neutral-100 pt-4 text-xs text-neutral-500">Carregando condições comerciais...</div>;
  }

  if (!workspace.permissions.manageSuppliers) {
    return (
      <div className="mt-4 border-t border-neutral-100 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Condições comerciais</h3>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div><p className="text-xs text-neutral-500">Pedido mínimo</p><p className="font-medium">{draft.minimumOrderValue ? moneyLabel(Money.fromDecimal(draft.minimumOrderValue)) : "Não informado"}</p></div>
          <div><p className="text-xs text-neutral-500">Pedido</p><p className="font-medium">{draft.orderSchedule || "Não informado"}</p></div>
          <div><p className="text-xs text-neutral-500">Entrega</p><p className="font-medium">{draft.deliverySchedule || "Não informado"}</p></div>
          <div><p className="text-xs text-neutral-500">Pagamento</p><p className="font-medium">{draft.paymentTerms || "Não informado"}</p></div>
        </div>
        {draft.notes && <p className="mt-3 text-sm text-neutral-600"><span className="font-medium text-neutral-800">Observações:</span> {draft.notes}</p>}
        {message && <p className="mt-2 text-xs text-red-700">{message}</p>}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
      <div>
        <h3 className="text-sm font-semibold">Condições comerciais</h3>
        <p className="mt-1 text-xs text-neutral-500">Campos livres preservam a agenda e a condição informadas pelo fornecedor sem criar automação implícita de compras.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-medium text-neutral-600">Pedido mínimo
          <input inputMode="decimal" placeholder="0,00" value={draft.minimumOrderValue ?? ""} onChange={(event) => setDraft({ ...draft, minimumOrderValue: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-900" />
        </label>
        <label className="text-xs font-medium text-neutral-600">Agenda de pedido
          <input placeholder="Ex.: terça-feira" value={draft.orderSchedule ?? ""} onChange={(event) => setDraft({ ...draft, orderSchedule: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-900" />
        </label>
        <label className="text-xs font-medium text-neutral-600">Agenda de entrega
          <input placeholder="Ex.: quinta-feira" value={draft.deliverySchedule ?? ""} onChange={(event) => setDraft({ ...draft, deliverySchedule: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-900" />
        </label>
        <label className="text-xs font-medium text-neutral-600">Condição de pagamento
          <input placeholder="Ex.: 28 dias" value={draft.paymentTerms ?? ""} onChange={(event) => setDraft({ ...draft, paymentTerms: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-900" />
        </label>
      </div>
      <label className="block text-xs font-medium text-neutral-600">Observações
        <textarea rows={2} value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-900" />
      </label>
      <div className="flex items-center justify-between gap-3">
        <p aria-live="polite" className="text-xs text-neutral-500">{message}</p>
        <button type="button" disabled={saving} onClick={() => void save()} className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold disabled:opacity-50">{saving ? "Salvando..." : "Salvar condições"}</button>
      </div>
    </div>
  );
}
