"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  CashMovementType,
  CashState,
  PaymentMethodKind,
  SupabaseCashGateway,
} from "@/modules/cash/adapters/supabase-cash-gateway";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

const emptyState: CashState = Object.freeze({ units: Object.freeze([]), registers: Object.freeze([]), paymentMethods: Object.freeze([]), feeRules: Object.freeze([]), sessions: Object.freeze([]), totals: Object.freeze([]), movements: Object.freeze([]) });

interface TotalDraft { gross: string; fee: string; feeRuleId: string }
interface MovementDraft { type: CashMovementType; amount: string; occurredAt: string; reason: string }

function moneyLabel(value?: Money): string {
  if (!value) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value.toDecimal()));
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`));
}

function toIso(localDateTime: string): string {
  return new Date(localDateTime).toISOString();
}

export default function RuntimeCashPage() {
  const workspace = useRuntimeWorkspace();
  const gateway = useMemo(() => new SupabaseCashGateway(createBrowserSupabaseClient()), []);
  const organizationId = workspace.organizationId;
  const [state, setState] = useState<CashState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [registerUnitId, setRegisterUnitId] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerCode, setRegisterCode] = useState("");
  const [methodCode, setMethodCode] = useState("");
  const [methodName, setMethodName] = useState("");
  const [methodKind, setMethodKind] = useState<PaymentMethodKind>("other");
  const [methodAffectsDrawer, setMethodAffectsDrawer] = useState(false);
  const [feeMethodId, setFeeMethodId] = useState("");
  const [feeFrom, setFeeFrom] = useState("");
  const [feeTo, setFeeTo] = useState("");
  const [feePercent, setFeePercent] = useState("0");
  const [feeFixed, setFeeFixed] = useState("0");
  const [feeLabel, setFeeLabel] = useState("");

  const [sessionRegisterId, setSessionRegisterId] = useState("");
  const [businessDate, setBusinessDate] = useState("");
  const [sequence, setSequence] = useState("1");
  const [openingFloat, setOpeningFloat] = useState("0");
  const [sessionNotes, setSessionNotes] = useState("");

  const [totalDrafts, setTotalDrafts] = useState<Record<string, TotalDraft>>({});
  const [movementDrafts, setMovementDrafts] = useState<Record<string, MovementDraft>>({});
  const [countedDrafts, setCountedDrafts] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setState(await gateway.listState(organizationId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar o Caixa.");
    } finally {
      setLoading(false);
    }
  }, [gateway, organizationId]);

  useEffect(() => {
    let active = true;
    void gateway.listState(organizationId).then((next) => { if (active) setState(next); }).catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Não foi possível carregar o Caixa."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gateway, organizationId]);

  const unitById = useMemo(() => new Map(state.units.map((unit) => [unit.id, unit])), [state.units]);
  const registerById = useMemo(() => new Map(state.registers.map((register) => [register.id, register])), [state.registers]);
  const methodById = useMemo(() => new Map(state.paymentMethods.map((method) => [method.id, method])), [state.paymentMethods]);
  const openSessions = state.sessions.filter((session) => session.status === "open");

  const totalsBySession = useMemo(() => {
    const map = new Map<string, typeof state.totals[number][]>();
    for (const total of state.totals) { const current = map.get(total.cashSessionId) ?? []; current.push(total); map.set(total.cashSessionId, current); }
    return map;
  }, [state.totals]);
  const movementsBySession = useMemo(() => {
    const map = new Map<string, typeof state.movements[number][]>();
    for (const movement of state.movements) { const current = map.get(movement.cashSessionId) ?? []; current.push(movement); map.set(movement.cashSessionId, current); }
    return map;
  }, [state.movements]);

  async function run(key: string, operation: () => Promise<void>, success: string) {
    setSavingKey(key); setMessage(null);
    try { await operation(); await refresh(); setMessage(success); }
    catch (error) { setMessage(workspace.errorMessage(error)); }
    finally { setSavingKey(null); }
  }

  async function createRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run("register", () => gateway.createRegister({ organizationId, unitId: registerUnitId as EntityId, name: registerName, code: registerCode || undefined }), "Caixa configurado.");
    setRegisterName(""); setRegisterCode("");
  }

  async function createMethod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run("method", () => gateway.createPaymentMethod({ organizationId, code: methodCode, name: methodName, methodKind, affectsCashDrawer: methodAffectsDrawer }), "Meio de pagamento configurado.");
    setMethodCode(""); setMethodName(""); setMethodKind("other"); setMethodAffectsDrawer(false);
  }

  async function createRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run("fee", () => gateway.createFeeRule({ organizationId, paymentMethodId: feeMethodId as EntityId, validFrom: feeFrom, validTo: feeTo || undefined, percentFee: feePercent, fixedFee: feeFixed, label: feeLabel || undefined }), "Regra de taxa versionada.");
    setFeePercent("0"); setFeeFixed("0"); setFeeLabel("");
  }

  async function openSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run("open", () => gateway.openSession({ organizationId, cashRegisterId: sessionRegisterId as EntityId, businessDate, sequence: Number(sequence), openingFloat, notes: sessionNotes || undefined }), "Sessão de caixa aberta.");
    setOpeningFloat("0"); setSessionNotes("");
  }

  async function saveTotal(sessionId: EntityId, methodId: EntityId) {
    const key = `${sessionId}:${methodId}`;
    const current = state.totals.find((item) => item.cashSessionId === sessionId && item.paymentMethodId === methodId);
    const draft = totalDrafts[key] ?? { gross: current?.grossAmount.toDecimal() ?? "", fee: current?.feeAmount.toDecimal() ?? "", feeRuleId: current?.feeRuleId ?? "" };
    if (!draft.gross) { setMessage("Informe o total bruto do meio de pagamento."); return; }
    await run(`total:${key}`, () => gateway.setPaymentTotal({ organizationId, cashSessionId: sessionId, paymentMethodId: methodId, grossAmount: draft.gross, feeAmount: draft.fee || undefined, feeRuleId: draft.feeRuleId ? draft.feeRuleId as EntityId : undefined }), "Total do meio de pagamento atualizado.");
  }

  async function saveMovement(sessionId: EntityId) {
    const draft = movementDrafts[sessionId] ?? { type: "cash_in" as CashMovementType, amount: "", occurredAt: "", reason: "" };
    if (!draft.amount || !draft.occurredAt) { setMessage("Informe valor e data/hora do movimento."); return; }
    await run(`movement:${sessionId}`, () => gateway.recordMovement({ organizationId, cashSessionId: sessionId, movementType: draft.type, amount: draft.amount, occurredAt: toIso(draft.occurredAt), reason: draft.reason || undefined }), "Movimento de caixa registrado.");
    setMovementDrafts((current) => ({ ...current, [sessionId]: { type: "cash_in", amount: "", occurredAt: "", reason: "" } }));
  }

  async function closeSession(sessionId: EntityId) {
    const counted = countedDrafts[sessionId];
    if (!counted) { setMessage("Informe o valor contado em dinheiro para fechar a sessão."); return; }
    await run(`close:${sessionId}`, () => gateway.closeSession({ organizationId, cashSessionId: sessionId, countedCashAmount: counted }), "Sessão fechada com esperado, contado e divergência preservados.");
  }

  async function cancelSession(sessionId: EntityId) {
    const reason = window.prompt("Motivo do cancelamento (opcional):") ?? undefined;
    if (reason === undefined) return;
    await run(`cancel:${sessionId}`, () => gateway.cancelSession({ organizationId, cashSessionId: sessionId, reason }), "Sessão cancelada sem exclusão física.");
  }

  return <div className="mx-auto max-w-7xl space-y-8">
    <header><p className="text-sm font-medium text-emerald-700">Caixa persistente</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Sessões e fechamento diário</h1><p className="mt-3 max-w-4xl text-sm leading-6 text-neutral-600">A primeira versão trabalha com totais consolidados, não vendas individuais. Fundo inicial, esperado, contado e divergência permanecem campos distintos. Consumo de Funcionários é uma categoria operacional separada e não entra automaticamente no faturamento nem no esperado da gaveta.</p></header>
    {message && <p className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">{message}</p>}

    {workspace.permissions.manageCashConfig && <section className="grid gap-4 xl:grid-cols-3">
      <form onSubmit={createRegister} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Cadastrar caixa</h2><label className="block text-sm">Unidade<select required value={registerUnitId} onChange={(event) => setRegisterUnitId(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"><option value="">Selecione</option>{state.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label><label className="block text-sm">Nome<input required value={registerName} onChange={(event) => setRegisterName(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" /></label><label className="block text-sm">Código<input value={registerCode} onChange={(event) => setRegisterCode(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" /></label><button disabled={savingKey!==null} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Salvar caixa</button></form>
      <form onSubmit={createMethod} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Meio de pagamento</h2><div className="grid grid-cols-2 gap-3"><label className="text-sm">Código<input required value={methodCode} onChange={(event) => setMethodCode(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" /></label><label className="text-sm">Nome<input required value={methodName} onChange={(event) => setMethodName(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" /></label></div><label className="block text-sm">Tipo<select value={methodKind} onChange={(event) => setMethodKind(event.target.value as PaymentMethodKind)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"><option value="cash">Dinheiro</option><option value="card">Cartão</option><option value="instant">Instantâneo/Pix</option><option value="voucher">Voucher</option><option value="other">Outro</option></select></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={methodAffectsDrawer} onChange={(event) => setMethodAffectsDrawer(event.target.checked)} />Afeta o dinheiro esperado na gaveta</label><button disabled={savingKey!==null} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Salvar meio</button></form>
      <form onSubmit={createRule} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Regra de taxa</h2><label className="block text-sm">Meio<select required value={feeMethodId} onChange={(event) => setFeeMethodId(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"><option value="">Selecione</option>{state.paymentMethods.filter((method) => method.status==="active").map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="text-sm">Vigência inicial<input required type="date" value={feeFrom} onChange={(event) => setFeeFrom(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" /></label><label className="text-sm">Vigência final<input type="date" value={feeTo} onChange={(event) => setFeeTo(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" /></label><label className="text-sm">%<input required inputMode="decimal" value={feePercent} onChange={(event) => setFeePercent(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" /></label><label className="text-sm">Fixa<input required inputMode="decimal" value={feeFixed} onChange={(event) => setFeeFixed(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" /></label></div><label className="block text-sm">Rótulo<input value={feeLabel} onChange={(event) => setFeeLabel(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" /></label><button disabled={savingKey!==null} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Salvar taxa</button></form>
    </section>}

    {workspace.permissions.operateCash && <form onSubmit={openSession} className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-5"><div className="xl:col-span-5"><h2 className="font-semibold">Abrir sessão</h2><p className="text-xs text-neutral-500">A data de negócio é explícita; o sistema não deriva mês/aba da planilha.</p></div><label className="text-sm">Caixa<select required value={sessionRegisterId} onChange={(event) => setSessionRegisterId(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"><option value="">Selecione</option>{state.registers.filter((register)=>register.status==="active").map((register)=><option key={register.id} value={register.id}>{register.name} · {unitById.get(register.unitId)?.name}</option>)}</select></label><label className="text-sm">Data<input required type="date" value={businessDate} onChange={(event)=>setBusinessDate(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" /></label><label className="text-sm">Sequência<input required type="number" min="1" value={sequence} onChange={(event)=>setSequence(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" /></label><label className="text-sm">Fundo inicial<input required inputMode="decimal" value={openingFloat} onChange={(event)=>setOpeningFloat(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" /></label><label className="text-sm">Observação<input value={sessionNotes} onChange={(event)=>setSessionNotes(event.target.value)} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" /></label><div className="xl:col-span-5 flex justify-end"><button disabled={savingKey!==null} className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Abrir caixa</button></div></form>}

    <section className="space-y-4"><div><h2 className="text-xl font-semibold">Sessões</h2><p className="text-sm text-neutral-500">Esperado considera somente meios marcados como gaveta, fundo inicial, entradas e sangrias. Consumo de Funcionários permanece separado.</p></div>{loading&&state.sessions.length===0&&<p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">Carregando sessões...</p>}{!loading&&state.sessions.length===0&&<p className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">Nenhuma sessão registrada.</p>}
      {state.sessions.map((session)=>{const register=registerById.get(session.cashRegisterId);const totals=totalsBySession.get(session.id)??[];const movements=movementsBySession.get(session.id)??[];return <article key={session.id} className="rounded-2xl border border-neutral-200 bg-white shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 p-5"><div><h3 className="font-semibold">{register?.name??"Caixa indisponível"} · {dateLabel(session.businessDate)} · seq. {session.sequence}</h3><p className="mt-1 text-sm text-neutral-600">Fundo: {moneyLabel(session.openingFloat)} · Status: <strong>{session.status}</strong></p>{session.status==="closed"&&<p className="mt-1 text-sm text-neutral-600">Esperado {moneyLabel(session.expectedCashAmount)} · Contado {moneyLabel(session.countedCashAmount)} · Divergência <strong>{moneyLabel(session.cashDifference)}</strong></p>}</div>{workspace.permissions.operateCash&&session.status==="open"&&<button disabled={savingKey!==null} onClick={()=>void cancelSession(session.id)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">Cancelar</button>}</div>
        <div className="space-y-5 p-5"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{state.paymentMethods.filter((method)=>method.status==="active").map((method)=>{const total=totals.find((item)=>item.paymentMethodId===method.id);const key=`${session.id}:${method.id}`;const draft=totalDrafts[key]??{gross:total?.grossAmount.toDecimal()??"",fee:total?.feeAmount.toDecimal()??"",feeRuleId:total?.feeRuleId??""};const rules=state.feeRules.filter((rule)=>rule.paymentMethodId===method.id&&rule.status==="active");return <div key={method.id} className="rounded-xl border border-neutral-200 p-4"><div className="flex justify-between gap-2"><p className="font-semibold">{method.name}</p>{method.affectsCashDrawer&&<span className="text-xs text-emerald-700">gaveta</span>}</div><p className="mt-1 text-xs text-neutral-500">Atual: bruto {moneyLabel(total?.grossAmount)} · taxa {moneyLabel(total?.feeAmount)} · líquido {moneyLabel(total?.netAmount)}</p>{workspace.permissions.operateCash&&session.status==="open"&&<div className="mt-3 space-y-2"><input placeholder="Bruto" inputMode="decimal" value={draft.gross} onChange={(event)=>setTotalDrafts((current)=>({...current,[key]:{...draft,gross:event.target.value}}))} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" /><input placeholder="Taxa explícita (opcional)" inputMode="decimal" value={draft.fee} onChange={(event)=>setTotalDrafts((current)=>({...current,[key]:{...draft,fee:event.target.value}}))} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" /><select value={draft.feeRuleId} onChange={(event)=>setTotalDrafts((current)=>({...current,[key]:{...draft,feeRuleId:event.target.value,fee:""}}))} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"><option value="">Sem regra automática</option>{rules.map((rule)=><option key={rule.id} value={rule.id}>{rule.label??`${rule.percentFee}% + ${moneyLabel(rule.fixedFee)}`}</option>)}</select><button disabled={savingKey!==null} onClick={()=>void saveTotal(session.id,method.id)} className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Atualizar total</button></div>}</div>})}</div>
          {workspace.permissions.operateCash&&session.status==="open"&&(()=>{const draft=movementDrafts[session.id]??{type:"cash_in" as CashMovementType,amount:"",occurredAt:"",reason:""};return <div className="grid gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 md:grid-cols-4 xl:grid-cols-[1fr_1fr_1.3fr_2fr_auto]"><label className="text-xs font-medium text-neutral-600">Tipo<select value={draft.type} onChange={(event)=>setMovementDrafts((current)=>({...current,[session.id]:{...draft,type:event.target.value as CashMovementType}}))} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"><option value="cash_in">Entrada</option><option value="cash_out">Sangria</option><option value="employee_consumption">Consumo Funcionários</option></select></label><label className="text-xs font-medium text-neutral-600">Valor<input inputMode="decimal" value={draft.amount} onChange={(event)=>setMovementDrafts((current)=>({...current,[session.id]:{...draft,amount:event.target.value}}))} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" /></label><label className="text-xs font-medium text-neutral-600">Data/hora<input type="datetime-local" value={draft.occurredAt} onChange={(event)=>setMovementDrafts((current)=>({...current,[session.id]:{...draft,occurredAt:event.target.value}}))} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" /></label><label className="text-xs font-medium text-neutral-600">Motivo<input value={draft.reason} onChange={(event)=>setMovementDrafts((current)=>({...current,[session.id]:{...draft,reason:event.target.value}}))} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" /></label><button disabled={savingKey!==null} onClick={()=>void saveMovement(session.id)} className="self-end rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Registrar</button></div>})()}
          {movements.length>0&&<div className="flex flex-wrap gap-2 text-xs">{movements.map((movement)=><span key={movement.id} className="rounded-full bg-neutral-100 px-3 py-1.5">{movement.movementType}: {moneyLabel(movement.amount)}{movement.reason?` · ${movement.reason}`:""}</span>)}</div>}
          {workspace.permissions.operateCash&&session.status==="open"&&<div className="flex flex-wrap items-end justify-end gap-3 border-t border-neutral-100 pt-4"><label className="text-sm font-medium">Dinheiro contado<input inputMode="decimal" value={countedDrafts[session.id]??""} onChange={(event)=>setCountedDrafts((current)=>({...current,[session.id]:event.target.value}))} className="mt-1 block rounded-lg border border-neutral-300 px-3 py-2 font-normal" /></label><button disabled={savingKey!==null} onClick={()=>void closeSession(session.id)} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Fechar sessão</button></div>}
        </div></article>})}
    </section>
  </div>;
}
