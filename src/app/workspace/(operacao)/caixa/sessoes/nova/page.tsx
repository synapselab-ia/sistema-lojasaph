"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, FeedbackMessage, FormField, Input, PageHeader, Panel, Select, Textarea } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { EntityId } from "@/domain/common/entity-id";
import { useCashState } from "@/modules/cash/ui/use-cash-state";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

export default function NewCashSessionPage() {
  const workspace = useRuntimeWorkspace();
  const router = useRouter();
  const { gateway, state, loading, error } = useCashState(workspace.organizationId);
  const [registerId, setRegisterId] = useState("");
  const [businessDate, setBusinessDate] = useState("");
  const [sequence, setSequence] = useState("1");
  const [openingFloat, setOpeningFloat] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace.permissions.operateCash) return;
    setSaving(true);
    setMessage(null);
    try {
      await gateway.openSession({
        organizationId: workspace.organizationId,
        cashRegisterId: registerId as EntityId,
        businessDate,
        sequence: Number(sequence),
        openingFloat,
        notes: notes || undefined,
      });
      router.push("/workspace/caixa/sessoes");
      router.refresh();
    } catch (cause) {
      setMessage(workspace.errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  const activeRegisters = state.registers.filter((register) => register.status === "active");
  const unitById = new Map(state.units.map((unit) => [unit.id, unit.name]));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Caixa · Sessões"
        title="Abrir sessão"
        description="Defina o caixa, a data de negócio, a sequência e o fundo inicial. A sessão passa a ser a fronteira operacional para totais, movimentos e fechamento."
        actions={<Link href="/workspace/caixa/sessoes" className={buttonClasses()}>Voltar para sessões</Link>}
      />

      {error && <FeedbackMessage tone="danger" role="alert">{error}</FeedbackMessage>}
      {message && <FeedbackMessage tone="danger" role="alert">{message}</FeedbackMessage>}
      {!workspace.permissions.operateCash && <FeedbackMessage tone="info">Você pode consultar o Caixa, mas não possui permissão operacional para abrir sessões.</FeedbackMessage>}

      <Panel as="section">
        {loading && activeRegisters.length === 0 ? (
          <p className="text-sm text-neutral-500">Carregando caixas disponíveis...</p>
        ) : activeRegisters.length === 0 ? (
          <FeedbackMessage tone="attention">Não há caixa ativo disponível no seu escopo. A configuração precisa ser feita por um usuário autorizado antes da abertura.</FeedbackMessage>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <FormField id="cash-open-register" label="Caixa">
              {(field) => <Select {...field} required value={registerId} onChange={(event) => setRegisterId(event.target.value)}><option value="">Selecione</option>{activeRegisters.map((register) => <option key={register.id} value={register.id}>{register.name} · {unitById.get(register.unitId) ?? "Unidade indisponível"}</option>)}</Select>}
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField id="cash-open-date" label="Data de negócio" hint="A data é explícita e não depende do mês atual.">
                {(field) => <Input {...field} required type="date" value={businessDate} onChange={(event) => setBusinessDate(event.target.value)} />}
              </FormField>
              <FormField id="cash-open-sequence" label="Sequência">
                {(field) => <Input {...field} required type="number" min={1} step={1} value={sequence} onChange={(event) => setSequence(event.target.value)} />}
              </FormField>
              <FormField id="cash-open-float" label="Fundo inicial (R$)">
                {(field) => <Input {...field} required inputMode="decimal" value={openingFloat} onChange={(event) => setOpeningFloat(event.target.value)} placeholder="0,00" />}
              </FormField>
            </div>
            <FormField id="cash-open-notes" label="Observação (opcional)">
              {(field) => <Textarea {...field} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ex.: turno, responsável ou contexto operacional." />}
            </FormField>
            <div className="flex flex-wrap justify-end gap-3"><Link href="/workspace/caixa/sessoes" className={buttonClasses()}>Cancelar</Link><Button type="submit" variant="primary" loading={saving} disabled={!workspace.permissions.operateCash}>Abrir sessão</Button></div>
          </form>
        )}
      </Panel>
    </div>
  );
}
