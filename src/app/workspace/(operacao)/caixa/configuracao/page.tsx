"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button, EmptyState, FeedbackMessage, FormField, Input, PageHeader, Panel, Select, StatusBadge } from "@/components/ui";
import { EntityId } from "@/domain/common/entity-id";
import { PaymentMethodKind } from "@/modules/cash/adapters/supabase-cash-gateway";
import { dateLabel, moneyLabel, paymentMethodKindLabel } from "@/modules/cash/ui/cash-view-model";
import { useCashState } from "@/modules/cash/ui/use-cash-state";
import { useRuntimeWorkspace } from "@/modules/master-data/ui/runtime-workspace-provider";

export default function CashConfigurationPage() {
  const workspace = useRuntimeWorkspace();
  const { gateway, state, loading, error, refresh } = useCashState(workspace.organizationId);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const [registerUnitId, setRegisterUnitId] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerCode, setRegisterCode] = useState("");
  const [methodCode, setMethodCode] = useState("");
  const [methodName, setMethodName] = useState("");
  const [methodKind, setMethodKind] = useState<PaymentMethodKind>("other");
  const [affectsDrawer, setAffectsDrawer] = useState(false);
  const [feeMethodId, setFeeMethodId] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [percentFee, setPercentFee] = useState("0");
  const [fixedFee, setFixedFee] = useState("0");
  const [feeLabel, setFeeLabel] = useState("");

  const unitById = useMemo(() => new Map(state.units.map((unit) => [unit.id, unit.name])), [state.units]);
  const methodById = useMemo(() => new Map(state.paymentMethods.map((method) => [method.id, method])), [state.paymentMethods]);
  const canConfigureRegisters = workspace.permissions.manageCashRegisters || workspace.permissions.manageCashConfig;
  const canConfigureMethods = workspace.permissions.manageCashConfig;

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

  async function createRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run("register", () => gateway.createRegister({ organizationId: workspace.organizationId, unitId: registerUnitId as EntityId, name: registerName, code: registerCode || undefined }), "Caixa configurado com sucesso.");
    setRegisterName("");
    setRegisterCode("");
  }

  async function createMethod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run("method", () => gateway.createPaymentMethod({ organizationId: workspace.organizationId, code: methodCode, name: methodName, methodKind, affectsCashDrawer: affectsDrawer }), "Meio de pagamento configurado com sucesso.");
    setMethodCode("");
    setMethodName("");
    setMethodKind("other");
    setAffectsDrawer(false);
  }

  async function createFeeRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run("fee", () => gateway.createFeeRule({ organizationId: workspace.organizationId, paymentMethodId: feeMethodId as EntityId, validFrom, validTo: validTo || undefined, percentFee, fixedFee, label: feeLabel || undefined }), "Regra de taxa versionada com sucesso.");
    setPercentFee("0");
    setFixedFee("0");
    setFeeLabel("");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader eyebrow="Caixa" title="Configuração" description="Caixas físicos, meios de pagamento e taxas ficam separados da operação diária. Alterações continuam submetidas às permissões e validações do backend." />

      {error && <FeedbackMessage tone="danger" role="alert">{error}</FeedbackMessage>}
      {message && <FeedbackMessage tone={message.tone}>{message.text}</FeedbackMessage>}
      {!canConfigureRegisters && !canConfigureMethods && <FeedbackMessage tone="info">Você pode consultar a configuração disponível no seu escopo, mas não possui permissão para alterá-la.</FeedbackMessage>}

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel as="section" className="space-y-5">
          <div><h2 className="text-lg font-semibold">Caixas físicos</h2><p className="mt-1 text-sm text-neutral-600">Cada caixa pertence a uma unidade operacional.</p></div>
          {canConfigureRegisters && <form onSubmit={createRegister} className="space-y-4 border-b border-neutral-200 pb-5">
            <FormField id="cash-config-register-unit" label="Unidade">{(field) => <Select {...field} required value={registerUnitId} onChange={(event) => setRegisterUnitId(event.target.value)}><option value="">Selecione</option>{state.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</Select>}</FormField>
            <FormField id="cash-config-register-name" label="Nome">{(field) => <Input {...field} required value={registerName} onChange={(event) => setRegisterName(event.target.value)} placeholder="Ex.: Caixa balcão" />}</FormField>
            <FormField id="cash-config-register-code" label="Código (opcional)">{(field) => <Input {...field} value={registerCode} onChange={(event) => setRegisterCode(event.target.value)} />}</FormField>
            <Button type="submit" variant="primary" loading={saving === "register"} disabled={saving !== null}>Salvar caixa</Button>
          </form>}
          {loading && state.registers.length === 0 ? <p className="text-sm text-neutral-500">Carregando caixas...</p> : state.registers.length === 0 ? <EmptyState title="Nenhum caixa configurado" description="Os caixas físicos aparecerão aqui." /> : <div className="space-y-3">{state.registers.map((register) => <div key={register.id} className="rounded-xl border border-neutral-200 p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-medium">{register.name}</p><p className="mt-1 text-xs text-neutral-500">{unitById.get(register.unitId) ?? "Unidade indisponível"}{register.code ? ` · ${register.code}` : ""}</p></div><StatusBadge tone={register.status === "active" ? "success" : "neutral"}>{register.status === "active" ? "Ativo" : "Inativo"}</StatusBadge></div></div>)}</div>}
        </Panel>

        <Panel as="section" className="space-y-5">
          <div><h2 className="text-lg font-semibold">Meios de pagamento</h2><p className="mt-1 text-sm text-neutral-600">A configuração define explicitamente se o bruto entra no dinheiro esperado da gaveta.</p></div>
          {canConfigureMethods && <form onSubmit={createMethod} className="space-y-4 border-b border-neutral-200 pb-5">
            <div className="grid gap-3 sm:grid-cols-2"><FormField id="cash-config-method-code" label="Código">{(field) => <Input {...field} required value={methodCode} onChange={(event) => setMethodCode(event.target.value)} />}</FormField><FormField id="cash-config-method-name" label="Nome">{(field) => <Input {...field} required value={methodName} onChange={(event) => setMethodName(event.target.value)} />}</FormField></div>
            <FormField id="cash-config-method-kind" label="Tipo">{(field) => <Select {...field} value={methodKind} onChange={(event) => setMethodKind(event.target.value as PaymentMethodKind)}><option value="cash">Dinheiro</option><option value="card">Cartão</option><option value="instant">Pix / instantâneo</option><option value="voucher">Voucher</option><option value="other">Outro</option></Select>}</FormField>
            <label className="flex items-start gap-3 rounded-xl border border-neutral-200 p-3 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" checked={affectsDrawer} onChange={(event) => setAffectsDrawer(event.target.checked)} /><span><strong>Afeta a gaveta</strong><span className="mt-1 block text-neutral-500">Quando marcado, o valor bruto deste meio participa do esperado físico no fechamento.</span></span></label>
            <Button type="submit" variant="primary" loading={saving === "method"} disabled={saving !== null}>Salvar meio</Button>
          </form>}
          {state.paymentMethods.length === 0 ? <EmptyState title="Nenhum meio configurado" description="Dinheiro, Pix, cartão, voucher ou outros meios aparecerão aqui quando configurados." /> : <div className="space-y-3">{state.paymentMethods.map((method) => <div key={method.id} className="rounded-xl border border-neutral-200 p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-medium">{method.name}</p><p className="mt-1 text-xs text-neutral-500">{paymentMethodKindLabel[method.methodKind]} · {method.affectsCashDrawer ? "afeta a gaveta" : "não afeta a gaveta"}</p></div><StatusBadge tone={method.status === "active" ? "success" : "neutral"}>{method.status === "active" ? "Ativo" : "Inativo"}</StatusBadge></div></div>)}</div>}
        </Panel>

        <Panel as="section" className="space-y-5">
          <div><h2 className="text-lg font-semibold">Regras de taxa</h2><p className="mt-1 text-sm text-neutral-600">Taxas são versionadas por vigência; não ficam fixas na tela.</p></div>
          {canConfigureMethods && <form onSubmit={createFeeRule} className="space-y-4 border-b border-neutral-200 pb-5">
            <FormField id="cash-config-fee-method" label="Meio de pagamento">{(field) => <Select {...field} required value={feeMethodId} onChange={(event) => setFeeMethodId(event.target.value)}><option value="">Selecione</option>{state.paymentMethods.filter((method) => method.status === "active").map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</Select>}</FormField>
            <div className="grid gap-3 sm:grid-cols-2"><FormField id="cash-config-fee-from" label="Vigência inicial">{(field) => <Input {...field} required type="date" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} />}</FormField><FormField id="cash-config-fee-to" label="Vigência final (opcional)">{(field) => <Input {...field} type="date" value={validTo} onChange={(event) => setValidTo(event.target.value)} />}</FormField></div>
            <div className="grid gap-3 sm:grid-cols-2"><FormField id="cash-config-fee-percent" label="Percentual (%)">{(field) => <Input {...field} required inputMode="decimal" value={percentFee} onChange={(event) => setPercentFee(event.target.value)} />}</FormField><FormField id="cash-config-fee-fixed" label="Taxa fixa (R$)">{(field) => <Input {...field} required inputMode="decimal" value={fixedFee} onChange={(event) => setFixedFee(event.target.value)} />}</FormField></div>
            <FormField id="cash-config-fee-label" label="Rótulo (opcional)">{(field) => <Input {...field} value={feeLabel} onChange={(event) => setFeeLabel(event.target.value)} placeholder="Ex.: crédito padrão" />}</FormField>
            <Button type="submit" variant="primary" loading={saving === "fee"} disabled={saving !== null}>Salvar regra</Button>
          </form>}
          {state.feeRules.length === 0 ? <EmptyState title="Nenhuma regra de taxa" description="Regras versionadas aparecerão aqui quando forem necessárias." /> : <div className="space-y-3">{state.feeRules.map((rule) => { const method = methodById.get(rule.paymentMethodId); return <div key={rule.id} className="rounded-xl border border-neutral-200 p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-medium">{rule.label ?? method?.name ?? "Regra de taxa"}</p><p className="mt-1 text-xs text-neutral-500">{method?.name ?? "Meio indisponível"} · {rule.percentFee}% + {moneyLabel(rule.fixedFee)}</p><p className="mt-1 text-xs text-neutral-500">Desde {dateLabel(rule.validFrom)}{rule.validTo ? ` até ${dateLabel(rule.validTo)}` : " · sem data final"}</p></div><StatusBadge tone={rule.status === "active" ? "success" : "neutral"}>{rule.status === "active" ? "Ativa" : "Inativa"}</StatusBadge></div></div>; })}</div>}
        </Panel>
      </div>
    </div>
  );
}
