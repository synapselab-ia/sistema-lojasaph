"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, EmptyState, FeedbackMessage, FormField, PageHeader, Panel, StatusBadge, Textarea } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { EntityId } from "@/domain/common/entity-id";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { FinanceDocumentDetail, SupabaseFinanceDetailGateway } from "@/modules/finance/adapters/supabase-finance-detail-gateway";
import { RuntimePaymentEvent, SupabaseFinanceGateway } from "@/modules/finance/adapters/supabase-finance-gateway";
import { FinanceAttachmentsPanel } from "@/modules/finance/ui/finance-attachments-panel";
import { dateLabel, dateTimeLabel, installmentStatusLabel, moneyLabel, summarizeDocument } from "@/modules/finance/ui/finance-view-model";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

function installmentTone(status: keyof typeof installmentStatusLabel) {
  if (status === "overdue") return "danger" as const;
  if (status === "due_today") return "attention" as const;
  if (status === "paid") return "success" as const;
  return "neutral" as const;
}

export default function FinanceDocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const documentId = params.id as EntityId;
  const workspace = useRuntimeWorkspace();
  const client = useMemo(() => createBrowserSupabaseClient(), []);
  const detailGateway = useMemo(() => new SupabaseFinanceDetailGateway(client), [client]);
  const gateway = useMemo(() => new SupabaseFinanceGateway(client), [client]);
  const [detail, setDetail] = useState<FinanceDocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [reversePayment, setReversePayment] = useState<RuntimePaymentEvent | null>(null);
  const [reverseReason, setReverseReason] = useState("");

  useEffect(() => {
    let active = true;
    void detailGateway
      .getDocument(workspace.organizationId, documentId)
      .then((nextDetail) => {
        if (active) setDetail(nextDetail);
      })
      .catch((cause) => {
        if (active) setMessage({ tone: "danger", text: workspace.errorMessage(cause) });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [detailGateway, documentId, workspace]);

  async function refresh() {
    setDetail(await detailGateway.getDocument(workspace.organizationId, documentId));
  }

  async function cancelDocument() {
    setSaving(true);
    setMessage(null);
    try {
      await gateway.cancelDocument(workspace.organizationId, documentId, cancelReason || undefined);
      await refresh();
      setCancelOpen(false);
      setCancelReason("");
      setMessage({ tone: "success", text: "Documento cancelado com a trilha financeira preservada." });
    } catch (cause) {
      setMessage({ tone: "danger", text: workspace.errorMessage(cause) });
    } finally {
      setSaving(false);
    }
  }

  async function confirmReversal() {
    if (!reversePayment) return;
    setSaving(true);
    setMessage(null);
    try {
      await gateway.reversePayment({
        organizationId: workspace.organizationId,
        paymentId: reversePayment.id,
        reversedAt: new Date().toISOString(),
        reason: reverseReason || undefined,
      });
      await refresh();
      setReversePayment(null);
      setReverseReason("");
      setMessage({ tone: "success", text: "Estorno registrado sem apagar o pagamento original." });
    } catch (cause) {
      setMessage({ tone: "danger", text: workspace.errorMessage(cause) });
    } finally {
      setSaving(false);
    }
  }

  if (loading && !detail) {
    return <div className="mx-auto max-w-6xl"><Panel><p className="text-sm text-neutral-500">Carregando documento...</p></Panel></div>;
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader eyebrow="Financeiro · Contas a pagar" title="Documento não encontrado" description="O documento pode não existir ou não estar disponível no seu escopo atual." />
        {message && <FeedbackMessage tone={message.tone}>{message.text}</FeedbackMessage>}
        <EmptyState title="Não foi possível abrir este documento" description="Volte para a lista para localizar uma conta disponível." action={<Link href="/workspace/financeiro/contas" className={buttonClasses()}>Voltar para contas</Link>} />
      </div>
    );
  }

  const supplier = workspace.suppliers.find((candidate) => candidate.id === detail.document.supplierId);
  const summary = summarizeDocument(detail.document, detail.installments);
  const instructionsByInstallment = new Map(detail.installments.map((installment) => [
    installment.id,
    detail.instructions.filter((instruction) => instruction.installmentId === installment.id),
  ]));
  const installmentById = new Map(detail.installments.map((installment) => [installment.id, installment]));
  const reversedPaymentIds = new Set(detail.payments.flatMap((payment) => payment.eventType === "reversal" && payment.reversesPaymentId ? [payment.reversesPaymentId] : []));
  const canManage = workspace.permissions.manageFinance && detail.document.lifecycleStatus === "active";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Financeiro · Contas a pagar"
        title={supplier?.tradeName ?? "Documento financeiro"}
        description={`${detail.unitName ?? "Unidade indisponível"}${detail.sectorName ? ` · ${detail.sectorName}` : ""}`}
        actions={(
          <>
            <Link href="/workspace/financeiro/contas" className={buttonClasses()}>Voltar para contas</Link>
            {canManage && <Link href={`/workspace/financeiro/contas/${detail.document.id}/pagar`} className={buttonClasses({ variant: "primary" })}>Registrar pagamento</Link>}
            {canManage && <Button type="button" variant="danger" disabled={saving} onClick={() => setCancelOpen(true)}>Cancelar documento</Button>}
          </>
        )}
      />

      {message && <FeedbackMessage tone={message.tone}>{message.text}</FeedbackMessage>}

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel as="section" className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-lg font-semibold">Documento</h2><p className="mt-1 text-sm text-neutral-600">Identificação e contexto da obrigação registrada.</p></div>
            <StatusBadge tone={detail.document.lifecycleStatus === "cancelled" ? "neutral" : "info"}>{detail.document.lifecycleStatus === "cancelled" ? "Cancelado" : "Ativo"}</StatusBadge>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Tipo</dt><dd className="mt-1 text-sm font-medium">{detail.document.documentType}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Número / série</dt><dd className="mt-1 text-sm">{detail.document.documentNumber ?? "Não informado"}{detail.document.series ? ` · ${detail.document.series}` : ""}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Emissão</dt><dd className="mt-1 text-sm">{detail.document.issuedAt ? dateLabel(detail.document.issuedAt) : "Não informada"}</dd></div>
            <div><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Chave / identificador</dt><dd className="mt-1 break-all text-sm">{detail.document.accessKey ?? "Não informado"}</dd></div>
          </dl>
          {detail.document.description && <div className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700"><span className="font-medium">Observação:</span> {detail.document.description}</div>}
        </Panel>

        <Panel as="section" className="space-y-3">
          <h2 className="text-lg font-semibold">Resumo financeiro</h2>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-neutral-500">Nominal</dt><dd className="mt-1 text-xl font-semibold">{moneyLabel(summary.nominalAmount)}</dd></div>
            <div><dt className="text-neutral-500">Pago líquido</dt><dd className="mt-1 font-semibold">{moneyLabel(summary.netPaidAmount)}</dd></div>
            <div><dt className="text-neutral-500">Saldo/diferença</dt><dd className="mt-1 font-semibold">{moneyLabel(summary.balanceAmount)}</dd></div>
          </dl>
          <p className="text-xs leading-5 text-neutral-500">Diferenças entre nominal e pago permanecem explícitas e não são classificadas automaticamente.</p>
        </Panel>
      </div>

      <Panel as="section" padding="none" className="overflow-hidden">
        <div className="p-5"><h2 className="text-lg font-semibold">Parcelas</h2><p className="mt-1 text-sm text-neutral-600">Vencimento e status são derivados dos dados persistidos para cada parcela.</p></div>
        <div className="divide-y divide-neutral-100">
          {detail.installments.map((installment) => {
            const instructions = instructionsByInstallment.get(installment.id) ?? [];
            return (
              <div key={installment.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h3 className="font-semibold">Parcela {installment.installmentNumber}/{installment.installmentCount}</h3><p className="mt-1 text-sm text-neutral-600">Vencimento {dateLabel(installment.dueDate)}</p></div>
                  <StatusBadge tone={installmentTone(installment.paymentStatus)}>{installmentStatusLabel[installment.paymentStatus]}</StatusBadge>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div><dt className="text-xs text-neutral-500">Nominal</dt><dd className="mt-1 font-medium">{moneyLabel(installment.nominalAmount)}</dd></div>
                  <div><dt className="text-xs text-neutral-500">Pago líquido</dt><dd className="mt-1 font-medium">{moneyLabel(installment.netPaidAmount)}</dd></div>
                  <div><dt className="text-xs text-neutral-500">Saldo/diferença</dt><dd className="mt-1 font-medium">{moneyLabel(installment.balanceAmount)}</dd></div>
                </dl>
                {instructions.length > 0 && <div className="mt-4 rounded-xl bg-neutral-50 p-3 text-sm"><p className="font-medium">Referência de pagamento</p>{instructions.map((instruction) => <p key={instruction.id} className="mt-1 break-all text-neutral-600">{instruction.label ? `${instruction.label}: ` : ""}{instruction.rawReference}</p>)}</div>}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel as="section" padding="none" className="overflow-hidden">
        <FinanceAttachmentsPanel organizationId={workspace.organizationId} payableDocumentId={detail.document.id} canUpload={canManage} />
      </Panel>

      <Panel as="section" className="space-y-4">
        <div><h2 className="text-lg font-semibold">Pagamentos e estornos</h2><p className="mt-1 text-sm text-neutral-600">Eventos financeiros permanecem no histórico; estorno não apaga o pagamento original.</p></div>
        {detail.payments.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum pagamento registrado para este documento.</p>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-neutral-200 md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-3 py-2 font-medium">Evento</th><th className="px-3 py-2 font-medium">Parcela</th><th className="px-3 py-2 font-medium">Data</th><th className="px-3 py-2 font-medium">Valor</th><th className="px-3 py-2 font-medium">Referência / observação</th><th className="px-3 py-2 font-medium">Ação</th></tr></thead>
                <tbody className="divide-y divide-neutral-100">
                  {detail.payments.map((payment) => {
                    const installment = installmentById.get(payment.installmentId);
                    const canReverse = canManage && payment.eventType === "payment" && !reversedPaymentIds.has(payment.id);
                    return (
                      <tr key={payment.id}>
                        <td className="px-3 py-2 font-medium">{payment.eventType === "payment" ? "Pagamento" : "Estorno"}</td>
                        <td className="px-3 py-2">{installment ? `${installment.installmentNumber}/${installment.installmentCount}` : "—"}</td>
                        <td className="px-3 py-2">{dateTimeLabel(payment.paidAt)}</td>
                        <td className="px-3 py-2">{moneyLabel(payment.amount)}</td>
                        <td className="max-w-xs px-3 py-2 text-neutral-600">{payment.paymentReference ?? payment.notes ?? "—"}</td>
                        <td className="px-3 py-2">{canReverse ? <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={() => setReversePayment(payment)}>Estornar</Button> : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 md:hidden">
              {detail.payments.map((payment) => {
                const installment = installmentById.get(payment.installmentId);
                const canReverse = canManage && payment.eventType === "payment" && !reversedPaymentIds.has(payment.id);
                return (
                  <div key={payment.id} className="rounded-xl border border-neutral-200 p-4">
                    <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{payment.eventType === "payment" ? "Pagamento" : "Estorno"}</p><p className="mt-1 text-xs text-neutral-500">Parcela {installment ? `${installment.installmentNumber}/${installment.installmentCount}` : "indisponível"} · {dateTimeLabel(payment.paidAt)}</p></div><p className="font-semibold">{moneyLabel(payment.amount)}</p></div>
                    {(payment.paymentReference || payment.notes) && <p className="mt-3 break-words text-sm text-neutral-600">{payment.paymentReference ?? payment.notes}</p>}
                    {canReverse && <div className="mt-3"><Button type="button" variant="secondary" size="sm" disabled={saving} onClick={() => setReversePayment(payment)}>Estornar pagamento</Button></div>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Panel>

      <Dialog
        id="finance-cancel-dialog"
        open={cancelOpen}
        onClose={() => { if (!saving) setCancelOpen(false); }}
        title="Cancelar documento"
        description="O cancelamento preserva o histórico e só é permitido quando não houver pagamento líquido pendente de estorno."
        footer={<><Button type="button" variant="secondary" disabled={saving} onClick={() => setCancelOpen(false)}>Voltar</Button><Button type="button" variant="danger" loading={saving} onClick={() => void cancelDocument()}>Confirmar cancelamento</Button></>}
      >
        <FormField id="finance-cancel-reason" label="Motivo (opcional)">
          {(field) => <Textarea {...field} rows={3} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Registre um motivo quando for útil para a auditoria." />}
        </FormField>
      </Dialog>

      <Dialog
        id="finance-reversal-dialog"
        open={reversePayment !== null}
        onClose={() => { if (!saving) { setReversePayment(null); setReverseReason(""); } }}
        title="Estornar pagamento"
        description={reversePayment ? `Será criado um evento de estorno de ${moneyLabel(reversePayment.amount)}. O pagamento original continuará no histórico.` : undefined}
        footer={<><Button type="button" variant="secondary" disabled={saving} onClick={() => { setReversePayment(null); setReverseReason(""); }}>Voltar</Button><Button type="button" variant="danger" loading={saving} onClick={() => void confirmReversal()}>Confirmar estorno</Button></>}
      >
        <FormField id="finance-reversal-reason" label="Motivo (opcional)">
          {(field) => <Textarea {...field} rows={3} value={reverseReason} onChange={(event) => setReverseReason(event.target.value)} placeholder="Registre o motivo quando for útil para o histórico." />}
        </FormField>
      </Dialog>
    </div>
  );
}
