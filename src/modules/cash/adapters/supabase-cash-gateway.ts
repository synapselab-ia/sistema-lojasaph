import { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { IdempotentCommandRegistry } from "@/lib/runtime/idempotent-command";

export type CashSessionStatus = "open" | "closed" | "cancelled";
export type PaymentMethodKind = "cash" | "card" | "instant" | "voucher" | "other";
export type CashMovementType = "cash_in" | "cash_out" | "employee_consumption";

export interface CashUnit { readonly id: EntityId; readonly name: string }
export interface CashRegister { readonly id: EntityId; readonly unitId: EntityId; readonly name: string; readonly code?: string; readonly status: "active" | "inactive" }
export interface CashPaymentMethod { readonly id: EntityId; readonly code: string; readonly name: string; readonly methodKind: PaymentMethodKind; readonly affectsCashDrawer: boolean; readonly status: "active" | "inactive" }
export interface CashFeeRule { readonly id: EntityId; readonly paymentMethodId: EntityId; readonly validFrom: string; readonly validTo?: string; readonly percentFee: string; readonly fixedFee: Money; readonly label?: string; readonly status: "active" | "inactive" }
export interface RuntimeCashSession { readonly id: EntityId; readonly cashRegisterId: EntityId; readonly businessDate: string; readonly sequence: number; readonly openingFloat: Money; readonly status: CashSessionStatus; readonly expectedCashAmount?: Money; readonly countedCashAmount?: Money; readonly cashDifference?: Money; readonly openedAt: string; readonly closedAt?: string; readonly cancelledAt?: string; readonly notes?: string }
export interface RuntimePaymentTotal { readonly id: EntityId; readonly cashSessionId: EntityId; readonly paymentMethodId: EntityId; readonly grossAmount: Money; readonly feeAmount: Money; readonly netAmount: Money; readonly feeRuleId?: EntityId }
export interface RuntimeCashMovement { readonly id: EntityId; readonly cashSessionId: EntityId; readonly movementType: CashMovementType; readonly amount: Money; readonly occurredAt: string; readonly reason?: string }
export interface CashState { readonly units: readonly CashUnit[]; readonly registers: readonly CashRegister[]; readonly paymentMethods: readonly CashPaymentMethod[]; readonly feeRules: readonly CashFeeRule[]; readonly sessions: readonly RuntimeCashSession[]; readonly totals: readonly RuntimePaymentTotal[]; readonly movements: readonly RuntimeCashMovement[] }

function cashError(scope: string, message: string): DomainError {
  const known: Record<string, string> = {
    CASH_REGISTER_NAME_REQUIRED: "Informe o nome do caixa.", PAYMENT_METHOD_IDENTITY_REQUIRED: "Informe código e nome do meio de pagamento.", INVALID_PAYMENT_METHOD_KIND: "O tipo do meio de pagamento é inválido.", INVALID_FEE_RULE_DATES: "A vigência da taxa é inválida.", INVALID_FEE_RULE_VALUE: "A taxa informada é inválida.", UNIT_NOT_AVAILABLE: "A unidade selecionada está indisponível.", PAYMENT_METHOD_NOT_AVAILABLE: "O meio de pagamento está indisponível.", INVALID_CASH_SESSION_OPENING: "Data, sequência e fundo inicial precisam ser válidos.", CASH_REGISTER_NOT_AVAILABLE: "O caixa selecionado está indisponível.", CASH_SESSION_NOT_FOUND: "A sessão de caixa não foi encontrada.", CASH_SESSION_NOT_OPEN: "A sessão de caixa não está aberta para alterações.", INVALID_PAYMENT_TOTAL: "Os totais do meio de pagamento são inválidos.", FEE_RULE_NOT_AVAILABLE: "A regra de taxa não é válida para este meio/data.", INVALID_CASH_MOVEMENT: "Tipo, valor ou data do movimento de caixa são inválidos.", INVALID_COUNTED_CASH_AMOUNT: "O valor contado precisa ser válido e não negativo.", INSUFFICIENT_ROLE: "Seu perfil não possui permissão para esta operação de caixa.", IDEMPOTENCY_KEY_CONFLICT: "A operação foi repetida com dados diferentes. Atualize a tela antes de tentar novamente.",
  };
  const code = Object.keys(known).find((candidate) => message.includes(candidate));
  return new DomainError(code ?? "SUPABASE_PERSISTENCE_ERROR", code ? known[code] : `${scope}: ${message}`);
}

export class SupabaseCashGateway {
  private readonly commands = new IdempotentCommandRegistry();

  constructor(private readonly client: SupabaseClient) {}

  async listState(organizationId: EntityId): Promise<CashState> {
    const [units, registers, methods, rules, sessions, totals, movements] = await Promise.all([
      this.client.from("units").select("id,name").eq("organization_id", organizationId).eq("status", "active").order("name"),
      this.client.from("cash_registers").select("id,unit_id,name,code,status").eq("organization_id", organizationId).order("name"),
      this.client.from("payment_methods").select("id,code,name,method_kind,affects_cash_drawer,status").eq("organization_id", organizationId).order("name"),
      this.client.from("fee_rules").select("id,payment_method_id,valid_from,valid_to,percent_fee,fixed_fee,label,status").eq("organization_id", organizationId).order("valid_from", { ascending: false }),
      this.client.from("cash_sessions").select("id,cash_register_id,business_date,sequence,opening_float,status,expected_cash_amount,counted_cash_amount,cash_difference,opened_at,closed_at,cancelled_at,notes").eq("organization_id", organizationId).order("business_date", { ascending: false }).order("sequence", { ascending: false }).limit(60),
      this.client.from("payment_method_totals").select("id,cash_session_id,payment_method_id,gross_amount,fee_amount,net_amount,fee_rule_id").eq("organization_id", organizationId),
      this.client.from("cash_movements").select("id,cash_session_id,movement_type,amount,occurred_at,reason").eq("organization_id", organizationId).order("occurred_at", { ascending: false }).limit(300),
    ]);
    const results = [units, registers, methods, rules, sessions, totals, movements];
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) throw cashError("Não foi possível carregar o caixa", firstError.message);
    return Object.freeze({
      units: Object.freeze((units.data ?? []).map((row) => Object.freeze({ id: row.id as EntityId, name: row.name as string }))),
      registers: Object.freeze((registers.data ?? []).map((row) => Object.freeze({ id: row.id as EntityId, unitId: row.unit_id as EntityId, name: row.name as string, code: (row.code as string | null) ?? undefined, status: row.status as "active" | "inactive" }))),
      paymentMethods: Object.freeze((methods.data ?? []).map((row) => Object.freeze({ id: row.id as EntityId, code: row.code as string, name: row.name as string, methodKind: row.method_kind as PaymentMethodKind, affectsCashDrawer: row.affects_cash_drawer as boolean, status: row.status as "active" | "inactive" }))),
      feeRules: Object.freeze((rules.data ?? []).map((row) => Object.freeze({ id: row.id as EntityId, paymentMethodId: row.payment_method_id as EntityId, validFrom: row.valid_from as string, validTo: (row.valid_to as string | null) ?? undefined, percentFee: String(row.percent_fee), fixedFee: Money.fromDecimal(String(row.fixed_fee)), label: (row.label as string | null) ?? undefined, status: row.status as "active" | "inactive" }))),
      sessions: Object.freeze((sessions.data ?? []).map((row) => Object.freeze({ id: row.id as EntityId, cashRegisterId: row.cash_register_id as EntityId, businessDate: row.business_date as string, sequence: row.sequence as number, openingFloat: Money.fromDecimal(String(row.opening_float)), status: row.status as CashSessionStatus, expectedCashAmount: row.expected_cash_amount == null ? undefined : Money.fromDecimal(String(row.expected_cash_amount)), countedCashAmount: row.counted_cash_amount == null ? undefined : Money.fromDecimal(String(row.counted_cash_amount)), cashDifference: row.cash_difference == null ? undefined : Money.fromDecimal(String(row.cash_difference)), openedAt: row.opened_at as string, closedAt: (row.closed_at as string | null) ?? undefined, cancelledAt: (row.cancelled_at as string | null) ?? undefined, notes: (row.notes as string | null) ?? undefined }))),
      totals: Object.freeze((totals.data ?? []).map((row) => Object.freeze({ id: row.id as EntityId, cashSessionId: row.cash_session_id as EntityId, paymentMethodId: row.payment_method_id as EntityId, grossAmount: Money.fromDecimal(String(row.gross_amount)), feeAmount: Money.fromDecimal(String(row.fee_amount)), netAmount: Money.fromDecimal(String(row.net_amount)), feeRuleId: row.fee_rule_id ? row.fee_rule_id as EntityId : undefined }))),
      movements: Object.freeze((movements.data ?? []).map((row) => Object.freeze({ id: row.id as EntityId, cashSessionId: row.cash_session_id as EntityId, movementType: row.movement_type as CashMovementType, amount: Money.fromDecimal(String(row.amount)), occurredAt: row.occurred_at as string, reason: (row.reason as string | null) ?? undefined }))),
    });
  }

  private async rpc(name: string, args: Record<string, unknown>, scope: string): Promise<unknown> {
    const { data, error } = await this.client.rpc(name, args);
    if (error) throw cashError(scope, error.message);
    return data;
  }

  private command<T>(
    intentScope: string,
    rpcName: string,
    semanticArgs: Record<string, unknown>,
    errorScope: string,
  ): Promise<T> {
    return this.commands.execute(intentScope, semanticArgs, async (commandId) => this.rpc(
      rpcName,
      { p_command_id: commandId, ...semanticArgs },
      errorScope,
    ) as Promise<T>);
  }

  async createRegister(input: { organizationId: EntityId; unitId: EntityId; name: string; code?: string }): Promise<void> {
    await this.command("cash:create-register", "create_cash_register", {
      p_organization_id: input.organizationId,
      p_unit_id: input.unitId,
      p_name: input.name.trim(),
      p_code: input.code?.trim() || null,
    }, "Não foi possível criar o caixa");
  }

  async createPaymentMethod(input: { organizationId: EntityId; code: string; name: string; methodKind: PaymentMethodKind; affectsCashDrawer: boolean }): Promise<void> {
    await this.command("cash:create-payment-method", "create_payment_method", {
      p_organization_id: input.organizationId,
      p_code: input.code.trim(),
      p_name: input.name.trim(),
      p_method_kind: input.methodKind,
      p_affects_cash_drawer: input.affectsCashDrawer,
    }, "Não foi possível criar o meio de pagamento");
  }

  async createFeeRule(input: { organizationId: EntityId; paymentMethodId: EntityId; validFrom: string; validTo?: string; percentFee: string; fixedFee: string; label?: string }): Promise<void> {
    await this.command(`cash:create-fee-rule:${input.paymentMethodId}`, "create_fee_rule", {
      p_organization_id: input.organizationId,
      p_payment_method_id: input.paymentMethodId,
      p_valid_from: input.validFrom,
      p_valid_to: input.validTo || null,
      p_percent_fee: input.percentFee.trim(),
      p_fixed_fee: Money.fromDecimal(input.fixedFee).toDecimal(),
      p_label: input.label?.trim() || null,
    }, "Não foi possível criar a regra de taxa");
  }

  async openSession(input: { organizationId: EntityId; cashRegisterId: EntityId; businessDate: string; sequence: number; openingFloat: string; notes?: string }): Promise<void> {
    await this.command(`cash:open-session:${input.cashRegisterId}`, "open_cash_session", {
      p_organization_id: input.organizationId,
      p_cash_register_id: input.cashRegisterId,
      p_business_date: input.businessDate,
      p_sequence: input.sequence,
      p_opening_float: Money.fromDecimal(input.openingFloat).toDecimal(),
      p_notes: input.notes?.trim() || null,
    }, "Não foi possível abrir a sessão");
  }

  async setPaymentTotal(input: { organizationId: EntityId; cashSessionId: EntityId; paymentMethodId: EntityId; grossAmount: string; feeAmount?: string; feeRuleId?: EntityId }): Promise<void> {
    await this.command(`cash:set-total:${input.cashSessionId}:${input.paymentMethodId}`, "set_cash_payment_total", {
      p_organization_id: input.organizationId,
      p_cash_session_id: input.cashSessionId,
      p_payment_method_id: input.paymentMethodId,
      p_gross_amount: Money.fromDecimal(input.grossAmount).toDecimal(),
      p_fee_amount: input.feeAmount?.trim() ? Money.fromDecimal(input.feeAmount).toDecimal() : null,
      p_fee_rule_id: input.feeRuleId ?? null,
    }, "Não foi possível registrar o total do meio de pagamento");
  }

  async recordMovement(input: { organizationId: EntityId; cashSessionId: EntityId; movementType: CashMovementType; amount: string; occurredAt: string; reason?: string }): Promise<void> {
    await this.command(`cash:movement:${input.cashSessionId}`, "record_cash_movement", {
      p_organization_id: input.organizationId,
      p_cash_session_id: input.cashSessionId,
      p_movement_type: input.movementType,
      p_amount: Money.fromDecimal(input.amount).toDecimal(),
      p_occurred_at: input.occurredAt,
      p_reason: input.reason?.trim() || null,
    }, "Não foi possível registrar o movimento");
  }

  async closeSession(input: { organizationId: EntityId; cashSessionId: EntityId; countedCashAmount: string; notes?: string }): Promise<void> {
    await this.command(`cash:close-session:${input.cashSessionId}`, "close_cash_session", {
      p_organization_id: input.organizationId,
      p_cash_session_id: input.cashSessionId,
      p_counted_cash_amount: Money.fromDecimal(input.countedCashAmount).toDecimal(),
      p_notes: input.notes?.trim() || null,
    }, "Não foi possível fechar a sessão");
  }

  async cancelSession(input: { organizationId: EntityId; cashSessionId: EntityId; reason?: string }): Promise<void> {
    await this.command(`cash:cancel-session:${input.cashSessionId}`, "cancel_cash_session", {
      p_organization_id: input.organizationId,
      p_cash_session_id: input.cashSessionId,
      p_reason: input.reason?.trim() || null,
    }, "Não foi possível cancelar a sessão");
  }
}
