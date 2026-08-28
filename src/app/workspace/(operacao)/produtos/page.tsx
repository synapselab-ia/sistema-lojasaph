"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, FormField, Input, PageHeader, Panel, Select, StatusBadge } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { EntityId } from "@/domain/common/entity-id";
import {
  buildProductCatalogRows,
  filterProductCatalogRows,
  ProductStatusFilter,
  ProductTypeFilter,
} from "@/modules/catalog/application/product-catalog-view";
import { productFiscalSummary, productTypeLabels } from "@/modules/catalog/ui/product-display";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

export default function RuntimeProductsPage() {
  const workspace = useRuntimeWorkspace();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProductStatusFilter>("all");
  const [categoryId, setCategoryId] = useState<"all" | EntityId>("all");
  const [type, setType] = useState<ProductTypeFilter>("all");

  const rows = useMemo(
    () => buildProductCatalogRows(workspace.stockItems, workspace.categories),
    [workspace.stockItems, workspace.categories],
  );
  const filteredRows = useMemo(
    () => filterProductCatalogRows(rows, { query, status, categoryId, type }),
    [rows, query, status, categoryId, type],
  );
  const hasFilters = Boolean(query.trim()) || status !== "all" || categoryId !== "all" || type !== "all";

  function clearFilters() {
    setQuery("");
    setStatus("all");
    setCategoryId("all");
    setType("all");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Cadastros · Produtos"
        title="Produtos"
        description="Consulte e mantenha o catálogo da organização. Movimentações, saldos e demais rotinas de estoque permanecem nos fluxos operacionais próprios."
        actions={workspace.permissions.manageCatalog ? (
          <Link href="/workspace/produtos/novo" className={buttonClasses({ variant: "primary" })}>Novo produto</Link>
        ) : undefined}
      />

      <Panel as="section" className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(260px,1.5fr)_repeat(3,minmax(150px,1fr))]">
          <FormField id="product-search" label="Buscar produto" hint="Busque por nome, categoria, EAN, NCM ou CEST.">
            {(props) => (
              <Input
                {...props}
                type="search"
                value={query}
                placeholder="Ex.: refrigerante, 789..."
                onChange={(event) => setQuery(event.target.value)}
              />
            )}
          </FormField>

          <FormField id="product-status-filter" label="Status">
            {(props) => (
              <Select {...props} value={status} onChange={(event) => setStatus(event.target.value as ProductStatusFilter)}>
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </Select>
            )}
          </FormField>

          <FormField id="product-category-filter" label="Categoria">
            {(props) => (
              <Select
                {...props}
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value === "all" ? "all" : event.target.value as EntityId)}
              >
                <option value="all">Todas</option>
                {workspace.categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField id="product-type-filter" label="Tipo">
            {(props) => (
              <Select {...props} value={type} onChange={(event) => setType(event.target.value as ProductTypeFilter)}>
                <option value="all">Todos</option>
                {Object.entries(productTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            )}
          </FormField>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4 text-sm text-neutral-600">
          <p>{filteredRows.length} de {rows.length} {rows.length === 1 ? "produto" : "produtos"}</p>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="font-semibold text-neutral-800 underline-offset-4 hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      </Panel>

      {filteredRows.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? "Nenhum produto cadastrado" : "Nenhum produto encontrado"}
          description={rows.length === 0
            ? "Cadastre o primeiro produto para iniciar o catálogo da organização."
            : "Ajuste a busca ou os filtros para localizar outros produtos."}
          action={rows.length === 0 && workspace.permissions.manageCatalog
            ? <Link href="/workspace/produtos/novo" className={buttonClasses({ variant: "primary" })}>Cadastrar produto</Link>
            : hasFilters
              ? <button type="button" onClick={clearFilters} className={buttonClasses()}>Limpar filtros</button>
              : undefined}
        />
      ) : (
        <>
          <Panel as="section" padding="none" className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Produto</th>
                    <th className="px-4 py-3 font-medium">Identificação</th>
                    <th className="px-4 py-3 font-medium">Categoria</th>
                    <th className="px-4 py-3 font-medium">Unidade</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredRows.map(({ item, categoryName }) => (
                    <tr key={item.id} className="hover:bg-neutral-50/70">
                      <td className="px-4 py-3 font-medium text-neutral-950">
                        <Link href={`/workspace/produtos/${item.id}`} className="underline-offset-4 hover:underline">{item.name}</Link>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        <span className="block text-neutral-800">{item.ean ? `EAN ${item.ean}` : "Sem EAN"}</span>
                        <span className="mt-1 block text-xs text-neutral-500">{productFiscalSummary(item)}</span>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{categoryName}</td>
                      <td className="px-4 py-3 text-neutral-600">{item.baseUnitCode}</td>
                      <td className="px-4 py-3 text-neutral-600">{productTypeLabels[item.type]}</td>
                      <td className="px-4 py-3"><StatusBadge tone={item.active ? "success" : "neutral"}>{item.active ? "Ativo" : "Inativo"}</StatusBadge></td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/workspace/produtos/${item.id}`} className={buttonClasses({ size: "sm" })}>Ver detalhe</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="space-y-3 md:hidden">
            {filteredRows.map(({ item, categoryName }) => (
              <Panel key={item.id} as="article" className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/workspace/produtos/${item.id}`} className="font-semibold text-neutral-950 underline-offset-4 hover:underline">{item.name}</Link>
                    <p className="mt-1 text-sm text-neutral-600">{categoryName} · {productTypeLabels[item.type]}</p>
                  </div>
                  <StatusBadge tone={item.active ? "success" : "neutral"}>{item.active ? "Ativo" : "Inativo"}</StatusBadge>
                </div>
                <div className="grid gap-2 text-sm text-neutral-600">
                  <p><span className="font-medium text-neutral-800">Unidade:</span> {item.baseUnitCode}</p>
                  <p><span className="font-medium text-neutral-800">EAN:</span> {item.ean ?? "Não informado"}</p>
                  <p>{productFiscalSummary(item)}</p>
                </div>
                <Link href={`/workspace/produtos/${item.id}`} className={buttonClasses({ block: true })}>Ver detalhe</Link>
              </Panel>
            ))}
          </div>
        </>
      )}

      {!workspace.permissions.manageCatalog && (
        <Panel as="aside" tone="info">
          <h2 className="font-semibold">Consulta de catálogo</h2>
          <p className="mt-1 text-sm leading-6">Seu perfil pode consultar os produtos. Cadastro e edição ficam disponíveis apenas para perfis autorizados.</p>
        </Panel>
      )}
    </div>
  );
}
