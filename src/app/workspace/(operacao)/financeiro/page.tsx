"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  FinanceState,
  InstallmentPaymentStatus,
  RuntimeInstallmentSummary,
  SupabaseFinanceGateway,
} from "@/modules/finance/adapters/supabase-finance-gateway";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";
import { FinanceAttachmentsPanel } from "@/modules/finance/ui/finance-attachments-panel";

interface InstallmentDraft {
  key: string;
  amount: string;
  dueDate: string;
  paymentReference: string;
  paymentLabel: string;
}

interface PaymentDraft {
  amount: string;
  paidAt: string;
  paymentReference: string;
  notes: string;
}

const emptyState: FinanceState = Object.freeze({
  units: Object.freeze([]),
  sectors: Object.freeze([]),
  documents: Object.freeze([]),
  installments: Object.freeze([]),
  instructions: Object.freeze([]),
  payments: Object.freeze([]),
});

const statusLabel: Record<InstallmentPaymentStatus, string> = {
  cancelled: "Cancelada",
  paid: "Paga",
  overdue: "Vencida",
  due_today: "Vence hoje",
  upcoming: "A vencer",
};

function moneyLabel(value: Money): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value.toDecimal()));
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`));
}

function toIso(localDateTime: string): string {
  return new Date(localDateTime).toISOString();
}

function newInstallment(key: string): InstallmentDraft {
  return { key, amount: "", dueDate: "", paymentReference: "", paymentLabel: "" };
}

export default function RuntimeFinancePage() {
  const workspace = useRuntimeWorkspace();
  const gateway = useMemo(() => new SupabaseFinanceGateway(createBrowserSupabaseClient()), []);
  const organizationId = workspace.organizationId;

  const [state, setState] = useState<FinanceState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
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
  const [installmentDrafts, setInstallmentDrafts] = useState<InstallmentDraft[]>([newInstallment("initial")]);
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, PaymentDraft>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setState(await gateway.listState(organizationId));
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [gateway, organizationId, workspace]);

  useEffect(() => {
    let active = true;
    void gateway
      .listState(organizationId)
      .then((nextState) => {
        if (active) setState(nextState);
      })
      .catch((error) => {
        if (active) setMessage(error instanceof Error ? error.message : "Não foi possível carregar o financeiro.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [gateway, organizationId]);

  const supplierById = useMemo(
    () => new Map(workspace.suppliers.map((supplier) => [supplier.id, supplier])),
    [workspace.suppliers],
  );
  const unitById = useMemo(() => new Map(state.units.map((unit) => [unit.id, unit])), [state.units]);
  const sectorById = useMemo(() => new Map(state.sectors.map((sector) => [sector.id, sector])), [state.sectors]);
  const sectorsForUnit = useMemo(
    () => state.sectors.filter((sector) => sector.unitId === unitId),
    [state.sectors, unitId],
  );

  const installmentsByDocument = useMemo(() => {
    const map = new Map<string, RuntimeInstallmentSummary[]>();
    for (const installment of state.installments) {
      const current = map.get(installment.payableDocumentId) ?? [];
      current.push(installment);
      map.set(installment.payableDocumentId, current);
    }
    return map;
  }, [state.installments]);

  const paymentsByInstallment = useMemo(() => {
    const map = new Map<string, typeof state.payments[number][]>();
    for (const payment of state.payments) {
      const current = map.get(payment.installmentId) ?? [];
      current.push(payment);
      map.set(payment.installmentId, current);
    }
    return map;
  }, [state.payments]);

  const instructionsByInstallment = useMemo(() => {
    const map = new Map<string, typeof state.instructions[number][]>();
    for (const instruction of state.instructions) {
      const current = map.get(instruction.installmentId) ?? [];
      current.push(instruction);
      map.set(instruction.installmentId, current);
    }
    return map;
  }, [state.instructions]);

  const reversedPaymentIds = useMemo(
    () => new Set(state.payments.flatMap((payment) => payment.eventType === "reversal" && payment.reversesPaymentId ? [payment.reversesPaymentId] : [])),
    [state.payments],
  );

  const totalNominal = useMemo(
    () => state.installments.reduce((sum, installment) => sum.add(installment.nominalAmount), Money.zero()),
    [state.installments],
  );
  const totalPaid = useMemo(
    () => state.installments.reduce((sum, installment) => sum.add(installment.netPaidAmount), Money.zero()),
    [state.installments],
  );
  const totalOpen = useMemo(
    () => state.installments.reduce(
      (sum, installment) => sum.add(Money.fromCents(Math.max(installment.balanceAmount.cents, 0))),
      Money.zero(),
    ),
    [state.installments],
  );
  const overdueCount = state.installments.filter((installment) => installment.paymentStatus === "overdue").length;

  async function createDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingKey("create");
    setMessage(null);
    try {
      await gateway.createDocument({
        organizationId,
        unitId: unitId as EntityId,
        sectorId: sectorId ? sectorId as EntityId : undefined,
        supplierId: supplierId as EntityId,
        documentType,
        documentNumber: documentNumber || undefined,
        series: series || undefined,
        accessKey: accessKey || undefined,
        issuedAt: issuedAt || undefined,
        description: description || undefined,
        installments: installmentDrafts.map((draft) => ({
          amount: draft.amount,
          dueDate: draft.dueDate,
          paymentReference: draft.paymentReference || undefined,
          paymentLabel: draft.paymentLabel || undefined,
        })),
      });
      setSupplierId("");
      setUnitId("");
      setSectorId("");
      setDocumentType("supplier_document");
      setDocumentNumber("");
      setSeries("");
      setAccessKey("");
      setIssuedAt("");
      setDescription("");
      setInstallmentDrafts([newInstallment("initial")]);
      await refresh();
      setMessage("Documento financeiro registrado com parcelas e referências preservadas.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingKey(null);
    }
  }

  async function recordPayment(installment: RuntimeInstallmentSummary) {
    const draft = paymentDrafts[installment.id];
    if (!draft?.amount || !draft.paidAt) {
      setMessage("Informe valor e data/hora do pagamento.");
      return;
    }
    setSavingKey(`payment:${installment.id}`);
    setMessage(null);
    try {
      await gateway.recordPayment({
        organizationId,
        installmentId: installment.id,
        amount: draft.amount,
        paidAt: toIso(draft.paidAt),
        paymentReference: draft.paymentReference || undefined,
        notes: draft.notes || undefined,
      });
      setPaymentDrafts((current) => ({ ...current, [installment.id]: { amount: "", paidAt: "", paymentReference: "", notes: "" } }));
      await refresh();
      setMessage("Pagamento registrado como evento auditável. Diferenças para o nominal permanecem explícitas.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingKey(null);
    }
  }

  async function reversePayment(paymentId: EntityId) {
    const reason = window.prompt("Motivo do estorno (opcional):") ?? undefined;
    if (reason === undefined) return;
    setSavingKey(`reverse:${paymentId}`);
    setMessage(null);
    try {
      await gateway.reversePayment({
        organizationId,
        paymentId,
        reversedAt: new Date().toISOString(),
        reason,
      });
      await refresh();
      setMessage("Estorno registrado sem apagar o pagamento original.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingKey(null);
    }
  }

  async function cancelDocument(documentId: EntityId) {
    const reason = window.prompt("Motivo do cancelamento (opcional):") ?? undefined;
    if (reason === undefined) return;
    setSavingKey(`cancel:${documentId}`);
    setMessage(null);
    try {
      await gateway.cancelDocument(organizationId, documentId, reason);
      await refresh();
      setMessage("Documento cancelado com trilha de auditoria preservada.");
    } catch (error) {
      setMessage(workspace.errorMessage(error));
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-sm font-medium text-emerald-700">Financeiro persistente</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Documentos, parcelas e pagamentos</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-neutral-600">Status é derivado de vencimento e saldo. Pagamentos são eventos separados e podem ser estornados sem apagar histórico. O sistema preserva qualquer diferença entre valor nominal e valor efetivamente pago sem classificá-la automaticamente como juros, multa ou desconto.</p>
      </header>

      {message && <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">{message}</p>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><p className="text-sm text-neutral-500">Nominal</p><p className="mt-2 text-2xl font-semibold">{moneyLabel(totalNominal)}</p></div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><p className="text-sm text-neutral-500">Pago líquido</p><p className="mt-2 text-2xl font-semibold">{moneyLabel(totalPaid)}</p></div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><p className="text-sm text-neutral-500">Saldo em aberto</p><p className="mt-2 text-2xl font-semibold">{moneyLabel(totalOpen)}</p></div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><p className="text-sm text-neutral-500">Parcelas vencidas</p><p className="mt-2 text-2xl font-semibold">{overdueCount}</p></div>
      </section>

      {workspace.permissions.manageFinance && (
        <form onSubmit={createDocument} className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div><h2 className="text-lg font-semibold">Novo documento</h2><p className="mt-1 text-xs text-neutral-500">Fornecedor, unidade e parcelas são estruturados. A referência histórica Pix/Boleto é armazenada separadamente do pagamento executado.</p></div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium">Fornecedor<select required value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Selecione</option>{workspace.suppliers.filter((supplier) => supplier.active).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.tradeName}</option>)}</select></label>
            <label className="text-sm font-medium">Unidade<select required value={unitId} onChange={(event) => { setUnitId(event.target.value); setSectorId(""); }} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Selecione</option>{state.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
            <label className="text-sm font-medium">Setor<select value={sectorId} onChange={(event) => setSectorId(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal"><option value="">Sem setor específico</option>{sectorsForUnit.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}</select></label>
            <label className="text-sm font-medium">Tipo<input required value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
            <label className="text-sm font-medium">Número<input value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
            <label className="text-sm font-medium">Série<input value={series} onChange={(event) => setSeries(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
            <label className="text-sm font-medium">Data de emissão<input type="date" value={issuedAt} onChange={(event) => setIssuedAt(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
            <label className="text-sm font-medium">Chave / identificador<input value={accessKey} onChange={(event) => setAccessKey(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>
          </div>
          <label className="block text-sm font-medium">Descrição / observação<input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label>

          <div className="space-y-3">
            <div className="flex items-center justify-between"><div><h3 className="font-semibold">Parcelas</h3><p className="text-xs text-neutral-500">A ordem visual define 1/N, 2/N etc. Valores não são redistribuídos automaticamente.</p></div><button type="button" onClick={() => setInstallmentDrafts((current) => [...current, newInstallment(`${Date.now()}-${current.length}`)])} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium">Adicionar parcela</button></div>
            {installmentDrafts.map((draft, index) => (
              <div key={draft.key} className="grid gap-3 rounded-xl border border-neutral-200 p-4 md:grid-cols-[90px_1fr_1fr_1.4fr_1fr_auto]">
                <div className="self-center text-sm font-semibold">{index + 1}/{installmentDrafts.length}</div>
                <label className="text-xs font-medium text-neutral-600">Valor<input required inputMode="decimal" value={draft.amount} onChange={(event) => setInstallmentDrafts((current) => current.map((item) => item.key === draft.key ? { ...item, amount: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-900" /></label>
                <label className="text-xs font-medium text-neutral-600">Vencimento<input required type="date" value={draft.dueDate} onChange={(event) => setInstallmentDrafts((current) => current.map((item) => item.key === draft.key ? { ...item, dueDate: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-900" /></label>
                <label className="text-xs font-medium text-neutral-600">Pix/Boleto / referência<input value={draft.paymentReference} onChange={(event) => setInstallmentDrafts((current) => current.map((item) => item.key === draft.key ? { ...item, paymentReference: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-900" /></label>
                <label className="text-xs font-medium text-neutral-600">Rótulo opcional<input value={draft.paymentLabel} onChange={(event) => setInstallmentDrafts((current) => current.map((item) => item.key === draft.key ? { ...item, paymentLabel: event.target.value } : item))} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-900" /></label>
                <button disabled={installmentDrafts.length === 1} type="button" onClick={() => setInstallmentDrafts((current) => current.filter((item) => item.key !== draft.key))} className="self-end rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-40">Remover</button>
              </div>
            ))}
          </div>

          <div className="flex justify-end"><button disabled={savingKey !== null} type="submit" className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{savingKey === "create" ? "Salvando..." : "Registrar documento"}</button></div>
        </form>
      )}

      <section className="space-y-4">
        <div><h2 className="text-xl font-semibold">Contas a pagar</h2><p className="text-sm text-neutral-500">Pagamento, vencimento e saldo são calculados a partir dos eventos persistidos.</p></div>
        {loading && state.documents.length === 0 && <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">Carregando documentos...</p>}
        {!loading && state.documents.length === 0 && <p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">Nenhum documento financeiro registrado.</p>}

        {state.documents.map((document) => {
          const supplier = supplierById.get(document.supplierId);
          const unit = unitById.get(document.unitId);
          const sector = document.sectorId ? sectorById.get(document.sectorId) : undefined;
          const installments = installmentsByDocument.get(document.id) ?? [];
          return (
            <article key={document.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 p-5">
                <div><h3 className="font-semibold">{supplier?.tradeName ?? "Fornecedor indisponível"}</h3><p className="mt-1 text-xs text-neutral-500">{document.documentNumber ? `Doc. ${document.documentNumber}` : document.documentType}{document.series ? ` · série ${document.series}` : ""}{unit ? ` · ${unit.name}` : ""}{sector ? ` / ${sector.name}` : ""}</p><p className="mt-1 text-sm text-neutral-600">Total nominal: <strong>{moneyLabel(document.totalAmount)}</strong>{document.description ? ` · ${document.description}` : ""}</p></div>
                <div className="flex items-center gap-2"><span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">{document.lifecycleStatus === "active" ? "Ativo" : "Cancelado"}</span>{workspace.permissions.manageFinance && document.lifecycleStatus === "active" && <button disabled={savingKey !== null} onClick={() => void cancelDocument(document.id)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">Cancelar documento</button>}</div>
              </div>

              <FinanceAttachmentsPanel
                organizationId={organizationId}
                payableDocumentId={document.id}
                canUpload={workspace.permissions.manageFinance && document.lifecycleStatus === "active"}
              />

              <div className="divide-y divide-neutral-100">
                {installments.map((installment) => {
                  const paymentDraft = paymentDrafts[installment.id] ?? { amount: "", paidAt: "", paymentReference: "", notes: "" };
                  const instructions = instructionsByInstallment.get(installment.id) ?? [];
                  const payments = paymentsByInstallment.get(installment.id) ?? [];
                  return (
                    <div key={installment.id} className="space-y-4 p-5">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                        <div><p className="text-xs text-neutral-500">Parcela</p><p className="font-semibold">{installment.installmentNumber}/{installment.installmentCount}</p></div>
                        <div><p className="text-xs text-neutral-500">Vencimento</p><p className="font-semibold">{dateLabel(installment.dueDate)}</p></div>
                        <div><p className="text-xs text-neutral-500">Nominal</p><p className="font-semibold">{moneyLabel(installment.nominalAmount)}</p></div>
                        <div><p className="text-xs text-neutral-500">Pago líquido</p><p className="font-semibold">{moneyLabel(installment.netPaidAmount)}</p></div>
                        <div><p className="text-xs text-neutral-500">Diferença / saldo</p><p className="font-semibold">{moneyLabel(installment.balanceAmount)}</p></div>
                        <div><p className="text-xs text-neutral-500">Status</p><span className="mt-1 inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold">{statusLabel[installment.paymentStatus]}</span></div>
                      </div>

                      {instructions.length > 0 && <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700"><span className="font-semibold">Referência de pagamento:</span> {instructions.map((instruction) => `${instruction.label ? `${instruction.label}: ` : ""}${instruction.rawReference}`).join(" · ")}</div>}

                      {workspace.permissions.manageFinance && document.lifecycleStatus === "active" && (
                        <div className="grid gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 md:grid-cols-4 xl:grid-cols-[1fr_1.2fr_1.5fr_1.5fr_auto]">
                          <label className="text-xs font-medium text-neutral-600">Valor pago<input inputMode="decimal" value={paymentDraft.amount} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [installment.id]: { ...paymentDraft, amount: event.target.value } }))} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-normal text-neutral-900" /></label>
                          <label className="text-xs font-medium text-neutral-600">Data/hora<input type="datetime-local" value={paymentDraft.paidAt} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [installment.id]: { ...paymentDraft, paidAt: event.target.value } }))} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-normal text-neutral-900" /></label>
                          <label className="text-xs font-medium text-neutral-600">Referência do pagamento<input value={paymentDraft.paymentReference} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [installment.id]: { ...paymentDraft, paymentReference: event.target.value } }))} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-normal text-neutral-900" /></label>
                          <label className="text-xs font-medium text-neutral-600">Observação<input value={paymentDraft.notes} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [installment.id]: { ...paymentDraft, notes: event.target.value } }))} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-normal text-neutral-900" /></label>
                          <button disabled={savingKey !== null} onClick={() => void recordPayment(installment)} className="self-end rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Registrar pagamento</button>
                        </div>
                      )}

                      {payments.length > 0 && (
                        <div className="overflow-x-auto rounded-xl border border-neutral-200">
                          <table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-neutral-50 text-neutral-600"><tr><th className="px-3 py-2 font-medium">Evento</th><th className="px-3 py-2 font-medium">Data</th><th className="px-3 py-2 font-medium">Valor</th><th className="px-3 py-2 font-medium">Referência / observação</th><th className="px-3 py-2 font-medium">Ação</th></tr></thead><tbody className="divide-y divide-neutral-100">{payments.map((payment) => <tr key={payment.id}><td className="px-3 py-2 font-medium">{payment.eventType === "payment" ? "Pagamento" : "Estorno"}</td><td className="px-3 py-2">{new Date(payment.paidAt).toLocaleString("pt-BR")}</td><td className="px-3 py-2">{moneyLabel(payment.amount)}</td><td className="px-3 py-2 text-neutral-600">{payment.paymentReference ?? payment.notes ?? "—"}</td><td className="px-3 py-2">{workspace.permissions.manageFinance && document.lifecycleStatus === "active" && payment.eventType === "payment" && !reversedPaymentIds.has(payment.id) ? <button disabled={savingKey !== null} onClick={() => void reversePayment(payment.id)} className="rounded-lg border border-neutral-300 px-2.5 py-1.5 font-medium disabled:opacity-50">Estornar</button> : "—"}</td></tr>)}</tbody></table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
