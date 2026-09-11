"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Button,
  EmptyState,
  FeedbackMessage,
  FormField,
  Input,
  PageHeader,
  Panel,
  StatusBadge,
  Textarea,
} from "@/components/ui";
import { EntityId } from "@/domain/common/entity-id";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { SupabaseStockLoanGateway } from "@/modules/inventory/adapters/supabase-stock-loan-gateway";
import { StockLoanService } from "@/modules/inventory/application/stock-loan-service";
import {
  RuntimeStockLoan,
  RuntimeStockLoanRestitution,
  StockLoanStatus,
} from "@/modules/inventory/domain/stock-loan";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function StockLoanDetailPage() {
  const params = useParams<{ loanId: string }>();
  const loanId = params.loanId as EntityId;
  const workspace = useRuntimeWorkspace();
  const organizationId = workspace.organizationId;
  const errorMessage = workspace.errorMessage;
  const client = useMemo(() => createBrowserSupabaseClient(), []);
  const service = useMemo(() => new StockLoanService(new SupabaseStockLoanGateway(client)), [client]);
  const [loan, setLoan] = useState<RuntimeStockLoan | null>(null);
  const [restitutions, setRestitutions] = useState<readonly RuntimeStockLoanRestitution[]>([]);
  const [physicalQuantity, setPhysicalQuantity] = useState("");
  const [monetaryAmount, setMonetaryAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const itemName = loan ? workspace.stockItems.find((item) => item.id === loan.stockItemId)?.name : undefined;
  const itemUnit = loan ? workspace.stockItems.find((item) => item.id === loan.stockItemId)?.baseUnitCode : undefined;
  const locationName = loan ? workspace.stockLocations.find((location) => location.id === loan.sourceLocationId) : undefined;

  async function reload() {
    const [nextLoan, nextRestitutions] = await Promise.all([
      service.findById(organizationId, loanId),
      service.listRestitutions(organizationId, loanId),
    ]);
    setLoan(nextLoan);
    setRestitutions(nextRestitutions);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      service.findById(organizationId, loanId),
      service.listRestitutions(organizationId, loanId),
    ])
      .then(([nextLoan, nextRestitutions]) => {
        if (cancelled) return;
        setLoan(nextLoan);
        setRestitutions(nextRestitutions);
      })
      .catch((error) => { if (!cancelled) setFeedback({ tone: "danger", text: errorMessage(error) }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [errorMessage, loanId, organizationId, service]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loan) return;

    setSaving(true);
    setFeedback(null);
    try {
      const result = await service.recordRestitution({
        organizationId,
        stockLoanId: loan.id,
        physicalQuantity: physicalQuantity || undefined,
        monetaryAmount: monetaryAmount || undefined,
        notes: notes || undefined,
      });
      await reload();
      setPhysicalQuantity("");
      setMonetaryAmount("");
      setNotes("");
      setFeedback({
        tone: "success",
        text: result.loanStatus === "settled"
          ? "Restituição registrada. A obrigação em valor deste empréstimo está liquidada."
          : "Restituição registrada. Os saldos pendentes foram atualizados.",
      });
    } catch (error) {
      setFeedback({ tone: "danger", text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl"><Panel><p className="text-sm text-neutral-600">Carregando empréstimo...</p></Panel></div>;
  }

  if (!loan) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        {feedback && <FeedbackMessage tone={feedback.tone}>{feedback.text}</FeedbackMessage>}
        <EmptyState
          title="Empréstimo não encontrado"
          description="O registro pode não existir ou pode estar fora do seu escopo de acesso."
          action={<Link href="/workspace/emprestimos" className="font-semibold underline-offset-4 hover:underline">Voltar para empréstimos</Link>}
        />
      </div>
    );
  }

  const canRestitute = workspace.permissions.recordStockWithdrawal && loan.status !== "settled";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div><Link href="/workspace/emprestimos" className="text-sm font-semibold text-neutral-600 underline-offset-4 hover:text-neutral-950 hover:underline">← Empréstimos</Link></div>
      <PageHeader
        eyebrow="Estoque · Empréstimo"
        title={loan.counterparty}
        description={`${itemName ?? "Item indisponível"} · ${locationName ? `${locationName.unitName} — ${locationName.name}` : "Local indisponível"}`}
      />

      {feedback && <FeedbackMessage tone={feedback.tone}>{feedback.text}</FeedbackMessage>}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumo do empréstimo">
        <Panel padding="sm"><Summary label="Situação" valueNode={<LoanStatus status={loan.status} />} /></Panel>
        <Panel padding="sm"><Summary label="Quantidade original" value={`${loan.originalQuantity.toDecimal()} ${itemUnit ?? ""}`} /></Panel>
        <Panel padding="sm" tone={loan.remainingPhysicalQuantity.isPositive() ? "attention" : "success"}><Summary label="Ainda fora do estoque" value={`${loan.remainingPhysicalQuantity.toDecimal()} ${itemUnit ?? ""}`} /></Panel>
        <Panel padding="sm" tone={loan.remainingValue.cents > 0 ? "attention" : "success"}><Summary label="Valor ainda pendente" value={formatMoney(loan.remainingValue)} /></Panel>
      </section>

      <Panel>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Summary label="Valor histórico original" value={formatMoney(loan.originalValue)} />
          <Summary label="Valor devolvido em mercadoria" value={formatMoney(loan.physicalReturnedValue)} />
          <Summary label="Restituído em dinheiro" value={formatMoney(loan.monetarySettledAmount)} />
          <Summary label="Data do empréstimo" value={formatDateTime(loan.loanedAt)} />
        </div>
        {loan.notes && <div className="mt-5 border-t border-neutral-200 pt-4"><p className="text-xs font-medium text-neutral-500">Observação original</p><p className="mt-1 text-sm leading-6">{loan.notes}</p></div>}
      </Panel>

      <Panel tone="info">
        <h2 className="font-semibold">Como os dois saldos funcionam</h2>
        <p className="mt-2 text-sm leading-6">
          “Ainda fora do estoque” mostra a quantidade física que não voltou. “Valor ainda pendente” mostra a obrigação econômica restante pelo custo histórico das mercadorias emprestadas. Uma restituição em dinheiro reduz apenas o valor pendente e não cria uma entrada fictícia de estoque.
        </p>
      </Panel>

      {canRestitute ? (
        <Panel>
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Registrar restituição</h2>
            <p className="mt-1 text-sm leading-6 text-neutral-600">Preencha a quantidade física, o valor restituído ou ambos na mesma operação.</p>
          </div>
          <form onSubmit={submit} className="grid gap-5 lg:grid-cols-2">
            <FormField id="loan-return-quantity" label="Mercadoria devolvida" hint={`Máximo físico disponível: ${loan.remainingPhysicalQuantity.toDecimal()} ${itemUnit ?? ""}.`}>
              {(props) => (
                <Input
                  {...props}
                  inputMode="decimal"
                  step="0.001"
                  min="0"
                  max={loan.remainingPhysicalQuantity.toDecimal()}
                  value={physicalQuantity}
                  onChange={(event) => setPhysicalQuantity(event.target.value)}
                  placeholder="0"
                />
              )}
            </FormField>
            <FormField id="loan-return-value" label="Valor restituído" hint={`Valor máximo pendente antes desta operação: ${formatMoney(loan.remainingValue)}.`}>
              {(props) => (
                <Input
                  {...props}
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={monetaryAmount}
                  onChange={(event) => setMonetaryAmount(event.target.value)}
                  placeholder="0,00"
                />
              )}
            </FormField>
            <FormField id="loan-return-notes" label="Observação" className="lg:col-span-2">
              {(props) => <Textarea {...props} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />}
            </FormField>
            <div className="flex justify-end lg:col-span-2"><Button type="submit" loading={saving} disabled={saving}>Registrar restituição</Button></div>
          </form>
        </Panel>
      ) : loan.status === "settled" ? (
        <Panel tone="success"><h2 className="font-semibold">Empréstimo liquidado</h2><p className="mt-1 text-sm leading-6">A obrigação em valor foi encerrada. O saldo físico acima continua mostrando mercadorias que não retornaram ao estoque, quando a quitação ocorreu em dinheiro.</p></Panel>
      ) : (
        <Panel tone="attention"><h2 className="font-semibold">Restituição indisponível para este perfil</h2><p className="mt-1 text-sm leading-6">Você pode consultar este empréstimo, mas não possui permissão para movimentar o estoque relacionado.</p></Panel>
      )}

      <section className="space-y-3">
        <div><h2 className="text-xl font-semibold">Histórico de restituições</h2><p className="text-sm text-neutral-600">Cada acerto permanece ligado ao empréstimo original.</p></div>
        {restitutions.length === 0 ? (
          <EmptyState title="Nenhuma restituição registrada" description="Devoluções em mercadoria e acertos em valor aparecerão aqui." />
        ) : (
          <div className="space-y-3">
            {restitutions.map((restitution) => (
              <Panel key={restitution.id} padding="sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">{restitutionLabel(restitution, itemUnit)}</p>
                    <p className="mt-1 text-xs text-neutral-500">{formatDateTime(restitution.occurredAt)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm sm:text-right">
                    <Summary label="Físico após" value={`${restitution.remainingPhysicalQuantityAfter.toDecimal()} ${itemUnit ?? ""}`} />
                    <Summary label="Valor após" value={formatMoney(restitution.remainingValueAfter)} />
                  </div>
                </div>
                {restitution.notes && <p className="mt-3 border-t border-neutral-200 pt-3 text-sm text-neutral-600">{restitution.notes}</p>}
              </Panel>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LoanStatus({ status }: { status: StockLoanStatus }) {
  if (status === "settled") return <StatusBadge tone="success">Liquidado</StatusBadge>;
  if (status === "partial") return <StatusBadge tone="attention">Parcialmente restituído</StatusBadge>;
  return <StatusBadge tone="info">Aberto</StatusBadge>;
}

function Summary({ label, value, valueNode }: { label: string; value?: string; valueNode?: React.ReactNode }) {
  return <div><p className="text-xs font-medium text-neutral-500">{label}</p><div className="mt-1 font-semibold">{valueNode ?? value}</div></div>;
}

function restitutionLabel(restitution: RuntimeStockLoanRestitution, itemUnit?: string) {
  const parts: string[] = [];
  if (restitution.physicalQuantity.isPositive()) {
    parts.push(`${restitution.physicalQuantity.toDecimal()} ${itemUnit ?? ""} devolvido (${formatMoney(restitution.physicalValue)})`);
  }
  if (restitution.monetaryAmount.cents > 0) parts.push(`${formatMoney(restitution.monetaryAmount)} restituído em valor`);
  return parts.join(" + ");
}

function formatMoney(value: { toDecimal(): string }) {
  return currency.format(Number(value.toDecimal()));
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}
