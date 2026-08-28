"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, FeedbackMessage, FormField, Input, PageHeader, Panel, Select, StatusBadge } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { EntityId } from "@/domain/common/entity-id";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

type EmployeeStatusFilter = "all" | "active" | "inactive";
type EmployeeUnitFilter = "all" | "organization" | EntityId;

function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export default function EmployeesPage() {
  const workspace = useRuntimeWorkspace();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<EmployeeStatusFilter>("all");
  const [unitFilter, setUnitFilter] = useState<EmployeeUnitFilter>("all");

  const employees = useMemo(() => {
    const search = normalizeSearch(query);
    return [...workspace.employees]
      .filter((employee) => {
        if (status === "active" && !employee.active) return false;
        if (status === "inactive" && employee.active) return false;
        if (unitFilter === "organization" && employee.defaultUnitId) return false;
        if (unitFilter !== "all" && unitFilter !== "organization" && employee.defaultUnitId !== unitFilter) return false;
        if (!search) return true;
        const unitName = employee.defaultUnitId ? workspace.units.find((unit) => unit.id === employee.defaultUnitId)?.name : "Toda a organização";
        const sectorName = employee.defaultSectorId ? workspace.sectors.find((sector) => sector.id === employee.defaultSectorId)?.name : undefined;
        return [employee.name, employee.code, unitName, sectorName]
          .filter((value): value is string => Boolean(value))
          .some((value) => normalizeSearch(value).includes(search));
      })
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  }, [query, status, unitFilter, workspace.employees, workspace.sectors, workspace.units]);

  if (!workspace.permissions.manageEmployees) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader eyebrow="Cadastros · Funcionários" title="Funcionários" description="O diretório de funcionários contém dados operacionais e indicação de vínculo com acesso ao sistema." />
        <FeedbackMessage tone="attention">Seu perfil não possui permissão para consultar o diretório de funcionários neste escopo.</FeedbackMessage>
      </div>
    );
  }

  const hasFilters = Boolean(query.trim()) || status !== "all" || unitFilter !== "all";
  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setUnitFilter("all");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Cadastros · Funcionários"
        title="Funcionários"
        description="Consulte identidades operacionais e seus escopos padrão. Cadastro de funcionário não concede login; acesso e permissões continuam separados em Administração."
        actions={<Link href="/workspace/funcionarios/novo" className={buttonClasses({ variant: "primary" })}>Novo funcionário</Link>}
      />

      <Panel as="section" className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_200px_240px]">
          <FormField id="employee-search" label="Buscar funcionário" hint="Busque por nome, código, unidade ou setor.">
            {(props) => <Input {...props} type="search" value={query} placeholder="Ex.: Ana, caixa, cozinha" onChange={(event) => setQuery(event.target.value)} />}
          </FormField>
          <FormField id="employee-status-filter" label="Status">
            {(props) => (
              <Select {...props} value={status} onChange={(event) => setStatus(event.target.value as EmployeeStatusFilter)}>
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </Select>
            )}
          </FormField>
          <FormField id="employee-unit-filter" label="Unidade padrão">
            {(props) => (
              <Select {...props} value={unitFilter} onChange={(event) => setUnitFilter(event.target.value as EmployeeUnitFilter)}>
                <option value="all">Todas</option>
                <option value="organization">Toda a organização</option>
                {workspace.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
              </Select>
            )}
          </FormField>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4 text-sm text-neutral-600">
          <p>{employees.length} de {workspace.employees.length} {workspace.employees.length === 1 ? "funcionário" : "funcionários"}</p>
          {hasFilters && <button type="button" className="font-semibold text-neutral-800 underline-offset-4 hover:underline" onClick={clearFilters}>Limpar filtros</button>}
        </div>
      </Panel>

      {employees.length === 0 ? (
        <EmptyState
          title={workspace.employees.length === 0 ? "Nenhum funcionário cadastrado" : "Nenhum funcionário encontrado"}
          description={workspace.employees.length === 0 ? "Cadastre o primeiro funcionário para iniciar o diretório operacional." : "Ajuste a busca ou os filtros para localizar outros funcionários."}
          action={workspace.employees.length === 0
            ? <Link href="/workspace/funcionarios/novo" className={buttonClasses({ variant: "primary" })}>Cadastrar funcionário</Link>
            : hasFilters
              ? <button type="button" className={buttonClasses()} onClick={clearFilters}>Limpar filtros</button>
              : undefined}
        />
      ) : (
        <section className="grid gap-4 lg:grid-cols-2" aria-label="Lista de funcionários">
          {employees.map((employee) => {
            const unitName = employee.defaultUnitId ? workspace.units.find((unit) => unit.id === employee.defaultUnitId)?.name ?? "Unidade indisponível" : "Toda a organização";
            const sectorName = employee.defaultSectorId ? workspace.sectors.find((sector) => sector.id === employee.defaultSectorId)?.name ?? "Setor indisponível" : undefined;
            return (
              <Panel key={employee.id} as="article" className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/workspace/funcionarios/${employee.id}`} className="font-semibold text-neutral-950 underline-offset-4 hover:underline">{employee.name}</Link>
                    <p className="mt-1 text-sm text-neutral-600">{employee.code ? `Código: ${employee.code}` : "Sem código operacional"}</p>
                  </div>
                  <StatusBadge tone={employee.active ? "success" : "neutral"}>{employee.active ? "Ativo" : "Inativo"}</StatusBadge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-neutral-50 p-4 text-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Escopo padrão</p>
                    <p className="mt-2 font-medium text-neutral-900">{unitName}{sectorName ? ` · ${sectorName}` : ""}</p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-4 text-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Acesso ao sistema</p>
                    <p className="mt-2 font-medium text-neutral-900">{employee.linkedUserId ? "Identidade vinculada" : "Sem login vinculado"}</p>
                  </div>
                </div>
                <Link href={`/workspace/funcionarios/${employee.id}`} className={buttonClasses({ block: true })}>Ver detalhe</Link>
              </Panel>
            );
          })}
        </section>
      )}
    </div>
  );
}
