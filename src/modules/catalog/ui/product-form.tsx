"use client";

import { FormEvent, useState } from "react";
import { Button, FeedbackMessage, FormField, Input, Panel, Select } from "@/components/ui";
import { EntityId } from "@/domain/common/entity-id";
import { StockItem, StockItemType } from "@/modules/catalog/domain/stock-item";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";
import { productTypeLabels } from "./product-display";

interface ProductFormState {
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

function initialForm(item?: StockItem): ProductFormState {
  if (!item) {
    return {
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
  }

  return {
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
  };
}

export function ProductForm({
  item,
  onSaved,
  onCancel,
}: {
  item?: StockItem;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const workspace = useRuntimeWorkspace();
  const [form, setForm] = useState<ProductFormState>(() => initialForm(item));
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(item);

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

      if (item) {
        await workspace.updateStockItem(item.id, payload);
      } else {
        await workspace.createStockItem(payload);
      }
      onSaved();
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel as="section" className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-neutral-950">
          {editing ? "Editar produto" : "Dados do produto"}
        </h2>
        <p className="mt-1 text-sm leading-6 text-neutral-600">
          Informe os dados usados no catálogo e no controle operacional.
        </p>
      </div>

      {message && <FeedbackMessage tone="danger">{message}</FeedbackMessage>}

      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="product-name" label="Nome" required className="md:col-span-2">
            {(props) => (
              <Input
                {...props}
                required
                autoFocus={!editing}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            )}
          </FormField>

          <FormField id="product-category" label="Categoria" required>
            {(props) => (
              <Select
                {...props}
                required
                value={form.categoryId}
                onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
              >
                <option value="" disabled>Selecione uma categoria</option>
                {workspace.categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField id="product-unit" label="Unidade" required>
            {(props) => (
              <Select
                {...props}
                required
                value={form.baseUnitCode}
                onChange={(event) => setForm({ ...form, baseUnitCode: event.target.value })}
              >
                <option value="" disabled>Selecione uma unidade</option>
                {workspace.unitsOfMeasure.map((unit) => (
                  <option key={unit.id} value={unit.code}>{unit.code} — {unit.name}</option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField id="product-type" label="Tipo">
            {(props) => (
              <Select
                {...props}
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value as StockItemType })}
              >
                {Object.entries(productTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            )}
          </FormField>

          {editing && (
            <FormField id="product-status" label="Status">
              {(props) => (
                <Select
                  {...props}
                  value={form.active ? "active" : "inactive"}
                  onChange={(event) => setForm({ ...form, active: event.target.value === "active" })}
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </Select>
              )}
            </FormField>
          )}
        </div>

        <fieldset className="space-y-4 rounded-xl border border-neutral-200 p-4">
          <legend className="px-1 text-sm font-semibold text-neutral-900">Identificação e dados fiscais</legend>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField id="product-ean" label="EAN / código de barras" hint="Opcional.">
              {(props) => (
                <Input
                  {...props}
                  value={form.ean}
                  onChange={(event) => setForm({ ...form, ean: event.target.value })}
                />
              )}
            </FormField>
            <div className="hidden md:block" aria-hidden="true" />
            <FormField id="product-ncm" label="NCM" hint="Opcional.">
              {(props) => (
                <Input
                  {...props}
                  value={form.ncm}
                  onChange={(event) => setForm({ ...form, ncm: event.target.value })}
                />
              )}
            </FormField>
            <FormField id="product-cest" label="CEST" hint="Opcional.">
              {(props) => (
                <Input
                  {...props}
                  value={form.cest}
                  onChange={(event) => setForm({ ...form, cest: event.target.value })}
                />
              )}
            </FormField>
          </div>
          <p className="text-xs leading-5 text-neutral-500">
            O sistema preserva os valores informados, mas não valida enquadramento fiscal, máscara ou dígito verificador nesta etapa.
          </p>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <legend className="px-1 text-sm font-semibold text-neutral-900">Controles operacionais</legend>
          <label className="flex min-h-11 items-center gap-3 text-sm text-neutral-800">
            <input
              type="checkbox"
              checked={form.trackExpiration}
              onChange={(event) => setForm({
                ...form,
                trackExpiration: event.target.checked,
                trackBatch: event.target.checked || form.trackBatch,
              })}
            />
            Controlar validade
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm text-neutral-800">
            <input
              type="checkbox"
              checked={form.trackBatch}
              onChange={(event) => setForm({ ...form, trackBatch: event.target.checked })}
            />
            Controlar lote
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm text-neutral-800">
            <input
              type="checkbox"
              checked={form.isReturnable}
              onChange={(event) => setForm({ ...form, isReturnable: event.target.checked })}
            />
            Item retornável
          </label>
        </fieldset>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button
            type="submit"
            variant="primary"
            loading={saving}
            disabled={workspace.unitsOfMeasure.length === 0 || workspace.categories.length === 0 || !form.categoryId}
          >
            {editing ? "Salvar alterações" : "Criar produto"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
