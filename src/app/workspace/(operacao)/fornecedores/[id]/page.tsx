"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button, EmptyState, FeedbackMessage, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { EntityId } from "@/domain/common/entity-id";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";
import { SupplierCommercialTermsPanel } from "@/modules/suppliers/ui/supplier-commercial-terms-panel";
import { SupplierForm } from "@/modules/suppliers/ui/supplier-form";
import { SupplierItemsPanel } from "@/modules/suppliers/ui/supplier-items-panel";

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>();
  const workspace = useRuntimeWorkspace();
  const [editing, setEditing] = useState(false);
  const [updated, setUpdated] = useState(false);
  const supplierId = params.id as EntityId;
  const supplier = workspace.suppliers.find((candidate) => candidate.id === supplierId);

  if (!supplier) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader eyebrow="Cadastros · Fornecedores" title="Fornecedor não encontrado" description="O fornecedor pode estar fora da organização atual ou o endereço pode estar incorreto." />
        <EmptyState
          title="Não foi possível abrir este fornecedor"
          description="Volte para a lista para localizar um fornecedor disponível."
          action={<Link href="/workspace/fornecedores" className={buttonClasses()}>Voltar para fornecedores</Link>}
        />
      </div>
    );
  }

  const primaryContact = supplier.contacts.find((contact) => contact.isPrimary) ?? supplier.contacts[0];

  if (editing) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          eyebrow="Cadastros · Fornecedores"
          title={supplier.tradeName}
          description="Atualize identificação e contatos sem alterar as condições comerciais e os produtos vinculados."
          actions={<button type="button" className={buttonClasses()} onClick={() => setEditing(false)}>Voltar ao detalhe</button>}
        />
        <SupplierForm
          supplier={supplier}
          onSaved={() => {
            setEditing(false);
            setUpdated(true);
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Cadastros · Fornecedores"
        title={supplier.tradeName}
        description={supplier.taxId ? `Documento: ${supplier.taxId}` : "Sem documento fiscal informado"}
        actions={(
          <>
            <Link href="/workspace/fornecedores" className={buttonClasses()}>Voltar para fornecedores</Link>
            {workspace.permissions.manageSuppliers && <Button type="button" variant="primary" onClick={() => setEditing(true)}>Editar fornecedor</Button>}
          </>
        )}
      />

      {updated && <FeedbackMessage tone="success">Fornecedor atualizado com sucesso.</FeedbackMessage>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel as="section" className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Identificação</h2>
              <p className="mt-1 text-sm text-neutral-600">Dados principais do fornecedor.</p>
            </div>
            <StatusBadge tone={supplier.active ? "success" : "neutral"}>{supplier.active ? "Ativo" : "Inativo"}</StatusBadge>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Nome fantasia</dt><dd className="mt-1 text-sm text-neutral-900">{supplier.tradeName}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">CNPJ/CPF</dt><dd className="mt-1 text-sm text-neutral-900">{supplier.taxId ?? "Não informado"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Contato principal</dt><dd className="mt-1 text-sm text-neutral-900">{primaryContact ? `${primaryContact.name}${primaryContact.phone ? ` · ${primaryContact.phone}` : ""}${primaryContact.email ? ` · ${primaryContact.email}` : ""}` : "Não informado"}</dd></div>
          </dl>
        </Panel>

        <Panel as="section" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Contatos</h2>
            <p className="mt-1 text-sm text-neutral-600">Pessoas e canais informados para relacionamento com o fornecedor.</p>
          </div>
          {supplier.contacts.length > 0 ? (
            <div className="space-y-3">
              {supplier.contacts.map((contact) => (
                <div key={contact.id} className="rounded-xl bg-neutral-50 p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-neutral-950">{contact.name}</span>{contact.isPrimary && <StatusBadge>Principal</StatusBadge>}</div>
                  <p className="mt-2 text-neutral-600">{[contact.phone, contact.email].filter(Boolean).join(" · ") || "Sem telefone ou e-mail informado"}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-neutral-500">Nenhum contato cadastrado.</p>}
        </Panel>
      </div>

      <Panel as="section" className="space-y-2">
        <h2 className="text-lg font-semibold">Condições comerciais</h2>
        <p className="text-sm text-neutral-600">Informações já persistidas para orientar compras, sem criar automação implícita de agenda ou pagamento.</p>
        <SupplierCommercialTermsPanel supplierId={supplier.id} />
      </Panel>

      <Panel as="section" className="space-y-2">
        <h2 className="text-lg font-semibold">Produtos fornecidos</h2>
        <p className="text-sm text-neutral-600">Itens, preços e embalagens já vinculados ao fornecedor.</p>
        <SupplierItemsPanel supplierId={supplier.id} />
      </Panel>

      {!workspace.permissions.manageSuppliers && <FeedbackMessage tone="info">Seu perfil possui acesso de consulta. Alterações ficam disponíveis apenas para perfis autorizados.</FeedbackMessage>}
    </div>
  );
}
