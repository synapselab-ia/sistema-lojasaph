"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FeedbackMessage, PageHeader, Panel } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";
import { SupplierForm } from "@/modules/suppliers/ui/supplier-form";

export default function NewSupplierPage() {
  const router = useRouter();
  const workspace = useRuntimeWorkspace();
  const [created, setCreated] = useState(false);

  if (!workspace.permissions.manageSuppliers) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          eyebrow="Cadastros · Fornecedores"
          title="Novo fornecedor"
          description="Seu perfil pode consultar fornecedores, mas não possui permissão para manutenção."
          actions={<Link href="/workspace/fornecedores" className={buttonClasses()}>Voltar para fornecedores</Link>}
        />
        <FeedbackMessage tone="attention">A manutenção de fornecedores está disponível apenas para perfis autorizados.</FeedbackMessage>
      </div>
    );
  }

  if (created) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader eyebrow="Cadastros · Fornecedores" title="Fornecedor cadastrado" description="O fornecedor foi incluído e já pode receber condições comerciais e produtos fornecidos no detalhe." />
        <FeedbackMessage tone="success">Fornecedor criado com sucesso.</FeedbackMessage>
        <Panel as="section" className="flex flex-col gap-3 sm:flex-row">
          <Link href="/workspace/fornecedores" className={buttonClasses({ variant: "primary" })}>Voltar para fornecedores</Link>
          <button type="button" className={buttonClasses()} onClick={() => setCreated(false)}>Cadastrar outro fornecedor</button>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Cadastros · Fornecedores"
        title="Novo fornecedor"
        description="Cadastre identificação e contatos. Condições comerciais e produtos fornecidos ficam no detalhe após o cadastro."
        actions={<Link href="/workspace/fornecedores" className={buttonClasses()}>Voltar para fornecedores</Link>}
      />
      <SupplierForm onSaved={() => setCreated(true)} onCancel={() => router.push("/workspace/fornecedores")} />
    </div>
  );
}
