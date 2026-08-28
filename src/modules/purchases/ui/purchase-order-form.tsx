"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button, FeedbackMessage, FormField, Input, Panel, Select, Textarea } from "@/components/ui";
import { EntityId } from "@/domain/common/entity-id";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";
import { SupplierPurchaseItem, SupabasePurchaseGateway } from "../adapters/supabase-purchase-gateway";

interface DraftItemState {
  quantity: string;
  unitPrice: string;
}

export function PurchaseOrderForm({ onCreated }: { onCreated: (orderId: EntityId) => void }) {
  const workspace = useRuntimeWorkspace();
  const gateway = useMemo(() => new SupabasePurchaseGateway(createBrowserSupabaseClient()), []);
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [supplierItems, setSupplierItems] = useState<readonly SupplierPurchaseItem[]>([]);
  const [draftItems, setDraftItems] = useState<Record<string, DraftItemState>>({});
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supplierId) return;

    let active = true;
    void gateway.listSupplierItems(workspace.organizationId, supplierId as EntityId)
      .then((items) => {
        if (!active) return;
        setSupplierItems(items);
        setDraftItems(Object.fromEntries(items.map((item) => [item.supplierItemId, {
          quantity: "",
          unitPrice: item.latestUnitPrice?.toDecimal() ?? "",
        }])));
      })
      .catch((error) => {
        if (active) setMessage(workspace.errorMessage(error));
      })
      .finally(() => {
        if (active) setLoadingItems(false);
      });

    return () => { active = false; };
  }, [gateway, supplierId, workspace]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const items = supplierItems.flatMap((item) => {
      const draft = draftItems[item.supplierItemId];
      if (!draft?.quantity.trim()) return [];
      return [{
        supplierItemId: item.supplierItemId,
        quantity: draft.quantity,
        unitPrice: draft.unitPrice,
      }];
    });

    setSaving(true);
    setMessage(null);
    try {
      const orderId = await gateway.create({
        organizationId: workspace.organizationId,
        supplierId: supplierId as EntityId,
        stockLocationId: locationId as EntityId,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes: notes || undefined,
        items,
      });
      onCreated(orderId);
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (!workspace.permissions.managePurchases) {
    return <FeedbackMessage tone="info">Seu perfil pode consultar pedidos disponíveis no seu escopo, mas não criar novos pedidos.</FeedbackMessage>;
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {message && <FeedbackMessage tone="danger">{message}</FeedbackMessage>}

      <Panel as="section" className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Dados do pedido</h2>
          <p className="mt-1 text-sm text-neutral-600">O pedido é salvo como rascunho para conferência antes da emissão.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="purchase-supplier" label="Fornecedor" required>
            {(props) => (
              <Select
                {...props}
                required
                value={supplierId}
                onChange={(event) => {
                  const nextSupplierId = event.target.value;
                  setSupplierId(nextSupplierId);
                  setSupplierItems([]);
                  setDraftItems({});
                  setMessage(null);
                  setLoadingItems(Boolean(nextSupplierId));
                }}
              >
                <option value="">Selecione</option>
                {workspace.suppliers.filter((supplier) => supplier.active).map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.tradeName}</option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField id="purchase-location" label="Local de recebimento" required hint="A disponibilidade segue o seu escopo de acesso.">
            {(props) => (
              <Select {...props} required value={locationId} onChange={(event) => setLocationId(event.target.value)}>
                <option value="">Selecione</option>
                {workspace.stockLocations.map((location) => (
                  <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField id="purchase-expected-date" label="Previsão de entrega">
            {(props) => <Input {...props} type="date" value={expectedDeliveryDate} onChange={(event) => setExpectedDeliveryDate(event.target.value)} />}
          </FormField>
          <FormField id="purchase-notes" label="Observações">
            {(props) => <Textarea {...props} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />}
          </FormField>
        </div>
      </Panel>

      {supplierId && (
        <Panel as="section" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Itens do pedido</h2>
            <p className="mt-1 text-sm text-neutral-600">Informe quantidade e preço somente para os produtos que entram neste pedido.</p>
          </div>

          {loadingItems && <p className="text-sm text-neutral-500">Carregando produtos do fornecedor...</p>}
          {!loadingItems && supplierItems.length === 0 && (
            <p className="rounded-xl border border-dashed border-neutral-300 p-5 text-sm text-neutral-600">Este fornecedor não possui produtos de compra ativos.</p>
          )}

          <div className="grid gap-3 lg:grid-cols-2">
            {supplierItems.map((item) => {
              const draft = draftItems[item.supplierItemId] ?? { quantity: "", unitPrice: "" };
              return (
                <div key={item.supplierItemId} className="rounded-xl border border-neutral-200 p-4">
                  <div className="mb-4">
                    <p className="font-semibold text-neutral-950">{item.stockItemName}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {item.purchaseUnit ? `Unidade do fornecedor: ${item.purchaseUnit}` : "Unidade do fornecedor não informada"}
                      {item.latestUnitPrice ? ` · último preço R$ ${item.latestUnitPrice.toDecimal().replace(".", ",")}` : ""}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField id={`purchase-quantity-${item.supplierItemId}`} label="Quantidade">
                      {(props) => (
                        <Input
                          {...props}
                          inputMode="decimal"
                          value={draft.quantity}
                          onChange={(event) => setDraftItems((current) => ({
                            ...current,
                            [item.supplierItemId]: { ...draft, quantity: event.target.value },
                          }))}
                        />
                      )}
                    </FormField>
                    <FormField id={`purchase-price-${item.supplierItemId}`} label="Preço unitário">
                      {(props) => (
                        <Input
                          {...props}
                          inputMode="decimal"
                          value={draft.unitPrice}
                          onChange={(event) => setDraftItems((current) => ({
                            ...current,
                            [item.supplierItemId]: { ...draft, unitPrice: event.target.value },
                          }))}
                        />
                      )}
                    </FormField>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={saving} disabled={saving || loadingItems || !supplierId || !locationId}>
          Salvar rascunho
        </Button>
      </div>
    </form>
  );
}
