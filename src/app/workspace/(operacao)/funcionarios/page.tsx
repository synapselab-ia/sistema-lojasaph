"use client";

import { FormEvent, useMemo, useState } from "react";
import { asEntityId, EntityId } from "@/domain/common/entity-id";
import { Employee } from "@/modules/employees/domain/employee";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

interface EmployeeFormState {
  name: string;
  code: string;
  active: boolean;
  defaultUnitId: string;
  defaultSectorId: string;
  linkedUserId: string;
}

const emptyEmployee = (): EmployeeFormState => ({
  name: "",
  code: "",
  active: true,
  defaultUnitId: "",
  defaultSectorId: "",
  linkedUserId: "",
});

export default function EmployeesPage() {
  const workspace = useRuntimeWorkspace();
  const [editingId, setEditingId] = useState<EntityId | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(emptyEmployee());
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const availableSectors = useMemo(
    () => workspace.sectors.filter((sector) => !form.defaultUnitId || sector.unitId === form.defaultUnitId),
    [form.defaultUnitId, workspace.sectors],
  );

  function unitName(id?: EntityId): string {
    return id ? workspace.units.find((unit) => unit.id === id)?.name ?? "Unidade indisponível" : "Toda a organização";
  }

  function sectorName(id?: EntityId): string | undefined {
    return id ? workspace.sectors.find((sector) => sector.id === id)?.name ?? "Setor indisponível" : undefined;
  }

  function startEdit(employee: Employee) {
    setEditingId(employee.id);
    setForm({
      name: employee.name,
      code: employee.code ?? "",
      active: employee.active,
      defaultUnitId: employee.defaultUnitId ?? "",
      defaultSectorId: employee.defaultSectorId ?? "",
      // O vínculo é preservado internamente; sua manutenção pertence a Usuários e permissões.
      linkedUserId: employee.linkedUserId ?? "",
    });
    setMessage(null);
  }

  function reset() {
    setEditingId(null);
    setForm(emptyEmployee());
  }

  function changeUnit(value: string) {
    const selectedSector = workspace.sectors.find((sector) => sector.id === form.defaultSectorId);
    setForm({
      ...form,
      defaultUnitId: value,
      defaultSectorId: selectedSector && selectedSector.unitId !== value ? "" : form.defaultSectorId,
    });
  }

  function changeSector(value: string) {
    const sector = workspace.sectors.find((candidate) => candidate.id === value);
    setForm({
      ...form,
      defaultSectorId: value,
      defaultUnitId: sector ? sector.unitId : form.defaultUnitId,
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        name: form.name,
        code: form.code || undefined,
        active: form.active,
        defaultUnitId: form.defaultUnitId ? asEntityId(form.defaultUnitId) : undefined,
        defaultSectorId: form.defaultSectorId ? asEntityId(form.defaultSectorId) : undefined,
        linkedUserId: form.linkedUserId ? asEntityId(form.linkedUserId) : undefined,
      };
      if (editingId) {
        await workspace.updateEmployee(editingId, payload);
        setMessage("Funcionário atualizado no banco.");
      } else {
        await workspace.createEmployee(payload);
        setMessage("Funcionário criado no banco.");
      }
      reset();
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (!workspace.permissions.manageEmployees) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-sm font-medium text-emerald-700">Administração</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Funcionários</h1>
        </header>
        <section className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm leading-6 text-neutral-600 shadow-sm">
          <h2 className="font-semibold text-neutral-900">Acesso administrativo necessário</h2>
          <p className="mt-2">O diretório de funcionários pode conter vínculo com uma identidade autenticada e fica restrito a owner, admin ou manager dentro do escopo autorizado.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header>
        <p className="text-sm font-medium text-emerald-700">Administração — cadastro persistente</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Funcionários</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
          Funcionário é uma identidade operacional separada do login. O cadastro desta tela não concede acesso ao sistema; o vínculo com uma identidade autenticada é administrado separadamente em Usuários e permissões.
        </p>
      </header>

      {message && <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">{message}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-3">
          {workspace.employees.map((employee) => {
            const sector = sectorName(employee.defaultSectorId);
            return (
              <article key={employee.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{employee.name}</h2>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${employee.active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                        {employee.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">{employee.code ? `Código: ${employee.code}` : "Sem código operacional"}</p>
                  </div>
                  <button type="button" onClick={() => startEdit(employee)} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50">
                    Editar
                  </button>
                </div>
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-xl bg-neutral-50 p-3">
                    <p className="text-xs text-neutral-500">Escopo operacional padrão</p>
                    <p className="mt-1 font-medium">{unitName(employee.defaultUnitId)}{sector ? ` · ${sector}` : ""}</p>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-3">
                    <p className="text-xs text-neutral-500">Identidade de acesso</p>
                    <p className="mt-1 font-medium">{employee.linkedUserId ? "Identidade vinculada" : "Sem login vinculado"}</p>
                  </div>
                </div>
              </article>
            );
          })}
          {workspace.employees.length === 0 && (
            <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">Nenhum funcionário cadastrado no escopo administrativo disponível.</p>
          )}
        </section>

        <form onSubmit={submit} className="h-fit space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">{editingId ? "Editar funcionário" : "Novo funcionário"}</h2>
            <p className="mt-1 text-xs leading-5 text-neutral-500">O RLS valida novamente papel e escopo. Identidades de login não são editadas neste cadastro.</p>
          </div>

          <label className="block text-sm font-medium">
            Nome
            <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" />
          </label>

          <label className="block text-sm font-medium">
            Código operacional (opcional)
            <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" />
          </label>

          <label className="block text-sm font-medium">
            Unidade padrão
            <select
              required={!workspace.permissions.manageEmployeesOrganizationWide}
              value={form.defaultUnitId}
              onChange={(event) => changeUnit(event.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal"
            >
              <option value="" disabled={!workspace.permissions.manageEmployeesOrganizationWide}>
                {workspace.permissions.manageEmployeesOrganizationWide ? "Toda a organização" : "Selecione uma unidade"}
              </option>
              {workspace.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
            </select>
          </label>

          <label className="block text-sm font-medium">
            Setor padrão (opcional)
            <select value={form.defaultSectorId} onChange={(event) => changeSector(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal">
              <option value="">Sem setor padrão</option>
              {availableSectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name} · {sector.unitName}</option>)}
            </select>
          </label>

          {editingId && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
              Funcionário ativo
            </label>
          )}

          <div className="flex gap-2">
            <button disabled={saving} type="submit" className="flex-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Salvando..." : editingId ? "Salvar" : "Criar funcionário"}
            </button>
            {editingId && <button type="button" onClick={reset} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm">Cancelar</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
