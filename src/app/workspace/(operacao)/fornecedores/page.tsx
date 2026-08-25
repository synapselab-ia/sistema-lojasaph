"use client";

import { FormEvent, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";
import { Supplier, SupplierContactInput } from "@/modules/suppliers/domain/supplier";
import { SupplierCommercialTermsPanel } from "@/modules/suppliers/ui/supplier-commercial-terms-panel";
import { SupplierItemsPanel } from "@/modules/suppliers/ui/supplier-items-panel";

interface SupplierFormState {
  tradeName: string;
  taxId: string;
  active: boolean;
  contacts: SupplierContactInput[];
}

const emptyContact = (): SupplierContactInput => ({ name: "", phone: "", email: "", isPrimary: false });
const emptySupplier = (): SupplierFormState => ({ tradeName: "", taxId: "", active: true, contacts: [{ ...emptyContact(), isPrimary: true }] });

export default function RuntimeSuppliersPage() {
  const workspace = useRuntimeWorkspace();
  const [editingId, setEditingId] = useState<EntityId | null>(null);
  const [form, setForm] = useState<SupplierFormState>(emptySupplier());
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  function reset() {
    setEditingId(null);
    setForm(emptySupplier());
  }

  function updateContact(index: number, patch: Partial<SupplierContactInput>) {
    setForm((current) => ({ ...current, contacts: current.contacts.map((contact, currentIndex) => currentIndex === index ? { ...contact, ...patch } : contact) }));
  }

  function markPrimary(index: number) {
    setForm((current) => ({ ...current, contacts: current.contacts.map((contact, currentIndex) => ({ ...contact, isPrimary: currentIndex === index })) }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = { ...form, taxId: form.taxId || undefined };
      if (editingId) {
        await workspace.updateSupplier(editingId, payload);
        setMessage("Fornecedor atualizado no banco.");
      } else {
        await workspace.createSupplier(payload);
        setMessage("Fornecedor criado no banco.");
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
        <p className="text-sm font-medium text-emerald-700">Compras — cadastro persistente</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Fornecedores</h1>
        <p className="mt-3 text-sm text-neutral-600">Fornecedor, contatos, condições comerciais e produtos compráveis são persistidos com RLS. Agenda e embalagem permanecem informativas e não criam automação ou conversão implícita de compras.</p>
      </header>
      {message && <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">{message}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-3">
          {workspace.suppliers.map((supplier) => (
            <article key={supplier.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div><div className="flex items-center gap-2"><h2 className="font-semibold">{supplier.tradeName}</h2><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${supplier.active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{supplier.active ? "Ativo" : "Inativo"}</span></div><p className="mt-1 text-xs text-neutral-500">{supplier.taxId ? `Documento: ${supplier.taxId}` : "Sem documento fiscal informado"}</p></div>
                {workspace.permissions.manageSuppliers && <button type="button" onClick={() => startEdit(supplier)} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50">Editar</button>}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {supplier.contacts.length ? supplier.contacts.map((contact) => <div key={contact.id} className="rounded-xl bg-neutral-50 p-3 text-sm"><div className="flex items-center gap-2"><span className="font-medium">{contact.name}</span>{contact.isPrimary && <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold text-white">Principal</span>}</div><p className="mt-1 text-neutral-600">{contact.phone || contact.email || "Sem telefone/e-mail"}</p></div>) : <p className="text-sm text-neutral-500">Nenhum contato cadastrado.</p>}
              </div>
              <SupplierCommercialTermsPanel supplierId={supplier.id} />
              <SupplierItemsPanel supplierId={supplier.id} />
            </article>
          ))}
          {workspace.suppliers.length === 0 && <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">Nenhum fornecedor cadastrado nesta organização.</p>}
        </section>

        {workspace.permissions.manageSuppliers ? (
          <form onSubmit={submit} className="h-fit space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div><h2 className="text-lg font-semibold">{editingId ? "Editar fornecedor" : "Novo fornecedor"}</h2><p className="mt-1 text-xs text-neutral-500">A autorização final é conferida novamente pelo RLS. Condições comerciais e produtos compráveis são mantidos no card do fornecedor depois do cadastro.</p></div>
            <label className="block text-sm font-medium">Nome fantasia<input required value={form.tradeName} onChange={(event) => setForm({ ...form, tradeName: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
            <label className="block text-sm font-medium">CNPJ/CPF (opcional)<input value={form.taxId} onChange={(event) => setForm({ ...form, taxId: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
            <div className="space-y-3">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold">Contatos</p><button type="button" onClick={() => setForm({ ...form, contacts: [...form.contacts, emptyContact()] })} className="text-xs font-semibold underline">Adicionar contato</button></div>
              {form.contacts.map((contact, index) => <div key={index} className="space-y-2 rounded-xl bg-neutral-50 p-3"><input placeholder="Nome" value={contact.name} onChange={(event) => updateContact(index, { name: event.target.value })} className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" /><div className="grid grid-cols-2 gap-2"><input placeholder="Telefone" value={contact.phone ?? ""} onChange={(event) => updateContact(index, { phone: event.target.value })} className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" /><input placeholder="E-mail" type="email" value={contact.email ?? ""} onChange={(event) => updateContact(index, { email: event.target.value })} className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" /></div><label className="flex items-center gap-2 text-xs"><input type="radio" name="primary-contact" checked={contact.isPrimary ?? false} onChange={() => markPrimary(index)} />Contato principal</label></div>)}
            </div>
            {editingId && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />Fornecedor ativo</label>}
            <div className="flex gap-2"><button disabled={saving} type="submit" className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Salvando..." : editingId ? "Salvar" : "Criar fornecedor"}</button>{editingId && <button type="button" onClick={reset} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm">Cancelar</button>}</div>
          </form>
        ) : <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-5 text-sm leading-6 text-neutral-600 shadow-sm"><h2 className="font-semibold text-neutral-900">Somente leitura</h2><p className="mt-1">Seu perfil pode consultar fornecedores, condições comerciais e produtos vinculados, mas não possui papel autorizado para manutenção.</p></aside>}
      </div>
    </div>
  );
}
