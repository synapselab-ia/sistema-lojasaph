"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button, Dialog, EmptyState, FeedbackMessage, FormField, Input, PageHeader, Panel, Select, StatusBadge, Textarea } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { EntityId } from "@/domain/common/entity-id";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { CashSessionDetail, SupabaseCashDetailGateway } from "@/modules/cash/adapters/supabase-cash-detail-gateway";
import { SupabaseCashGateway } from "@/modules/cash/adapters/supabase-cash-gateway";
import { cashMovementTypeLabel, cashSessionStatusLabel, cashSessionStatusTone, dateLabel, dateTimeLabel, drawerGrossTotal, moneyLabel, paymentMethodKindLabel, sessionMovementTotals, sessionTotals } from "@/modules/cash/ui/cash-view-model";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

function toIso(localDateTime: string): string {
  return new Date(localDateTime).toISOString();
}

export default function CashSessionDetailPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id as EntityId;
  const workspace = useRuntimeWorkspace();
  const client = useMemo(() => createBrowserSupabaseClient(), []);
  const detailGateway = useMemo(() => new SupabaseCashDetailGateway(client), [client]);
  const gateway = useMemo(() => new SupabaseCashGateway(client), [client]);
  const [detail, setDetail] = useState<CashSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [methodId, setMethodId] = useState("");
  const [grossAmount, setGrossAmount] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeRuleId, setFeeRuleId] = useState("");
  const [movementType, setMovementType] = useState<"cash_in" | "cash_out">("cash_in");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementAt, setMovementAt] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [countedAmount, setCountedAmount] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    let active = true;
    void detailGateway.getSession(workspace.organizationId, sessionId)
      .then((nextDetail) => { if (active) setDetail(nextDetail); })
      .catch((cause) => { if (active) setMessage({ tone: "danger", text: workspace.errorMessage(cause) }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [detailGateway, sessionId, workspace]);

  async function refresh() {
    setDetail(await detailGateway.getSession(workspace.organizationId, sessionId));
  }

  async function run(key: string, operation: () => Promise<void>, success: string) {
    setSaving(key);
    setMessage(null);
    try {
      await operation();
      await refresh();
      setMessage({ tone: "success", text: success });
    } catch (cause) {
      setMessage({ tone: "danger", text: workspace.errorMessage(cause) });
    } finally {
      setSaving(null);
    }
  }

  async function savePaymentTotal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !methodId || !grossAmount) return;
    await run("total", () => gateway.setPaymentTotal({
      organizationId: workspace.organizationId,
      cashSessionId: detail.session.id,
      paymentMethodId: methodId as EntityId,
      grossAmount,
      feeAmount: feeAmount || undefined,
      feeRuleId: feeRuleId ? feeRuleId as EntityId : undefined,
    }), "Total do meio de pagamento atualizado.");
    setGrossAmount("");
    setFeeAmount("");
    setFeeRuleId("");
  }

  async function saveMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !movementAmount || !movementAt) return;
    await run("movement", () => gateway.recordMovement({
      organizationId: workspace.organizationId,
      cashSessionId: detail.session.id,
      movementType,
      amount: movementAmount,
      occurredAt: toIso(movementAt),
      reason: movementReason || undefined,
    }), movementType === "cash_in" ? "Entrada registrada no caixa." : "Sangria registrada no caixa.");
    setMovementAmount("");
    setMovementAt("");
    setMovementReason("");
  }

  async function closeSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !countedAmount) return;
    await run("close", () => gateway.closeSession({ organizationId: workspace.organizationId, cashSessionId: detail.session.id, countedCashAmount: countedAmount, notes: closeNotes || undefined }), "Sessão fechada com esperado, contado e divergência preservados.");
  }

  async function cancelSession() {
    if (!detail) return;
    await run("cancel", () => gateway.cancelSession({ organizationId: workspace.organizationId, cashSessionId: detail.session.id, reason: cancelReason || undefined }), "Sessão cancelada sem exclusão do histórico.");
    setCancelOpen(false);
    setCancelReason("");
  }

  if (loading && !detail) {
    return <div className="mx-auto max-w-6xl"><Panel><p className="text-sm text-neutral-500">Carregando sessão...</p></Panel></div>;
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader eyebrow="Caixa · Sessões" title="Sessão não encontrada" description="A sessão pode não existir ou não estar disponível no seu escopo atual." />
        {message && <FeedbackMessage tone={message.tone}>{message.text}</FeedbackMessage>}
        <EmptyState title="Não foi possível abrir esta sessão" description="Volte para a lista para localizar uma sessão disponível." action={<Link href="/workspace/caixa/sessoes" className={buttonClasses()}>Voltar para sessões</Link>} />
      </div>
    );
  }

  const canOperate = workspace.permissions.operateCash && detail.session.status === "open";
  const totalsSummary = sessionTotals(detail.session.id, detail.totals);
  const movementSummary = sessionMovementTotals(detail.session.id, detail.movements);
  const drawerGross = drawerGrossTotal(detail.session.id, detail.totals, detail.paymentMethods);
  const methodById = new Map(detail.paymentMethods.map((method) => [method.id, method]));
  const ruleById = new Map(detail.feeRules.map((rule) => [rule.id, rule]));
  const applicableRules = detail.feeRules.filter((rule) => rule.status === "active" && rule.paymentMethodId === methodId && rule.validFrom <= detail.session.businessDate && (!rule.validTo || rule.validTo >= detail.session.businessDate));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Caixa · Sessões"
        title={detail.register.name}
        description={`${detail.unit.name} · ${dateLabel(detail.session.businessDate)} · sessão ${detail.session.sequence}${detail.register.code ? ` · ${detail.register.code}` : ""}`}
        actions={<><Link href="/workspace/caixa/sessoes" className={buttonClasses()}>Voltar para sessões</Link>{canOperate && <Button type="button" variant="danger" disabled={saving !== null} onClick={() => setCancelOpen(true)}>Cancelar sessão</Button>}</>}
      />

      {message && <FeedbackMessage tone={message.tone} role={message.tone === "danger" ? "alert" : undefined}>{message.text}</FeedbackMessage>}
      {!workspace.permissions.operateCash && detail.session.status === "open" && <FeedbackMessage tone="info">Esta sessão está aberta, mas você possui acesso somente de consulta no escopo atual.</FeedbackMessage>}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel as="section" className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Sessão</h2><p className="mt-1 text-sm text-neutral-600">Contexto operacional e valores persistidos da abertura/fechamento.</p></div><StatusBadge tone={cashSessionStatusTone[detail.session.status]}>{cashSessionStatusLabel[detail.session.status]}</StatusBadge></div>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Fundo inicial</dt><dd className="mt-1 text-lg font-semibold">{moneyLabel(detail.session.openingFloat)}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Aberta em</dt><dd className="mt-1 text-sm">{dateTimeLabel(detail.session.openedAt)}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Esperado</dt><dd className="mt-1 text-lg font-semibold">{moneyLabel(detail.session.expectedCashAmount)}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Divergência</dt><dd className="mt-1 text-lg font-semibold">{moneyLabel(detail.session.cashDifference)}</dd></div>
          </dl>
          {detail.session.notes && <div className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700"><span className="font-medium">Observação:</span> {detail.session.notes}</div>}
        </Panel>

        <Panel as="section" className="space-y-3">
          <h2 className="text-lg font-semibold">Composição da gaveta</h2>
          <dl className="space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-neutral-500">Fundo inicial</dt><dd className="font-medium">{moneyLabel(detail.session.openingFloat)}</dd></div><div className="flex justify-between gap-3"><dt className="text-neutral-500">Meios que afetam a gaveta</dt><dd className="font-medium">{moneyLabel(drawerGross)}</dd></div><div className="flex justify-between gap-3"><dt className="text-neutral-500">Entradas</dt><dd className="font-medium">{moneyLabel(movementSummary.cashIn)}</dd></div><div className="flex justify-between gap-3"><dt className="text-neutral-500">Sangrias</dt><dd className="font-medium">− {moneyLabel(movementSummary.cashOut)}</dd></div></dl>
          <p className="text-xs leading-5 text-neutral-500">A composição acima explica os insumos registrados. O valor esperado autoritativo é calculado e persistido pelo backend somente no fechamento.</p>
        </Panel>
      </div>

      <Panel as="section" className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Totais por meio de pagamento</h2><p className="mt-1 text-sm text-neutral-600">Bruto, taxa e líquido permanecem explícitos. Apenas meios configurados para afetar a gaveta participam do esperado físico.</p></div><div className="text-right text-sm"><p>Bruto <strong>{moneyLabel(totalsSummary.gross)}</strong></p><p className="text-neutral-500">Taxas {moneyLabel(totalsSummary.fees)} · líquido {moneyLabel(totalsSummary.net)}</p></div></div>

        {canOperate && <form onSubmit={savePaymentTotal} className="grid gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 md:grid-cols-2 xl:grid-cols-5">
          <FormField id="cash-total-method" label="Meio de pagamento">{(field) => <Select {...field} required value={methodId} onChange={(event) => { setMethodId(event.target.value); setFeeRuleId(""); }}><option value="">Selecione</option>{detail.paymentMethods.filter((method) => method.status === "active").map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</Select>}</FormField>
          <FormField id="cash-total-gross" label="Bruto (R$)">{(field) => <Input {...field} required inputMode="decimal" value={grossAmount} onChange={(event) => setGrossAmount(event.target.value)} placeholder="0,00" />}</FormField>
          <FormField id="cash-total-fee" label="Taxa informada (opcional)" hint="Deixe em branco para usar a regra selecionada, quando aplicável.">{(field) => <Input {...field} inputMode="decimal" value={feeAmount} onChange={(event) => setFeeAmount(event.target.value)} placeholder="0,00" />}</FormField>
          <FormField id="cash-total-rule" label="Regra de taxa (opcional)">{(field) => <Select {...field} value={feeRuleId} onChange={(event) => setFeeRuleId(event.target.value)}><option value="">Sem regra selecionada</option>{applicableRules.map((rule) => <option key={rule.id} value={rule.id}>{rule.label ?? `${rule.percentFee}% + ${moneyLabel(rule.fixedFee)}`}</option>)}</Select>}</FormField>
          <div className="flex items-end"><Button type="submit" variant="primary" block loading={saving === "total"} disabled={saving !== null}>Salvar total</Button></div>
        </form>}

        {detail.totals.length === 0 ? <EmptyState title="Nenhum total registrado" description="Os totais consolidados por meio aparecerão aqui." /> : <><div className="hidden overflow-hidden rounded-xl border border-neutral-200 md:block"><table className="w-full text-left text-sm"><thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-3 py-2 font-medium">Meio</th><th className="px-3 py-2 font-medium">Tipo</th><th className="px-3 py-2 font-medium">Bruto</th><th className="px-3 py-2 font-medium">Taxa</th><th className="px-3 py-2 font-medium">Líquido</th><th className="px-3 py-2 font-medium">Gaveta</th><th className="px-3 py-2 font-medium">Regra</th></tr></thead><tbody className="divide-y divide-neutral-100">{detail.totals.map((total) => { const method = methodById.get(total.paymentMethodId); const rule = total.feeRuleId ? ruleById.get(total.feeRuleId) : undefined; return <tr key={total.id}><td className="px-3 py-2 font-medium">{method?.name ?? "Meio indisponível"}</td><td className="px-3 py-2">{method ? paymentMethodKindLabel[method.methodKind] : "—"}</td><td className="px-3 py-2">{moneyLabel(total.grossAmount)}</td><td className="px-3 py-2">{moneyLabel(total.feeAmount)}</td><td className="px-3 py-2">{moneyLabel(total.netAmount)}</td><td className="px-3 py-2">{method?.affectsCashDrawer ? "Afeta" : "Não afeta"}</td><td className="px-3 py-2">{rule?.label ?? (rule ? `${rule.percentFee}% + ${moneyLabel(rule.fixedFee)}` : "Manual / sem regra")}</td></tr>; })}</tbody></table></div><div className="grid gap-3 md:hidden">{detail.totals.map((total) => { const method = methodById.get(total.paymentMethodId); return <div key={total.id} className="rounded-xl border border-neutral-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{method?.name ?? "Meio indisponível"}</p><p className="mt-1 text-xs text-neutral-500">{method ? paymentMethodKindLabel[method.methodKind] : "Tipo indisponível"} · {method?.affectsCashDrawer ? "afeta a gaveta" : "não afeta a gaveta"}</p></div><p className="font-semibold">{moneyLabel(total.grossAmount)}</p></div><p className="mt-3 text-sm text-neutral-600">Taxa {moneyLabel(total.feeAmount)} · líquido <strong>{moneyLabel(total.netAmount)}</strong></p></div>; })}</div></>}
      </Panel>

      <Panel as="section" className="space-y-5">
        <div><h2 className="text-lg font-semibold">Entradas e sangrias</h2><p className="mt-1 text-sm text-neutral-600">Movimentos são eventos auditáveis. Consumo de funcionários já existente pode aparecer no histórico, mas não é oferecido como nova ação enquanto a regra de negócio permanece pendente.</p></div>
        {canOperate && <form onSubmit={saveMovement} className="grid gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 md:grid-cols-2 xl:grid-cols-5">
          <FormField id="cash-movement-type" label="Movimento">{(field) => <Select {...field} value={movementType} onChange={(event) => setMovementType(event.target.value as "cash_in" | "cash_out")}><option value="cash_in">Entrada</option><option value="cash_out">Sangria</option></Select>}</FormField>
          <FormField id="cash-movement-amount" label="Valor (R$)">{(field) => <Input {...field} required inputMode="decimal" value={movementAmount} onChange={(event) => setMovementAmount(event.target.value)} placeholder="0,00" />}</FormField>
          <FormField id="cash-movement-at" label="Data e hora">{(field) => <Input {...field} required type="datetime-local" value={movementAt} onChange={(event) => setMovementAt(event.target.value)} />}</FormField>
          <FormField id="cash-movement-reason" label="Motivo (opcional)">{(field) => <Input {...field} value={movementReason} onChange={(event) => setMovementReason(event.target.value)} />}</FormField>
          <div className="flex items-end"><Button type="submit" variant="primary" block loading={saving === "movement"} disabled={saving !== null}>Registrar</Button></div>
        </form>}
        {detail.movements.length === 0 ? <EmptyState title="Nenhum movimento registrado" description="Entradas e sangrias desta sessão aparecerão aqui." /> : <div className="grid gap-3 lg:grid-cols-2">{detail.movements.map((movement) => <div key={movement.id} className="rounded-xl border border-neutral-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{cashMovementTypeLabel[movement.movementType]}</p><p className="mt-1 text-xs text-neutral-500">{dateTimeLabel(movement.occurredAt)}</p></div><p className="font-semibold">{moneyLabel(movement.amount)}</p></div>{movement.reason && <p className="mt-3 text-sm text-neutral-600">{movement.reason}</p>}{movement.movementType === "employee_consumption" && <p className="mt-2 text-xs text-neutral-500">Sem impacto automático no caixa esperado; semântica final permanece pendente.</p>}</div>)}</div>}
      </Panel>

      {detail.session.status === "closed" ? (
        <Panel as="section" tone={detail.session.cashDifference && detail.session.cashDifference.cents !== 0 ? "attention" : "neutral"} className="space-y-4"><div><h2 className="text-lg font-semibold">Fechamento</h2><p className="mt-1 text-sm text-neutral-600">Valores finais persistidos pelo backend.</p></div><dl className="grid gap-4 sm:grid-cols-3"><div><dt className="text-sm text-neutral-500">Esperado</dt><dd className="mt-1 text-2xl font-semibold">{moneyLabel(detail.session.expectedCashAmount)}</dd></div><div><dt className="text-sm text-neutral-500">Contado</dt><dd className="mt-1 text-2xl font-semibold">{moneyLabel(detail.session.countedCashAmount)}</dd></div><div><dt className="text-sm text-neutral-500">Divergência</dt><dd className="mt-1 text-2xl font-semibold">{moneyLabel(detail.session.cashDifference)}</dd></div></dl>{detail.session.closedAt && <p className="text-xs text-neutral-500">Fechada em {dateTimeLabel(detail.session.closedAt)}.</p>}</Panel>
      ) : detail.session.status === "cancelled" ? (
        <Panel as="section"><h2 className="text-lg font-semibold">Sessão cancelada</h2><p className="mt-2 text-sm text-neutral-600">O histórico foi preservado e a sessão não aceita novas mutações.</p>{detail.session.cancelledAt && <p className="mt-2 text-xs text-neutral-500">Cancelada em {dateTimeLabel(detail.session.cancelledAt)}.</p>}</Panel>
      ) : canOperate ? (
        <Panel as="section" className="space-y-4"><div><h2 className="text-lg font-semibold">Fechar sessão</h2><p className="mt-1 text-sm text-neutral-600">Informe apenas o dinheiro efetivamente contado. O backend calcula o esperado e persiste a divergência na mesma transação.</p></div><form onSubmit={closeSession} className="grid gap-4 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)_auto]"><FormField id="cash-close-counted" label="Dinheiro contado (R$)">{(field) => <Input {...field} required inputMode="decimal" value={countedAmount} onChange={(event) => setCountedAmount(event.target.value)} placeholder="0,00" />}</FormField><FormField id="cash-close-notes" label="Observação de fechamento (opcional)">{(field) => <Input {...field} value={closeNotes} onChange={(event) => setCloseNotes(event.target.value)} />}</FormField><div className="flex items-end"><Button type="submit" variant="primary" loading={saving === "close"} disabled={saving !== null}>Fechar sessão</Button></div></form></Panel>
      ) : null}

      <Dialog id="cash-cancel-dialog" open={cancelOpen} onClose={() => { if (!saving) setCancelOpen(false); }} title="Cancelar sessão" description="A sessão será marcada como cancelada e o histórico já registrado será preservado." footer={<><Button type="button" variant="secondary" disabled={saving !== null} onClick={() => setCancelOpen(false)}>Voltar</Button><Button type="button" variant="danger" loading={saving === "cancel"} onClick={() => void cancelSession()}>Confirmar cancelamento</Button></>}>
        <FormField id="cash-cancel-reason" label="Motivo (opcional)">{(field) => <Textarea {...field} rows={3} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Registre um motivo quando for útil para a auditoria." />}</FormField>
      </Dialog>
    </div>
  );
}
