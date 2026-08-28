"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button, EmptyState, FeedbackMessage, FormField, Input, PageHeader, Panel, Select, Textarea } from "@/components/ui";
import { buttonClasses } from "@/components/ui/styles";
import { EntityId } from "@/domain/common/entity-id";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { FinanceDocumentDetail, SupabaseFinanceDetailGateway } from "@/modules/finance/adapters/supabase-finance-detail-gateway";
import { SupabaseFinanceGateway } from "@/modules/finance/adapters/supabase-finance-gateway";
import { dateLabel, installmentStatusLabel, moneyLabel } from "@/modules/finance/ui/finance-view-model";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

function toIso(localDateTime: string): string {
  return new Date(localDateTime).toISOString();
}

export default function FinancePaymentPage() {
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
  const [installmentId, setInstallmentId] = useState("");
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let active = true;
    void detailGateway
      .getDocument(workspace.organizationId, documentId)
      .then((nextDetail) => {
        if (!active) return;
        setDetail(nextDetail);
        if (nextDetail) {
          const preferred = nextDetail.installments.find((installment) => installment.paymentStatus !== "paid") ?? nextDetail.installments[0];
          setInstallmentId(preferred?.id ?? "");
        }
      })
      .catch((cause) => {
        if (active) setMessage({ tone: "danger", text: workspace.errorMessage(cause) });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [detailGateway, documentId, workspace]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!installmentId) return;
    setSaving(true);
    setMessage(null);
    try {
      await gateway.recordPayment({
        organizationId: workspace.organizationId,
        installmentId: installmentId as EntityId,
        amount,
        paidAt: toIso(paidAt),
        paymentReference: paymentReference || undefined,
        notes: notes || undefined,
      });
      const nextDetail = await detailGateway.getDocument(workspace.organizationId, documentId);
      setDetail(nextDetail);
      setAmount("");
      setPaidAt("");
      setPaymentReference("");
      setNotes("");
      setMessage({ tone: "success", text: "Pagamento registrado como evento financeiro. O saldo e o status foram recalculados pelos dados persistidos." });
    } catch (cause) {
      setMessage({ tone: "danger", text: workspace.errorMessage(cause) });
    } finally {
      setSaving(false);
    }
  }

  if (loading && !detail) {
    return <div className="mx-auto max-w-4xl"><Panel><p className="text-sm text-neutral-500">Carregando documento...</p></Panel></div>;
  }

  if (!detail) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader eyebrow="Financeiro · Pagamento" title="Documento não encontrado" description="O documento pode não existir ou não estar disponível no seu escopo atual." />
        {message && <FeedbackMessage tone={message.tone}>{message.text}</FeedbackMessage>}
        <EmptyState title="Não foi possível registrar o pagamento" description="Volte para as contas a pagar e abra um documento disponível." action={<Link href="/workspace/financeiro/contas" className={buttonClasses()}>Voltar para contas</Link>} />
      </div>
    );
  }

  const supplier = workspace.suppliers.find((candidate) => candidate.id === detail.document.supplierId);
  const selectedInstallment = detail.installments.find((installment) => installment.id === installmentId);
  const unavailable = !workspace.permissions.manageFinance || detail.document.lifecycleStatus !== "active";

  return (
    <form onSubmit={submit} className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Financeiro · Contas a pagar"
        title="Registrar pagamento"
        description={`${supplier?.tradeName ?? "Fornecedor indisponível"} · ${detail.document.documentNumber ? `Documento ${detail.document.documentNumber}` : detail.document.documentType}`}
        actions={<Link href={`/workspace/financeiro/contas/${detail.document.id}`} className={buttonClasses()}>Voltar ao documento</Link>}
      />

      {message && <FeedbackMessage tone={message.tone}>{message.text}</FeedbackMessage>}
      {unavailable && <FeedbackMessage tone="attention">Este documento não está disponível para novo pagamento com seu acesso ou estado atual.</FeedbackMessage>}

      <Panel as="section">
        <h2 className="text-lg font-semibold">Parcela</h2>
        <p className="mt-1 text-sm leading-6 text-neutral-600">Escolha a parcela que receberá o evento. O sistema preserva diferenças entre valor nominal e valor pago sem classificá-las automaticamente.</p>
        <div className="mt-5">
          <FormField label="Parcela" htmlFor="payment-installment" required>
            {({ id, describedBy }) => (
              <Select id={id} aria-describedby={describedBy} required disabled={unavailable} value={installmentId} onChange={(event) => setInstallmentId(event.target.value)}>
                <option value="">Selecione</option>
                {detail.installments.map((installment) => (
                  <option key={installment.id} value={installment.id}>Parcela {installment.installmentNumber}/{installment.installmentCount} · {dateLabel(installment.dueDate)} · {installmentStatusLabel[installment.paymentStatus]}</option>
                ))}
              </Select>
            )}
          </FormField>
        </div>
        {selectedInstallment && (
          <dl className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-neutral-50 p-4 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-neutral-500">Nominal</dt><dd className="mt-1 font-semibold">{moneyLabel(selectedInstallment.nominalAmount)}</dd></div>
            <div><dt className="text-xs text-neutral-500">Pago líquido</dt><dd className="mt-1 font-semibold">{moneyLabel(selectedInstallment.netPaidAmount)}</dd></div>
            <div><dt className="text-xs text-neutral-500">Saldo/diferença atual</dt><dd className="mt-1 font-semibold">{moneyLabel(selectedInstallment.balanceAmount)}</dd></div>
          </dl>
        )}
      </Panel>

      <Panel as="section">
        <h2 className="text-lg font-semibold">Dados do pagamento</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <FormField label="Valor pago" htmlFor="payment-amount" required>
            {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} required disabled={unavailable} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />}
          </FormField>
          <FormField label="Data e hora" htmlFor="payment-date" required>
            {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} required disabled={unavailable} type="datetime-local" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />}
          </FormField>
          <FormField label="Referência do pagamento" htmlFor="payment-reference" help="Opcional. É a referência do evento executado, separada da instrução cadastrada na parcela.">
            {({ id, describedBy }) => <Input id={id} aria-describedby={describedBy} disabled={unavailable} value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} />}
          </FormField>
          <FormField label="Observação" htmlFor="payment-notes">
            {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} disabled={unavailable} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />}
          </FormField>
        </div>
      </Panel>

      <div className="flex flex-wrap justify-end gap-3">
        <Link href={`/workspace/financeiro/contas/${detail.document.id}`} className={buttonClasses()}>Cancelar</Link>
        <Button type="submit" loading={saving} disabled={unavailable || !installmentId}>{saving ? "Registrando..." : "Registrar pagamento"}</Button>
      </div>
    </form>
  );
}
