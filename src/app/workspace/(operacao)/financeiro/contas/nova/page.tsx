"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, FeedbackMessage, FormField, Input, PageHeader, Panel, Select, Textarea } from "@/components/ui";
import { EntityId } from "@/domain/common/entity-id";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";
import { useFinanceState } from "@/modules/finance/ui/use-finance-state";

type InstallmentDraft = {
  key: string;
  amount: string;
  dueDate: string;
  paymentReference: string;
  paymentLabel: string;
};

function newInstallment(key: string): InstallmentDraft {
  return { key, amount: "", dueDate: "", paymentReference: "", paymentLabel: "" };
}

export default function NewFinanceDocumentPage() {
  const router = useRouter();
  const workspace = useRuntimeWorkspace();
  const { gateway, state, loading, error } = useFinanceState(workspace.organizationId);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [documentType, setDocumentType] = useState("supplier_document");
  const [documentNumber, setDocumentNumber] = useState("");
  const [series, setSeries] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [description, setDescription] = useState("");
  const [installments, setInstallments] = useState<InstallmentDraft[]>([newInstallment("initial")]);

  const sectorsForUnit = useMemo(
    () => state.sectors.filter((sector) => sector.unitId === unitId),
    [state.sectors, unitId],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const documentId = await gateway.createDocument({
        organizationId: workspace.organizationId,
        unitId: unitId as EntityId,
        sectorId: sectorId ? sectorId as EntityId : undefined,
        supplierId: supplierId as EntityId,
        documentType,
        documentNumber: documentNumber || undefined,
        series: series || undefined,
        accessKey: accessKey || undefined,
        issuedAt: issuedAt || undefined,
        description: description || undefined,
        installments: installments.map((installment) => ({
          amount: installment.amount,
          dueDate: installment.dueDate,
          paymentReference: installment.paymentReference || undefined,
          paymentLabel: installment.paymentLabel || undefined,
        })),
      });
      router.push(`/workspace/financeiro/contas/${documentId}`);
    } catch (cause) {
      setMessage(workspace.errorMessage(cause));
      setSaving(false);
    }
  }

  if (!workspace.permissions.manageFinance) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader eyebrow="Financeiro" title="Novo documento" description="Seu acesso atual permite consulta, mas não registro de documentos financeiros." />
        <FeedbackMessage tone="attention">Você não possui permissão para esta ação.</FeedbackMessage>
        <Link href="/workspace/financeiro/contas" className="text-sm font-semibold underline">Voltar para contas a pagar</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Financeiro · Contas a pagar"
        title="Novo documento"
        description="Registre a obrigação e suas parcelas. O total nominal é calculado pelo conjunto de parcelas; referências de pagamento ficam separadas dos pagamentos executados."
        actions={<Link href="/workspace/financeiro/contas" className="inline-flex min-h-11 items-center rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold">Cancelar</Link>}
      />

      {(error || message) && <FeedbackMessage tone="danger" role="alert">{message ?? error}</FeedbackMessage>}

      <Panel as="section">
        <h2 className="text-lg font-semibold">Identificação</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <FormField id="supplier" label="Fornecedor" required>
            {(field) => (
              <Select {...field} required value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                <option value="">Selecione</option>
                {workspace.suppliers.filter((supplier) => supplier.active).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.tradeName}</option>)}
              </Select>
            )}
          </FormField>
          <FormField id="unit" label="Unidade" required>
            {(field) => (
              <Select {...field} required value={unitId} disabled={loading} onChange={(event) => { setUnitId(event.target.value); setSectorId(""); }}>
                <option value="">Selecione</option>
                {state.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
              </Select>
            )}
          </FormField>
          <FormField id="sector" label="Setor" hint="Opcional. Quando informado, deve pertencer à unidade selecionada.">
            {(field) => (
              <Select {...field} value={sectorId} disabled={!unitId} onChange={(event) => setSectorId(event.target.value)}>
                <option value="">Sem setor específico</option>
                {sectorsForUnit.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
              </Select>
            )}
          </FormField>
          <FormField id="document-type" label="Tipo do documento" required>
            {(field) => <Input {...field} required value={documentType} onChange={(event) => setDocumentType(event.target.value)} />}
          </FormField>
          <FormField id="document-number" label="Número">
            {(field) => <Input {...field} value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} />}
          </FormField>
          <FormField id="series" label="Série">
            {(field) => <Input {...field} value={series} onChange={(event) => setSeries(event.target.value)} />}
          </FormField>
          <FormField id="issued-at" label="Data de emissão">
            {(field) => <Input {...field} type="date" value={issuedAt} onChange={(event) => setIssuedAt(event.target.value)} />}
          </FormField>
          <FormField id="access-key" label="Chave / identificador">
            {(field) => <Input {...field} value={accessKey} onChange={(event) => setAccessKey(event.target.value)} />}
          </FormField>
        </div>
        <div className="mt-4">
          <FormField id="description" label="Descrição / observação">
            {(field) => <Textarea {...field} value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />}
          </FormField>
        </div>
      </Panel>

      <Panel as="section">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Parcelas</h2>
            <p className="mt-1 text-sm text-neutral-500">A ordem abaixo define 1/N, 2/N e assim por diante. Valores não são redistribuídos automaticamente.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setInstallments((current) => [...current, newInstallment(`${Date.now()}-${current.length}`)])}>Adicionar parcela</Button>
        </div>

        <div className="mt-5 space-y-4">
          {installments.map((installment, index) => (
            <div key={installment.key} className="rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">Parcela {index + 1}/{installments.length}</h3>
                <Button type="button" variant="ghost" size="sm" disabled={installments.length === 1} onClick={() => setInstallments((current) => current.filter((item) => item.key !== installment.key))}>Remover</Button>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <FormField id={`amount-${installment.key}`} label="Valor" required>
                  {(field) => <Input {...field} required inputMode="decimal" value={installment.amount} onChange={(event) => setInstallments((current) => current.map((item) => item.key === installment.key ? { ...item, amount: event.target.value } : item))} />}
                </FormField>
                <FormField id={`due-${installment.key}`} label="Vencimento" required>
                  {(field) => <Input {...field} required type="date" value={installment.dueDate} onChange={(event) => setInstallments((current) => current.map((item) => item.key === installment.key ? { ...item, dueDate: event.target.value } : item))} />}
                </FormField>
                <FormField id={`reference-${installment.key}`} label="Referência de pagamento" hint="Linha, código, chave ou instrução registrada para esta parcela.">
                  {(field) => <Input {...field} value={installment.paymentReference} onChange={(event) => setInstallments((current) => current.map((item) => item.key === installment.key ? { ...item, paymentReference: event.target.value } : item))} />}
                </FormField>
                <FormField id={`label-${installment.key}`} label="Rótulo da referência">
                  {(field) => <Input {...field} value={installment.paymentLabel} onChange={(event) => setInstallments((current) => current.map((item) => item.key === installment.key ? { ...item, paymentLabel: event.target.value } : item))} />}
                </FormField>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex flex-wrap justify-end gap-3">
        <Link href="/workspace/financeiro/contas" className="inline-flex min-h-11 items-center rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold">Cancelar</Link>
        <Button type="submit" loading={saving}>{saving ? "Registrando..." : "Registrar documento"}</Button>
      </div>
    </form>
  );
}
