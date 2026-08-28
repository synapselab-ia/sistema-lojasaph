"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FeedbackMessage, PageHeader, Panel } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { EmployeeForm } from "@/modules/employees/ui/employee-form";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

export default function NewEmployeePage() {
  const router = useRouter();
  const workspace = useRuntimeWorkspace();
  const [created, setCreated] = useState(false);

  if (!workspace.permissions.manageEmployees) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader eyebrow="Cadastros · Funcionários" title="Novo funcionário" description="O cadastro de funcionários exige acesso administrativo no escopo atual." />
        <FeedbackMessage tone="attention">Seu perfil não possui permissão para manter funcionários neste escopo.</FeedbackMessage>
      </div>
    );
  }

  if (created) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader eyebrow="Cadastros · Funcionários" title="Funcionário cadastrado" description="O registro operacional foi criado. Isso não concede login nem permissões ao sistema." />
        <FeedbackMessage tone="success">Funcionário criado com sucesso.</FeedbackMessage>
        <Panel as="section" className="flex flex-col gap-3 sm:flex-row">
          <Link href="/workspace/funcionarios" className={buttonClasses({ variant: "primary" })}>Voltar para funcionários</Link>
          <button type="button" className={buttonClasses()} onClick={() => setCreated(false)}>Cadastrar outro funcionário</button>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Cadastros · Funcionários"
        title="Novo funcionário"
        description="Cadastre a identidade operacional e o escopo padrão. Login e permissões continuam separados em Administração."
        actions={<Link href="/workspace/funcionarios" className={buttonClasses()}>Voltar para funcionários</Link>}
      />
      <EmployeeForm onSaved={() => setCreated(true)} onCancel={() => router.push("/workspace/funcionarios")} />
    </div>
  );
}
