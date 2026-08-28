"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FeedbackMessage, PageHeader } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { ProductForm } from "@/modules/catalog/ui/product-form";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

export default function NewProductPage() {
  const router = useRouter();
  const workspace = useRuntimeWorkspace();

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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Cadastros · Produtos"
        title="Novo produto"
        description="Cadastre um item no catálogo da organização. Dados de estoque e movimentações continuam sendo tratados nos fluxos operacionais próprios."
        actions={<Link href="/workspace/produtos" className={buttonClasses()}>Voltar para produtos</Link>}
      />
      <ProductForm
        onSaved={() => router.replace("/workspace/produtos?created=1")}
        onCancel={() => router.push("/workspace/produtos")}
      />
    </div>
  );
}
