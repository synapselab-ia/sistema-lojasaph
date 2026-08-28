"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button, FeedbackMessage, FormField, Input, Panel, Select } from "@/components/ui";
import { asEntityId } from "@/domain/common/entity-id";
import { Employee } from "@/modules/employees/domain/employee";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

interface EmployeeFormState {
  name: string;
  code: string;
  active: boolean;
  defaultUnitId: string;
  defaultSectorId: string;
}

function initialForm(employee?: Employee): EmployeeFormState {
  return {
    name: employee?.name ?? "",
    code: employee?.code ?? "",
    active: employee?.active ?? true,
    defaultUnitId: employee?.defaultUnitId ?? "",
    defaultSectorId: employee?.defaultSectorId ?? "",
  };
}

export function EmployeeForm({
  employee,
  onSaved,
  onCancel,
}: {
  employee?: Employee;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const workspace = useRuntimeWorkspace();
  const [form, setForm] = useState<EmployeeFormState>(() => initialForm(employee));
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(employee);

  const availableSectors = useMemo(
    () => workspace.sectors.filter((sector) => !form.defaultUnitId || sector.unitId === form.defaultUnitId),
    [form.defaultUnitId, workspace.sectors],
  );

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
        // O vínculo de acesso é preservado internamente; sua manutenção pertence à Administração.
        linkedUserId: employee?.linkedUserId,
      };
      if (employee) await workspace.updateEmployee(employee.id, payload);
      else await workspace.createEmployee(payload);
      onSaved();
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel as="section" className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{editing ? "Editar funcionário" : "Dados do funcionário"}</h2>
        <p className="mt-1 text-sm leading-6 text-neutral-600">Este cadastro mantém dados operacionais. Login e permissões são administrados separadamente.</p>
      </div>

      {message && <FeedbackMessage tone="danger">{message}</FeedbackMessage>}

      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="employee-name" label="Nome" required>
            {(props) => <Input {...props} required autoFocus={!editing} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />}
          </FormField>
          <FormField id="employee-code" label="Código operacional" hint="Opcional.">
            {(props) => <Input {...props} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />}
          </FormField>

          <FormField id="employee-unit" label="Unidade padrão" required={!workspace.permissions.manageEmployeesOrganizationWide}>
            {(props) => (
              <Select
                {...props}
                required={!workspace.permissions.manageEmployeesOrganizationWide}
                value={form.defaultUnitId}
                onChange={(event) => changeUnit(event.target.value)}
              >
                <option value="" disabled={!workspace.permissions.manageEmployeesOrganizationWide}>
                  {workspace.permissions.manageEmployeesOrganizationWide ? "Toda a organização" : "Selecione uma unidade"}
                </option>
                {workspace.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
              </Select>
            )}
          </FormField>

          <FormField id="employee-sector" label="Setor padrão" hint="Opcional.">
            {(props) => (
              <Select {...props} value={form.defaultSectorId} onChange={(event) => changeSector(event.target.value)}>
                <option value="">Sem setor padrão</option>
                {availableSectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name} · {sector.unitName}</option>)}
              </Select>
            )}
          </FormField>

          {editing && (
            <FormField id="employee-status" label="Status">
              {(props) => (
                <Select {...props} value={form.active ? "active" : "inactive"} onChange={(event) => setForm({ ...form, active: event.target.value === "active" })}>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </Select>
              )}
            </FormField>
          )}
        </div>

        {employee?.linkedUserId && (
          <FeedbackMessage tone="info">Este funcionário possui identidade de acesso vinculada. A edição operacional preserva esse vínculo; alterações de acesso pertencem à Administração.</FeedbackMessage>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" variant="primary" loading={saving}>{editing ? "Salvar alterações" : "Criar funcionário"}</Button>
        </div>
      </form>
    </Panel>
  );
}
