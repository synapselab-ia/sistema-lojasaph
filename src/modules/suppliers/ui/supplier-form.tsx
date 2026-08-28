"use client";

import { FormEvent, useState } from "react";
import { Button, FeedbackMessage, FormField, Input, Panel, Select } from "@/components/ui";
import { Supplier, SupplierContactInput } from "@/modules/suppliers/domain/supplier";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

interface SupplierFormState {
  tradeName: string;
  taxId: string;
  active: boolean;
  contacts: SupplierContactInput[];
}

function emptyContact(primary = false): SupplierContactInput {
  return { name: "", phone: "", email: "", isPrimary: primary };
}

function initialForm(supplier?: Supplier): SupplierFormState {
  if (!supplier) {
    return { tradeName: "", taxId: "", active: true, contacts: [emptyContact(true)] };
  }

  return {
    tradeName: supplier.tradeName,
    taxId: supplier.taxId ?? "",
    active: supplier.active,
    contacts: supplier.contacts.length > 0
      ? supplier.contacts.map((contact) => ({
          name: contact.name,
          phone: contact.phone ?? "",
          email: contact.email ?? "",
          isPrimary: contact.isPrimary,
        }))
      : [emptyContact(true)],
  };
}

export function SupplierForm({
  supplier,
  onSaved,
  onCancel,
}: {
  supplier?: Supplier;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const workspace = useRuntimeWorkspace();
  const [form, setForm] = useState<SupplierFormState>(() => initialForm(supplier));
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(supplier);

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

  function removeContact(index: number) {
    setForm((current) => {
      const removingPrimary = Boolean(current.contacts[index]?.isPrimary);
      const contacts = current.contacts.filter((_, currentIndex) => currentIndex !== index);
      if (removingPrimary && contacts.length > 0) contacts[0] = { ...contacts[0], isPrimary: true };
      return { ...current, contacts };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        tradeName: form.tradeName,
        taxId: form.taxId || undefined,
        active: form.active,
        contacts: form.contacts,
      };
      if (supplier) await workspace.updateSupplier(supplier.id, payload);
      else await workspace.createSupplier(payload);
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
        <h2 className="text-lg font-semibold">{editing ? "Editar fornecedor" : "Dados do fornecedor"}</h2>
        <p className="mt-1 text-sm leading-6 text-neutral-600">Cadastre a identificação e os contatos. Condições comerciais e produtos fornecidos são mantidos no detalhe do fornecedor.</p>
      </div>

      {message && <FeedbackMessage tone="danger">{message}</FeedbackMessage>}

      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="supplier-name" label="Nome fantasia" required>
            {(props) => <Input {...props} required autoFocus={!editing} value={form.tradeName} onChange={(event) => setForm({ ...form, tradeName: event.target.value })} />}
          </FormField>
          <FormField id="supplier-tax-id" label="CNPJ/CPF" hint="Opcional.">
            {(props) => <Input {...props} value={form.taxId} onChange={(event) => setForm({ ...form, taxId: event.target.value })} />}
          </FormField>
          {editing && (
            <FormField id="supplier-status" label="Status">
              {(props) => (
                <Select {...props} value={form.active ? "active" : "inactive"} onChange={(event) => setForm({ ...form, active: event.target.value === "active" })}>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </Select>
              )}
            </FormField>
          )}
        </div>

        <fieldset className="space-y-4 rounded-xl border border-neutral-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <legend className="text-sm font-semibold text-neutral-900">Contatos</legend>
            <Button type="button" size="sm" onClick={() => setForm({ ...form, contacts: [...form.contacts, emptyContact(form.contacts.length === 0)] })}>Adicionar contato</Button>
          </div>

          {form.contacts.length === 0 && <p className="text-sm text-neutral-500">Nenhum contato informado.</p>}
          {form.contacts.map((contact, index) => (
            <div key={index} className="space-y-3 rounded-xl bg-neutral-50 p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <FormField id={`supplier-contact-${index}-name`} label="Nome">
                  {(props) => <Input {...props} value={contact.name} onChange={(event) => updateContact(index, { name: event.target.value })} />}
                </FormField>
                <FormField id={`supplier-contact-${index}-phone`} label="Telefone">
                  {(props) => <Input {...props} value={contact.phone ?? ""} onChange={(event) => updateContact(index, { phone: event.target.value })} />}
                </FormField>
                <FormField id={`supplier-contact-${index}-email`} label="E-mail">
                  {(props) => <Input {...props} type="email" value={contact.email ?? ""} onChange={(event) => updateContact(index, { email: event.target.value })} />}
                </FormField>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex min-h-11 items-center gap-2 text-sm text-neutral-700">
                  <input type="radio" name="primary-contact" checked={contact.isPrimary ?? false} onChange={() => markPrimary(index)} />
                  Contato principal
                </label>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeContact(index)}>Remover contato</Button>
              </div>
            </div>
          ))}
        </fieldset>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" variant="primary" loading={saving}>{editing ? "Salvar alterações" : "Criar fornecedor"}</Button>
        </div>
      </form>
    </Panel>
  );
}
