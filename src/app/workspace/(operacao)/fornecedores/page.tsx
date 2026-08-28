"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, FormField, Input, PageHeader, Panel, Select, StatusBadge } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

type SupplierStatusFilter = "all" | "active" | "inactive";

export default function RuntimeSuppliersPage() {
  const workspace = useRuntimeWorkspace();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SupplierStatusFilter>("all");

  const suppliers = useMemo(() => {
    const search = normalizeSearch(query);
    return [...workspace.suppliers]
      .filter((supplier) => {
        if (status === "active" && !supplier.active) return false;
        if (status === "inactive" && supplier.active) return false;
        if (!search) return true;
        const primary = supplier.contacts.find((contact) => contact.isPrimary) ?? supplier.contacts[0];
        return [supplier.tradeName, supplier.taxId, primary?.name, primary?.phone, primary?.email]
          .filter((value): value is string => Boolean(value))
          .some((value) => normalizeSearch(value).includes(search));
      })
      .sort((left, right) => left.tradeName.localeCompare(right.tradeName, "pt-BR"));
  }, [query, status, workspace.suppliers]);

  const hasFilters = Boolean(query.trim()) || status !== "all";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Cadastros · Fornecedores"
        title="Fornecedores"
        description="Consulte fornecedores e abra o detalhe para contatos, condições comerciais e produtos fornecidos. Agenda e embalagem permanecem informativas, sem automação implícita."
        actions={workspace.permissions.manageSuppliers ? <Link href="/workspace/fornecedores/novo" className={buttonClasses({ variant: "primary" })}>Novo fornecedor</Link> : undefined}
      />

      <Panel as="section" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <FormField id="supplier-search" label="Buscar fornecedor" hint="Busque por nome, documento ou contato principal.">
            {(props) => <Input {...props} type="search" value={query} placeholder="Ex.: distribuidora, CNPJ, contato" onChange={(event) => setQuery(event.target.value)} />}
          </FormField>
          <FormField id="supplier-status-filter" label="Status">
            {(props) => (
              <Select {...props} value={status} onChange={(event) => setStatus(event.target.value as SupplierStatusFilter)}>
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </Select>
            )}
          </FormField>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4 text-sm text-neutral-600">
          <p>{suppliers.length} de {workspace.suppliers.length} {workspace.suppliers.length === 1 ? "fornecedor" : "fornecedores"}</p>
          {hasFilters && <button type="button" className="font-semibold text-neutral-800 underline-offset-4 hover:underline" onClick={() => { setQuery(""); setStatus("all"); }}>Limpar filtros</button>}
        </div>
      </Panel>

      {suppliers.length === 0 ? (
        <EmptyState
          title={workspace.suppliers.length === 0 ? "Nenhum fornecedor cadastrado" : "Nenhum fornecedor encontrado"}
          description={workspace.suppliers.length === 0 ? "Cadastre o primeiro fornecedor para organizar contatos e relações comerciais." : "Ajuste a busca ou o filtro para localizar outros fornecedores."}
          action={workspace.suppliers.length === 0 && workspace.permissions.manageSuppliers
            ? <Link href="/workspace/fornecedores/novo" className={buttonClasses({ variant: "primary" })}>Cadastrar fornecedor</Link>
            : hasFilters
              ? <button type="button" className={buttonClasses()} onClick={() => { setQuery(""); setStatus("all"); }}>Limpar filtros</button>
              : undefined}
        />
      ) : (
        <section className="grid gap-4 lg:grid-cols-2" aria-label="Lista de fornecedores">
          {suppliers.map((supplier) => {
            const primary = supplier.contacts.find((contact) => contact.isPrimary) ?? supplier.contacts[0];
            return (
              <Panel key={supplier.id} as="article" className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/workspace/fornecedores/${supplier.id}`} className="font-semibold text-neutral-950 underline-offset-4 hover:underline">{supplier.tradeName}</Link>
                    <p className="mt-1 text-sm text-neutral-600">{supplier.taxId ? `Documento: ${supplier.taxId}` : "Sem documento fiscal informado"}</p>
                  </div>
                  <StatusBadge tone={supplier.active ? "success" : "neutral"}>{supplier.active ? "Ativo" : "Inativo"}</StatusBadge>
                </div>
                <div className="rounded-xl bg-neutral-50 p-4 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Contato principal</p>
                  {primary ? (
                    <div className="mt-2 space-y-1">
                      <p className="font-medium text-neutral-900">{primary.name}</p>
                      <p className="text-neutral-600">{[primary.phone, primary.email].filter(Boolean).join(" · ") || "Sem telefone ou e-mail informado"}</p>
                    </div>
                  ) : <p className="mt-2 text-neutral-600">Nenhum contato cadastrado.</p>}
                </div>
                <Link href={`/workspace/fornecedores/${supplier.id}`} className={buttonClasses({ block: true })}>Ver detalhe</Link>
              </Panel>
            );
          })}
        </section>
      )}

      {!workspace.permissions.manageSuppliers && (
        <Panel as="aside" tone="info">
          <h2 className="font-semibold">Consulta de fornecedores</h2>
          <p className="mt-1 text-sm leading-6">Seu perfil pode consultar fornecedores e seus vínculos comerciais. Alterações ficam disponíveis apenas para perfis autorizados.</p>
        </Panel>
      )}
    </div>
  );
}
