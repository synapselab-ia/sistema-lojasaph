import { SupabaseClient } from "@supabase/supabase-js";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import {
  CashFeeRule,
  CashPaymentMethod,
  CashRegister,
  CashSessionStatus,
  CashUnit,
  CashMovementType,
  PaymentMethodKind,
  RuntimeCashMovement,
  RuntimeCashSession,
  RuntimePaymentTotal,
} from "./supabase-cash-gateway";

export interface CashSessionDetail {
  readonly session: RuntimeCashSession;
  readonly register: CashRegister;
  readonly unit: CashUnit;
  readonly paymentMethods: readonly CashPaymentMethod[];
  readonly feeRules: readonly CashFeeRule[];
  readonly totals: readonly RuntimePaymentTotal[];
  readonly movements: readonly RuntimeCashMovement[];
}

export class SupabaseCashDetailGateway {
  constructor(private readonly client: SupabaseClient) {}

  async getSession(organizationId: EntityId, sessionId: EntityId): Promise<CashSessionDetail | null> {
    const sessionResult = await this.client
      .from("cash_sessions")
      .select("id,cash_register_id,business_date,sequence,opening_float,status,expected_cash_amount,counted_cash_amount,cash_difference,opened_at,closed_at,cancelled_at,notes")
      .eq("organization_id", organizationId)
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionResult.error) throw new Error(`Não foi possível carregar a sessão: ${sessionResult.error.message}`);
    if (!sessionResult.data) return null;

    const row = sessionResult.data;
    const [registerResult, methodsResult, rulesResult, totalsResult, movementsResult] = await Promise.all([
      this.client.from("cash_registers").select("id,unit_id,name,code,status").eq("organization_id", organizationId).eq("id", row.cash_register_id).maybeSingle(),
      this.client.from("payment_methods").select("id,code,name,method_kind,affects_cash_drawer,status").eq("organization_id", organizationId).order("name"),
      this.client.from("fee_rules").select("id,payment_method_id,valid_from,valid_to,percent_fee,fixed_fee,label,status").eq("organization_id", organizationId).order("valid_from", { ascending: false }),
      this.client.from("payment_method_totals").select("id,cash_session_id,payment_method_id,gross_amount,fee_amount,net_amount,fee_rule_id").eq("organization_id", organizationId).eq("cash_session_id", sessionId),
      this.client.from("cash_movements").select("id,cash_session_id,movement_type,amount,occurred_at,reason").eq("organization_id", organizationId).eq("cash_session_id", sessionId).order("occurred_at", { ascending: false }),
    ]);

    const firstError = [registerResult, methodsResult, rulesResult, totalsResult, movementsResult].find((result) => result.error)?.error;
    if (firstError) throw new Error(`Não foi possível carregar os detalhes da sessão: ${firstError.message}`);
    if (!registerResult.data) return null;

    const unitResult = await this.client
      .from("units")
      .select("id,name")
      .eq("organization_id", organizationId)
      .eq("id", registerResult.data.unit_id)
      .maybeSingle();
    if (unitResult.error) throw new Error(`Não foi possível carregar a unidade da sessão: ${unitResult.error.message}`);
    if (!unitResult.data) return null;

    return Object.freeze({
      session: Object.freeze({
        id: row.id as EntityId,
        cashRegisterId: row.cash_register_id as EntityId,
        businessDate: row.business_date as string,
        sequence: row.sequence as number,
        openingFloat: Money.fromDecimal(String(row.opening_float)),
        status: row.status as CashSessionStatus,
        expectedCashAmount: row.expected_cash_amount == null ? undefined : Money.fromDecimal(String(row.expected_cash_amount)),
        countedCashAmount: row.counted_cash_amount == null ? undefined : Money.fromDecimal(String(row.counted_cash_amount)),
        cashDifference: row.cash_difference == null ? undefined : Money.fromDecimal(String(row.cash_difference)),
        openedAt: row.opened_at as string,
        closedAt: (row.closed_at as string | null) ?? undefined,
        cancelledAt: (row.cancelled_at as string | null) ?? undefined,
        notes: (row.notes as string | null) ?? undefined,
      }),
      register: Object.freeze({
        id: registerResult.data.id as EntityId,
        unitId: registerResult.data.unit_id as EntityId,
        name: registerResult.data.name as string,
        code: (registerResult.data.code as string | null) ?? undefined,
        status: registerResult.data.status as "active" | "inactive",
      }),
      unit: Object.freeze({ id: unitResult.data.id as EntityId, name: unitResult.data.name as string }),
      paymentMethods: Object.freeze((methodsResult.data ?? []).map((method) => Object.freeze({
        id: method.id as EntityId,
        code: method.code as string,
        name: method.name as string,
        methodKind: method.method_kind as PaymentMethodKind,
        affectsCashDrawer: method.affects_cash_drawer as boolean,
        status: method.status as "active" | "inactive",
      }))),
      feeRules: Object.freeze((rulesResult.data ?? []).map((rule) => Object.freeze({
        id: rule.id as EntityId,
        paymentMethodId: rule.payment_method_id as EntityId,
        validFrom: rule.valid_from as string,
        validTo: (rule.valid_to as string | null) ?? undefined,
        percentFee: String(rule.percent_fee),
        fixedFee: Money.fromDecimal(String(rule.fixed_fee)),
        label: (rule.label as string | null) ?? undefined,
        status: rule.status as "active" | "inactive",
      }))),
      totals: Object.freeze((totalsResult.data ?? []).map((total) => Object.freeze({
        id: total.id as EntityId,
        cashSessionId: total.cash_session_id as EntityId,
        paymentMethodId: total.payment_method_id as EntityId,
        grossAmount: Money.fromDecimal(String(total.gross_amount)),
        feeAmount: Money.fromDecimal(String(total.fee_amount)),
        netAmount: Money.fromDecimal(String(total.net_amount)),
        feeRuleId: total.fee_rule_id ? total.fee_rule_id as EntityId : undefined,
      }))),
      movements: Object.freeze((movementsResult.data ?? []).map((movement) => Object.freeze({
        id: movement.id as EntityId,
        cashSessionId: movement.cash_session_id as EntityId,
        movementType: movement.movement_type as CashMovementType,
        amount: Money.fromDecimal(String(movement.amount)),
        occurredAt: movement.occurred_at as string,
        reason: (movement.reason as string | null) ?? undefined,
      }))),
    });
  }
}
