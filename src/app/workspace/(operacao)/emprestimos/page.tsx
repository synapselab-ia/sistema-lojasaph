"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Button,
  EmptyState,
  FeedbackMessage,
  FormField,
  Input,
  PageHeader,
  Panel,
  Select,
  StatusBadge,
  Textarea,
} from "@/components/ui";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { SupabaseStockLoanGateway } from "@/modules/inventory/adapters/supabase-stock-loan-gateway";
import { StockLoanService } from "@/modules/inventory/application/stock-loan-service";
import { RuntimeStockLoan, StockLoanStatus } from "@/modules/inventory/domain/stock-loan";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function StockLoansPage() {
  const workspace = useRuntimeWorkspace();
  const client = useMemo(() => createBrowserSupabaseClient(), []);
  const service = useMemo(() => new StockLoanService(new SupabaseStockLoanGateway(client)), [client]);
  const [loans, setLoans] = useState<readonly RuntimeStockLoan[]>([]);
  const [stockItemId, setStockItemId] = useState("");
  const [sourceLocationId, setSourceLocationId] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [quantity, setQuantity] = useState("");
  const [preferredBatchId, setPreferredBatchId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const itemNames = useMemo(
    () => new Map(workspace.stockItems.map((item) => [item.id, item.name])),
    [workspace.stockItems],
  );
  const itemUnits = useMemo(
    () => new Map(workspace.stockItems.map((item) => [item.id, item.baseUnitCode])),
    [workspace.stockItems],
  );
  const locationNames = useMemo(
    () => new Map(workspace.stockLocations.map((location) => [location.id, `${location.unitName} — ${location.name}`])),
    [workspace.stockLocations],
  );
  const eligibleBatches = useMemo(
    () => workspace.batches.filter((batch) =>
      batch.stockItemId === stockItemId
      && batch.stockLocationId === sourceLocationId
      && batch.remainingQuantity.isPositive()),
    [sourceLocationId, stockItemId, workspace.batches],
  );

  async function reloadLoans() {
    setLoans(await service.listByOrganization(workspace.organizationId));
  }

  useEffect(() => {
    let cancelled = false;
    service.listByOrganization(workspace.organizationId)
      .then((next) => { if (!cancelled) setLoans(next); })
      .catch((error) => { if (!cancelled) setFeedback({ tone: "danger", text: workspace.errorMessage(error) }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [service, workspace]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stockItemId || !sourceLocationId) return;

    setSaving(true);
    setFeedback(null);
    try {
      const result = await service.create({
        organizationId: workspace.organizationId,
        stockItemId: stockItemId as never,
        sourceLocationId: sourceLocationId as never,
        counterparty,
        quantity,
        preferredBatchId: preferredBatchId ? preferredBatchId as never : undefined,
        notes: notes || undefined,
      });
      await reloadLoans();
      setCounterparty("");
      setQuantity("");
      setPreferredBatchId("");
      setNotes("");
      setFeedback({
        tone: "success",
        text: `Empréstimo registrado por ${formatMoney(result.loan.originalValue)}. O valor permanece vinculado ao custo histórico das camadas emprestadas.`,
      });
    } catch (error) {
      setFeedback({ tone: "danger", text: workspace.errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Estoque · Empréstimos"
        title="Empréstimos de estoque"
        description="Controle mercadorias que saíram temporariamente, acompanhe o que ainda precisa retornar e mantenha separado o acerto em mercadoria do acerto em valor."
      />

      {feedback && <FeedbackMessage tone={feedback.tone}>{feedback.text}</FeedbackMessage>}

      {workspace.permissions.recordStockWithdrawal ? (
        <Panel>
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Registrar empréstimo</h2>
            <p className="mt-1 text-sm leading-6 text-neutral-600">
              O valor é calculado pelo sistema a partir do custo das mercadorias realmente retiradas. Não é necessário digitar um preço de empréstimo.
            </p>
          </div>
          <form onSubmit={submit} className="grid gap-5 lg:grid-cols-2">
            <FormField id="loan-item" label="Produto" required>
              {(props) => (
                <Select
                  {...props}
                  required
                  value={stockItemId}
                  onChange={(event) => { setStockItemId(event.target.value); setPreferredBatchId(""); }}
                >
                  <option value="">Selecione</option>
                  {workspace.stockItems.filter((item) => item.active).map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </Select>
              )}
            </FormField>

            <FormField id="loan-location" label="Estoque de origem" required>
              {(props) => (
                <Select
                  {...props}
                  required
                  value={sourceLocationId}
                  onChange={(event) => { setSourceLocationId(event.target.value); setPreferredBatchId(""); }}
                >
                  <option value="">Selecione</option>
                  {workspace.stockLocations.filter((location) => location.status === "active").map((location) => (
                    <option key={location.id} value={location.id}>{location.unitName} — {location.name}</option>
                  ))}
                </Select>
              )}
            </FormField>

            <FormField id="loan-counterparty" label="Contraparte" required hint="Ex.: restaurante, hotel, evento ou outra operação que ficará responsável pela restituição.">
              {(props) => <Input {...props} required maxLength={200} value={counterparty} onChange={(event) => setCounterparty(event.target.value)} />}
            </FormField>

            <FormField id="loan-quantity" label="Quantidade" required>
              {(props) => <Input {...props} required inputMode="decimal" step="0.001" min="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} />}
            </FormField>

            <FormField
              id="loan-batch"
              label="Lote/camada conhecida"
              hint="Opcional. Se não selecionar, o sistema prioriza a camada com vencimento mais próximo."
            >
              {(props) => (
                <Select {...props} value={preferredBatchId} disabled={!stockItemId || !sourceLocationId} onChange={(event) => setPreferredBatchId(event.target.value)}>
                  <option value="">Usar prioridade automática (FEFO)</option>
                  {eligibleBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batchCode ?? "Camada sem código"} · saldo {batch.remainingQuantity.toDecimal()} · {formatMoney(batch.unitCost)}{batch.expirationDate ? ` · vence ${formatDate(batch.expirationDate)}` : ""}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>

            <FormField id="loan-notes" label="Observação">
              {(props) => <Textarea {...props} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />}
            </FormField>

            <div className="flex justify-end lg:col-span-2">
              <Button type="submit" loading={saving} disabled={saving || !stockItemId || !sourceLocationId}>Registrar empréstimo</Button>
            </div>
          </form>
        </Panel>
      ) : (
        <Panel tone="attention">
          <h2 className="font-semibold">Empréstimos disponíveis somente para consulta</h2>
          <p className="mt-1 text-sm leading-6">Seu perfil não possui permissão para movimentar estoque neste escopo.</p>
        </Panel>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Empréstimos registrados</h2>
          <p className="text-sm text-neutral-600">Abra um empréstimo para ver o histórico e registrar devolução em mercadoria, em valor ou combinada.</p>
        </div>

        {loading ? (
          <Panel padding="sm"><p className="text-sm text-neutral-600">Carregando empréstimos...</p></Panel>
        ) : loans.length === 0 ? (
          <EmptyState title="Nenhum empréstimo registrado" description="Os empréstimos aparecerão aqui depois do primeiro registro visível para seu escopo." />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Contraparte</th>
                    <th className="px-4 py-3 font-medium">Produto / origem</th>
                    <th className="px-4 py-3 font-medium">Original</th>
                    <th className="px-4 py-3 font-medium">Pendente</th>
                    <th className="px-4 py-3 font-medium">Situação</th>
                    <th className="px-4 py-3"><span className="sr-only">Abrir</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {loans.map((loan) => (
                    <tr key={loan.id}>
                      <td className="whitespace-nowrap px-4 py-3">{formatDateTime(loan.loanedAt)}</td>
                      <td className="px-4 py-3 font-medium">{loan.counterparty}</td>
                      <td className="px-4 py-3"><div className="font-medium">{itemNames.get(loan.stockItemId) ?? "Item indisponível"}</div><div className="mt-1 text-xs text-neutral-500">{locationNames.get(loan.sourceLocationId) ?? "Local indisponível"}</div></td>
                      <td className="px-4 py-3">{loan.originalQuantity.toDecimal()} {itemUnits.get(loan.stockItemId) ?? ""}<div className="mt-1 text-xs text-neutral-500">{formatMoney(loan.originalValue)}</div></td>
                      <td className="px-4 py-3">{loan.remainingPhysicalQuantity.toDecimal()} {itemUnits.get(loan.stockItemId) ?? ""}<div className="mt-1 text-xs text-neutral-500">{formatMoney(loan.remainingValue)}</div></td>
                      <td className="px-4 py-3"><LoanStatus status={loan.status} /></td>
                      <td className="px-4 py-3 text-right"><Link href={`/workspace/emprestimos/${loan.id}`} className="font-semibold text-neutral-900 underline-offset-4 hover:underline">Abrir</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 md:hidden">
              {loans.map((loan) => (
                <Panel key={loan.id} padding="sm">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="font-semibold">{loan.counterparty}</h3><p className="mt-1 text-sm text-neutral-600">{itemNames.get(loan.stockItemId) ?? "Item indisponível"}</p></div>
                    <LoanStatus status={loan.status} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <Summary label="Pendente físico" value={`${loan.remainingPhysicalQuantity.toDecimal()} ${itemUnits.get(loan.stockItemId) ?? ""}`} />
                    <Summary label="Pendente em valor" value={formatMoney(loan.remainingValue)} />
                  </dl>
                  <Link href={`/workspace/emprestimos/${loan.id}`} className="mt-4 inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline">Ver empréstimo</Link>
                </Panel>
              ))}
            </div>
          </>
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

function Summary({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-neutral-500">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>;
}

function formatMoney(value: { toDecimal(): string }) {
  return currency.format(Number(value.toDecimal()));
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}
