"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button, EmptyState, FeedbackMessage, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { EntityId } from "@/domain/common/entity-id";
import { EmployeeForm } from "@/modules/employees/ui/employee-form";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const workspace = useRuntimeWorkspace();
  const [editing, setEditing] = useState(false);
  const [updated, setUpdated] = useState(false);

  if (!workspace.permissions.manageEmployees) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader eyebrow="Cadastros · Funcionários" title="Acesso administrativo necessário" description="O diretório de funcionários fica restrito aos perfis autorizados no escopo atual." />
        <FeedbackMessage tone="attention">Seu perfil não possui permissão para consultar este cadastro.</FeedbackMessage>
      </div>
    );
  }

  const employeeId = params.id as EntityId;
  const employee = workspace.employees.find((candidate) => candidate.id === employeeId);

  if (!employee) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader eyebrow="Cadastros · Funcionários" title="Funcionário não encontrado" description="O registro pode estar fora do escopo administrativo atual ou o endereço pode estar incorreto." />
        <EmptyState
          title="Não foi possível abrir este funcionário"
          description="Volte para a lista para localizar um registro disponível no seu escopo."
          action={<Link href="/workspace/funcionarios" className={buttonClasses()}>Voltar para funcionários</Link>}
        />
      </div>
    );
  }

  const unitName = employee.defaultUnitId
    ? workspace.units.find((unit) => unit.id === employee.defaultUnitId)?.name ?? "Unidade indisponível"
    : "Toda a organização";
  const sectorName = employee.defaultSectorId
    ? workspace.sectors.find((sector) => sector.id === employee.defaultSectorId)?.name ?? "Setor indisponível"
    : "Sem setor padrão";

  if (editing) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          eyebrow="Cadastros · Funcionários"
          title={employee.name}
          description="Atualize os dados operacionais. O vínculo de acesso existente será preservado."
          actions={<button type="button" className={buttonClasses()} onClick={() => setEditing(false)}>Voltar ao detalhe</button>}
        />
        <EmployeeForm
          employee={employee}
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
        eyebrow="Cadastros · Funcionários"
        title={employee.name}
        description={employee.code ? `Código operacional: ${employee.code}` : "Sem código operacional"}
        actions={(
          <>
            <Link href="/workspace/funcionarios" className={buttonClasses()}>Voltar para funcionários</Link>
            <Button type="button" variant="primary" onClick={() => setEditing(true)}>Editar funcionário</Button>
          </>
        )}
      />

      {updated && <FeedbackMessage tone="success">Funcionário atualizado com sucesso.</FeedbackMessage>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel as="section" className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Dados operacionais</h2>
              <p className="mt-1 text-sm text-neutral-600">Identificação usada nas rotinas internas.</p>
            </div>
            <StatusBadge tone={employee.active ? "success" : "neutral"}>{employee.active ? "Ativo" : "Inativo"}</StatusBadge>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Nome</dt><dd className="mt-1 text-sm text-neutral-900">{employee.name}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Código</dt><dd className="mt-1 text-sm text-neutral-900">{employee.code ?? "Não informado"}</dd></div>
          </dl>
        </Panel>

        <Panel as="section" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Escopo operacional padrão</h2>
            <p className="mt-1 text-sm text-neutral-600">Unidade e setor usados como referência no cadastro do funcionário.</p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Unidade</dt><dd className="mt-1 text-sm text-neutral-900">{unitName}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Setor</dt><dd className="mt-1 text-sm text-neutral-900">{sectorName}</dd></div>
          </dl>
        </Panel>
      </div>

      <Panel as="section" tone="info" className="space-y-2">
        <h2 className="font-semibold">Acesso ao sistema</h2>
        <p className="text-sm leading-6">
          {employee.linkedUserId ? "Este funcionário possui uma identidade de acesso vinculada." : "Este funcionário não possui login vinculado."}
          {" "}Login, papéis e permissões são administrados separadamente em Administração → Usuários e permissões.
        </p>
      </Panel>
    </div>
  );
}
