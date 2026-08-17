"use client";

import { FormEvent, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { Supplier, SupplierContactInput } from "@/modules/suppliers/domain/supplier";
import { useDemoWorkspace } from "@/modules/master-data/ui/demo-workspace-provider";

interface SupplierFormState {
  tradeName: string;
  taxId: string;
  active: boolean;
  contacts: SupplierContactInput[];
}

const emptyContact = (): SupplierContactInput => ({ name: "", phone: "", email: "", isPrimary: false });
const emptySupplier = (): SupplierFormState => ({ tradeName: "", taxId: "", active: true, contacts: [{ ...emptyContact(), isPrimary: true }] });

export default function FornecedoresPage() {
  const workspace = useDemoWorkspace();
  const [editingId, setEditingId] = useState<EntityId | null>(null);
  const [form, setForm] = useState<SupplierFormState>(emptySupplier());
  const [offer, setOffer] = useState({ supplierId: "", stockItemId: "", unitPrice: "" });
  const [message, setMessage] = useState<string | null>(null);

  function startEdit(supplier: Supplier) {
    setEditingId(supplier.id);
    setForm({
      tradeName: supplier.tradeName,
      taxId: supplier.taxId ?? "",
      active: supplier.active,
      contacts: supplier.contacts.length
        ? supplier.contacts.map((contact) => ({ name: contact.name, phone: contact.phone ?? "", email: contact.email ?? "", isPrimary: contact.isPrimary }))
        : [{ ...emptyContact(), isPrimary: true }],
    });
    setMessage(null);
  }

  function resetSupplierForm() {
    setEditingId(null);
    setForm(emptySupplier());
  }

  function updateContact(index: number, patch: Partial<SupplierContactInput>) {
    setForm((current) => ({
      ...current,
      contacts: current.contacts.map((contact, currentIndex) => currentIndex === index ? { ...contact, ...patch } : contact),
    }));
  }

  function markPrimary(index: number) {
    setForm((current) => ({
      ...current,
      contacts: current.contacts.map((contact, currentIndex) => ({ ...contact, isPrimary: currentIndex === index })),
    }));
  }

  async function submitSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      const payload = { ...form, taxId: form.taxId || undefined };
      if (editingId) {
        await workspace.updateSupplier(editingId, payload);
        setMessage("Fornecedor atualizado.");
      } else {
        await workspace.createSupplier(payload);
        setMessage("Fornecedor criado.");
      }
      resetSupplierForm();
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    }
  }

  async function submitOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      await workspace.createOffer({
        supplierId: offer.supplierId as EntityId,
        stockItemId: offer.stockItemId as EntityId,
        unitPrice: offer.unitPrice,
      });
      setOffer({ supplierId: "", stockItemId: "", unitPrice: "" });
      setMessage("Preço do fornecedor registrado.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    }
  }

  const supplierNames = new Map(workspace.suppliers.map((supplier) => [supplier.id, supplier.tradeName]));
  const itemNames = new Map(workspace.stockItems.map((item) => [item.id, item.name]));

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header>
        <p className="text-sm font-medium text-neutral-500">Compras</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Fornecedores</h1>
        <p className="mt-3 text-sm text-neutral-600">Cadastro único, múltiplos contatos e histórico básico de preço por item.</p>
      </header>

      {message && <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">{message}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-3">
          {workspace.suppliers.map((supplier) => (
            <article key={supplier.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">{supplier.tradeName}</h2>
                  <p className="mt-1 text-xs text-neutral-500">{supplier.taxId ? `Documento: ${supplier.taxId}` : "Sem documento fiscal informado"}</p>
                </div>
                <button type="button" onClick={() => startEdit(supplier)} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50">Editar</button>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {supplier.contacts.length ? supplier.contacts.map((contact) => (
                  <div key={contact.id} className="rounded-xl bg-neutral-50 p-3 text-sm">
                    <div className="flex items-center gap-2"><span className="font-medium">{contact.name}</span>{contact.isPrimary && <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold text-white">Principal</span>}</div>
                    <p className="mt-1 text-neutral-600">{contact.phone || contact.email || "Sem telefone/e-mail"}</p>
                  </div>
                )) : <p className="text-sm text-neutral-500">Nenhum contato cadastrado.</p>}
              </div>
            </article>
          ))}
        </section>

        <form onSubmit={submitSupplier} className="h-fit space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{editingId ? "Editar fornecedor" : "Novo fornecedor"}</h2>
          <label className="block text-sm font-medium">Nome fantasia<input required value={form.tradeName} onChange={(e) => setForm({ ...form, tradeName: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
          <label className="block text-sm font-medium">CNPJ/CPF (opcional)<input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>

          <div className="space-y-3">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold">Contatos</p><button type="button" onClick={() => setForm({ ...form, contacts: [...form.contacts, emptyContact()] })} className="text-xs font-semibold underline">Adicionar contato</button></div>
            {form.contacts.map((contact, index) => (
              <div key={index} className="space-y-2 rounded-xl bg-neutral-50 p-3">
                <input placeholder="Nome" value={contact.name} onChange={(e) => updateContact(index, { name: e.target.value })} className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" />
                <div className="grid grid-cols-2 gap-2"><input placeholder="Telefone" value={contact.phone ?? ""} onChange={(e) => updateContact(index, { phone: e.target.value })} className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" /><input placeholder="E-mail" type="email" value={contact.email ?? ""} onChange={(e) => updateContact(index, { email: e.target.value })} className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" /></div>
                <label className="flex items-center gap-2 text-xs"><input type="radio" name="primary-contact" checked={contact.isPrimary ?? false} onChange={() => markPrimary(index)} />Contato principal</label>
              </div>
            ))}
          </div>

          {editingId && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />Fornecedor ativo</label>}
          <div className="flex gap-2"><button type="submit" className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">{editingId ? "Salvar" : "Criar fornecedor"}</button>{editingId && <button type="button" onClick={resetSupplierForm} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm">Cancelar</button>}</div>
        </form>
      </div>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form onSubmit={submitOffer} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div><h2 className="text-lg font-semibold">Registrar preço</h2><p className="mt-1 text-xs text-neutral-500">Snapshot simples de preço observado.</p></div>
          <label className="block text-sm font-medium">Fornecedor<select required value={offer.supplierId} onChange={(e) => setOffer({ ...offer, supplierId: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Selecione</option>{workspace.suppliers.filter((supplier) => supplier.active).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.tradeName}</option>)}</select></label>
          <label className="block text-sm font-medium">Produto<select required value={offer.stockItemId} onChange={(e) => setOffer({ ...offer, stockItemId: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Selecione</option>{workspace.stockItems.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="block text-sm font-medium">Preço unitário (R$)<input required inputMode="decimal" placeholder="0,00" value={offer.unitPrice} onChange={(e) => setOffer({ ...offer, unitPrice: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
          <button type="submit" className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">Registrar preço</button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 px-5 py-4"><h2 className="font-semibold">Histórico observado</h2></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-4 py-3 font-medium">Fornecedor</th><th className="px-4 py-3 font-medium">Produto</th><th className="px-4 py-3 font-medium">Preço</th><th className="px-4 py-3 font-medium">Data</th></tr></thead><tbody className="divide-y divide-neutral-100">{workspace.offers.map((entry) => <tr key={entry.id}><td className="px-4 py-3">{supplierNames.get(entry.supplierId) ?? "Fornecedor removido"}</td><td className="px-4 py-3">{itemNames.get(entry.stockItemId) ?? "Item removido"}</td><td className="px-4 py-3 font-medium">R$ {entry.unitPrice.toDecimal().replace(".", ",")}</td><td className="px-4 py-3 text-neutral-600">{new Intl.DateTimeFormat("pt-BR").format(new Date(entry.observedAt))}</td></tr>)}</tbody></table></div>
        </div>
      </section>
    </div>
  );
}
