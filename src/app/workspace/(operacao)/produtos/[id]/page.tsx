"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button, EmptyState, FeedbackMessage, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { EntityId } from "@/domain/common/entity-id";
import { productFiscalSummary, productTypeLabels } from "@/modules/catalog/ui/product-display";
import { ProductForm } from "@/modules/catalog/ui/product-form";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

function booleanLabel(value: boolean): string {
  return value ? "Sim" : "Não";
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const workspace = useRuntimeWorkspace();
  const [editing, setEditing] = useState(false);
  const [updated, setUpdated] = useState(false);
  const productId = params.id as EntityId;
  const item = workspace.stockItems.find((candidate) => candidate.id === productId);

  if (!item) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          eyebrow="Cadastros · Produtos"
          title="Produto não encontrado"
          description="O produto pode ter sido removido, estar fora da organização atual ou o endereço pode estar incorreto."
        />
        <EmptyState
          title="Não foi possível abrir este produto"
          description="Volte para a lista para localizar um produto disponível no catálogo."
          action={<Link href="/workspace/produtos" className={buttonClasses()}>Voltar para produtos</Link>}
        />
      </div>
    );
  }

  const categoryName = workspace.categories.find((category) => category.id === item.categoryId)?.name ?? "Categoria indisponível";

  if (editing) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          eyebrow="Cadastros · Produtos"
          title={item.name}
          description="Atualize os dados do catálogo sem alterar os fluxos de estoque vinculados ao produto."
          actions={<button type="button" className={buttonClasses()} onClick={() => setEditing(false)}>Voltar ao detalhe</button>}
        />
        <ProductForm
          item={item}
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
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Cadastros · Produtos"
        title={item.name}
        description={`${categoryName} · ${productTypeLabels[item.type]} · unidade ${item.baseUnitCode}`}
        actions={(
          <>
            <Link href="/workspace/produtos" className={buttonClasses()}>Voltar para produtos</Link>
            {workspace.permissions.manageCatalog && (
              <Button type="button" variant="primary" onClick={() => setEditing(true)}>Editar produto</Button>
            )}
          </>
        )}
      />

      {updated && <FeedbackMessage tone="success">Produto atualizado com sucesso.</FeedbackMessage>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel as="section" className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Identificação</h2>
              <p className="mt-1 text-sm text-neutral-600">Dados usados para reconhecer o produto no catálogo.</p>
            </div>
            <StatusBadge tone={item.active ? "success" : "neutral"}>{item.active ? "Ativo" : "Inativo"}</StatusBadge>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Categoria</dt><dd className="mt-1 text-sm text-neutral-900">{categoryName}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Tipo</dt><dd className="mt-1 text-sm text-neutral-900">{productTypeLabels[item.type]}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Unidade</dt><dd className="mt-1 text-sm text-neutral-900">{item.baseUnitCode}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">EAN / código de barras</dt><dd className="mt-1 text-sm text-neutral-900">{item.ean ?? "Não informado"}</dd></div>
          </dl>
        </Panel>

        <Panel as="section" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Dados fiscais</h2>
            <p className="mt-1 text-sm text-neutral-600">Informações fiscais já suportadas pelo cadastro atual.</p>
          </div>
          <p className="text-sm font-medium text-neutral-900">{productFiscalSummary(item)}</p>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">NCM</dt><dd className="mt-1 text-sm text-neutral-900">{item.ncm ?? "Não informado"}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">CEST</dt><dd className="mt-1 text-sm text-neutral-900">{item.cest ?? "Não informado"}</dd></div>
          </dl>
        </Panel>
      </div>

      <Panel as="section" className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Controles operacionais</h2>
          <p className="mt-1 text-sm text-neutral-600">Configurações do produto usadas pelos fluxos de estoque.</p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Controlar validade</dt><dd className="mt-1 text-sm text-neutral-900">{booleanLabel(item.trackExpiration)}</dd></div>
          <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Controlar lote</dt><dd className="mt-1 text-sm text-neutral-900">{booleanLabel(item.trackBatch)}</dd></div>
          <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Item retornável</dt><dd className="mt-1 text-sm text-neutral-900">{booleanLabel(item.isReturnable)}</dd></div>
        </dl>
      </Panel>

      {!workspace.permissions.manageCatalog && (
        <FeedbackMessage tone="info">Seu perfil possui acesso de consulta ao catálogo. Alterações ficam disponíveis apenas para perfis autorizados.</FeedbackMessage>
      )}
    </div>
  );
}
