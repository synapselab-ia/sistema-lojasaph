"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FeedbackMessage, PageHeader, Panel } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { ProductForm } from "@/modules/catalog/ui/product-form";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

export default function NewProductPage() {
  const router = useRouter();
  const workspace = useRuntimeWorkspace();
  const [created, setCreated] = useState(false);

  if (!workspace.permissions.manageCatalog) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          eyebrow="Cadastros · Produtos"
          title="Novo produto"
          description="Seu perfil pode consultar o catálogo, mas não possui permissão para cadastrar produtos."
          actions={<Link href="/workspace/produtos" className={buttonClasses()}>Voltar para produtos</Link>}
        />
        <FeedbackMessage tone="attention">A manutenção do catálogo está disponível apenas para perfis autorizados.</FeedbackMessage>
      </div>
    );
  }

  if (created) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          eyebrow="Cadastros · Produtos"
          title="Produto cadastrado"
          description="O produto foi incluído no catálogo e já está disponível para consulta nos fluxos que utilizam produtos."
        />
        <FeedbackMessage tone="success">Produto criado com sucesso.</FeedbackMessage>
        <Panel as="section" className="flex flex-col gap-3 sm:flex-row">
          <Link href="/workspace/produtos" className={buttonClasses({ variant: "primary" })}>Voltar para produtos</Link>
          <button type="button" className={buttonClasses()} onClick={() => setCreated(false)}>Cadastrar outro produto</button>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Cadastros · Produtos"
        title="Novo produto"
        description="Cadastre um item no catálogo da organização. Dados de estoque e movimentações continuam sendo tratados nos fluxos operacionais próprios."
        actions={<Link href="/workspace/produtos" className={buttonClasses()}>Voltar para produtos</Link>}
      />
      <ProductForm
        onSaved={() => setCreated(true)}
        onCancel={() => router.push("/workspace/produtos")}
      />
    </div>
  );
}
