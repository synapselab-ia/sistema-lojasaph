import { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import { IdempotentCommandRegistry } from "@/lib/runtime/idempotent-command";
import {
  CreateStockLoanInput,
  CreateStockLoanResult,
  RecordStockLoanRestitutionInput,
  RecordStockLoanRestitutionResult,
  RuntimeStockLoan,
  RuntimeStockLoanRestitution,
  StockLoanStatus,
} from "../domain/stock-loan";
import { StockLoanGateway } from "../repositories/stock-loan-gateway";

interface StockLoanRow {
  id: string;
  stock_item_id: string;
  source_location_id: string;
  counterparty: string;
  original_quantity: number | string;
  original_value: number | string;
  physical_returned_quantity: number | string;
  physical_returned_value: number | string;
  monetary_settled_amount: number | string;
  remaining_physical_quantity: number | string;
  remaining_value: number | string;
  preferred_batch_id: string | null;
  status: StockLoanStatus;
  loaned_at: string;
  settled_at: string | null;
  notes: string | null;
}

interface StockLoanRestitutionRow {
  id: string;
  stock_loan_id: string;
  physical_quantity: number | string;
  physical_value: number | string;
  monetary_amount: number | string;
  physical_movement_id: string | null;
  remaining_physical_quantity_after: number | string;
  remaining_value_after: number | string;
  occurred_at: string;
  notes: string | null;
}

interface CreateStockLoanRpcRow {
  loan_id: string;
  stock_item_id: string;
  source_location_id: string;
  original_quantity: number | string;
  original_value: number | string;
  remaining_physical_quantity: number | string;
  remaining_value: number | string;
  status: StockLoanStatus;
  quantity_on_hand: number | string;
  average_cost: number | string;
}

interface RestitutionRpcRow {
  restitution_id: string;
  loan_id: string;
  physical_quantity: number | string;
  physical_value: number | string;
  monetary_amount: number | string;
  remaining_physical_quantity: number | string;
  remaining_value: number | string;
  status: StockLoanStatus;
  quantity_on_hand: number | string;
  average_cost: number | string;
}

const LOAN_SELECT = [
  "id",
  "stock_item_id",
  "source_location_id",
  "counterparty",
  "original_quantity",
  "original_value",
  "physical_returned_quantity",
  "physical_returned_value",
  "monetary_settled_amount",
  "remaining_physical_quantity",
  "remaining_value",
  "preferred_batch_id",
  "status",
  "loaned_at",
  "settled_at",
  "notes",
].join(",");

const RESTITUTION_SELECT = [
  "id",
  "stock_loan_id",
  "physical_quantity",
  "physical_value",
  "monetary_amount",
  "physical_movement_id",
  "remaining_physical_quantity_after",
  "remaining_value_after",
  "occurred_at",
  "notes",
].join(",");

function persistenceError(message: string, cause?: string): DomainError {
  if (cause?.includes("IDEMPOTENCY_KEY_CONFLICT")) {
    return new DomainError(
      "IDEMPOTENCY_KEY_CONFLICT",
      "A operação foi repetida com dados diferentes. Atualize a tela antes de tentar novamente.",
    );
  }
  if (cause?.includes("STOCK_LOAN_PHYSICAL_OVER_RETURN")) {
    return new DomainError("STOCK_LOAN_PHYSICAL_OVER_RETURN", "A quantidade devolvida supera o saldo físico do empréstimo.");
  }
  if (cause?.includes("STOCK_LOAN_SETTLEMENT_EXCEEDS_BALANCE")) {
    return new DomainError("STOCK_LOAN_SETTLEMENT_EXCEEDS_BALANCE", "A restituição supera o valor ainda pendente do empréstimo.");
  }
  if (cause?.includes("STOCK_LOAN_ALREADY_SETTLED")) {
    return new DomainError("STOCK_LOAN_ALREADY_SETTLED", "Este empréstimo já está liquidado.");
  }
  if (cause?.includes("INSUFFICIENT_SCOPE") || cause?.includes("INSUFFICIENT_ROLE")) {
    return new DomainError("INSUFFICIENT_ROLE", "Seu perfil não pode operar este empréstimo no local selecionado.");
  }
  return new DomainError("SUPABASE_PERSISTENCE_ERROR", cause ? `${message}: ${cause}` : message);
}

function toLoan(row: StockLoanRow): RuntimeStockLoan {
  return Object.freeze({
    id: row.id as EntityId,
    stockItemId: row.stock_item_id as EntityId,
    sourceLocationId: row.source_location_id as EntityId,
    counterparty: row.counterparty,
    originalQuantity: Quantity.fromDecimal(String(row.original_quantity)),
    originalValue: Money.fromDecimal(String(row.original_value)),
    physicalReturnedQuantity: Quantity.fromDecimal(String(row.physical_returned_quantity)),
    physicalReturnedValue: Money.fromDecimal(String(row.physical_returned_value)),
    monetarySettledAmount: Money.fromDecimal(String(row.monetary_settled_amount)),
    remainingPhysicalQuantity: Quantity.fromDecimal(String(row.remaining_physical_quantity)),
    remainingValue: Money.fromDecimal(String(row.remaining_value)),
    preferredBatchId: row.preferred_batch_id ? row.preferred_batch_id as EntityId : undefined,
    status: row.status,
    loanedAt: row.loaned_at,
    settledAt: row.settled_at ?? undefined,
    notes: row.notes ?? undefined,
  });
}

function toRestitution(row: StockLoanRestitutionRow): RuntimeStockLoanRestitution {
  return Object.freeze({
    id: row.id as EntityId,
    stockLoanId: row.stock_loan_id as EntityId,
    physicalQuantity: Quantity.fromDecimal(String(row.physical_quantity)),
    physicalValue: Money.fromDecimal(String(row.physical_value)),
    monetaryAmount: Money.fromDecimal(String(row.monetary_amount)),
    physicalMovementId: row.physical_movement_id ? row.physical_movement_id as EntityId : undefined,
    remainingPhysicalQuantityAfter: Quantity.fromDecimal(String(row.remaining_physical_quantity_after)),
    remainingValueAfter: Money.fromDecimal(String(row.remaining_value_after)),
    occurredAt: row.occurred_at,
    notes: row.notes ?? undefined,
  });
}

export class SupabaseStockLoanGateway implements StockLoanGateway {
  private readonly commands = new IdempotentCommandRegistry();

  constructor(private readonly client: SupabaseClient) {}

  async listByOrganization(organizationId: EntityId): Promise<readonly RuntimeStockLoan[]> {
    const { data, error } = await this.client
      .from("stock_loans")
      .select(LOAN_SELECT)
      .eq("organization_id", organizationId)
      .order("loaned_at", { ascending: false })
      .limit(100);

    if (error) throw persistenceError("Falha ao carregar empréstimos", error.message);
    return Object.freeze(((data ?? []) as StockLoanRow[]).map(toLoan));
  }

  async findById(organizationId: EntityId, loanId: EntityId): Promise<RuntimeStockLoan | null> {
    const { data, error } = await this.client
      .from("stock_loans")
      .select(LOAN_SELECT)
      .eq("organization_id", organizationId)
      .eq("id", loanId)
      .maybeSingle();

    if (error) throw persistenceError("Falha ao carregar empréstimo", error.message);
    return data ? toLoan(data as StockLoanRow) : null;
  }

  async listRestitutions(organizationId: EntityId, loanId: EntityId): Promise<readonly RuntimeStockLoanRestitution[]> {
    const { data, error } = await this.client
      .from("stock_loan_restitutions")
      .select(RESTITUTION_SELECT)
      .eq("organization_id", organizationId)
      .eq("stock_loan_id", loanId)
      .order("occurred_at", { ascending: false })
      .limit(100);

    if (error) throw persistenceError("Falha ao carregar restituições do empréstimo", error.message);
    return Object.freeze(((data ?? []) as StockLoanRestitutionRow[]).map(toRestitution));
  }

  async create(input: CreateStockLoanInput): Promise<CreateStockLoanResult> {
    const quantity = Quantity.fromDecimal(input.quantity);
    const counterparty = input.counterparty.trim();
    if (!quantity.isPositive()) throw new DomainError("INVALID_STOCK_QUANTITY", "A quantidade emprestada deve ser maior que zero.");
    if (!counterparty) throw new DomainError("STOCK_LOAN_COUNTERPARTY_REQUIRED", "Informe a contraparte do empréstimo.");

    const semanticPayload = {
      organizationId: input.organizationId,
      stockItemId: input.stockItemId,
      sourceLocationId: input.sourceLocationId,
      counterparty,
      quantity: quantity.toDecimal(),
      preferredBatchId: input.preferredBatchId ?? null,
      notes: input.notes?.trim() || null,
    };

    const execute = async (commandId: EntityId): Promise<CreateStockLoanResult> => {
      const { data, error } = await this.client.rpc("record_stock_loan", {
        p_command_id: commandId,
        p_organization_id: semanticPayload.organizationId,
        p_stock_item_id: semanticPayload.stockItemId,
        p_source_location_id: semanticPayload.sourceLocationId,
        p_counterparty: semanticPayload.counterparty,
        p_quantity: semanticPayload.quantity,
        p_preferred_batch_id: semanticPayload.preferredBatchId,
        p_notes: semanticPayload.notes,
      });

      if (error) throw persistenceError("Falha ao registrar empréstimo", error.message);
      const row = (data as CreateStockLoanRpcRow[] | null)?.[0];
      if (!row) throw persistenceError("O comando de empréstimo não retornou resultado");

      const loan = await this.findById(input.organizationId, row.loan_id as EntityId);
      if (!loan) throw persistenceError("O empréstimo foi registrado, mas não pôde ser recarregado");

      return {
        loan,
        balance: Object.freeze({
          stockItemId: row.stock_item_id as EntityId,
          stockLocationId: row.source_location_id as EntityId,
          quantity: Quantity.fromDecimal(String(row.quantity_on_hand)),
          averageCost: Money.fromDecimal(String(row.average_cost)),
        }),
      };
    };

    if (input.commandId) return execute(input.commandId);
    return this.commands.execute(
      `stock-loan:create:${input.organizationId}:${input.sourceLocationId}:${input.stockItemId}:${counterparty}`,
      semanticPayload,
      execute,
    );
  }

  async recordRestitution(input: RecordStockLoanRestitutionInput): Promise<RecordStockLoanRestitutionResult> {
    const physicalQuantity = Quantity.fromDecimal(input.physicalQuantity?.trim() || "0");
    const monetaryAmount = Money.fromDecimal(input.monetaryAmount?.trim() || "0");
    if (physicalQuantity.isNegative()) throw new DomainError("INVALID_STOCK_QUANTITY", "A quantidade física não pode ser negativa.");
    if (monetaryAmount.isNegative()) throw new DomainError("INVALID_STOCK_LOAN_AMOUNT", "O valor restituído não pode ser negativo.");
    if (physicalQuantity.isZero() && monetaryAmount.cents === 0) {
      throw new DomainError("STOCK_LOAN_RESTITUTION_REQUIRED", "Informe uma devolução física, um valor restituído ou ambos.");
    }

    const semanticPayload = {
      organizationId: input.organizationId,
      stockLoanId: input.stockLoanId,
      physicalQuantity: physicalQuantity.toDecimal(),
      monetaryAmount: monetaryAmount.toDecimal(),
      notes: input.notes?.trim() || null,
    };

    const execute = async (commandId: EntityId): Promise<RecordStockLoanRestitutionResult> => {
      const { data, error } = await this.client.rpc("record_stock_loan_restitution", {
        p_command_id: commandId,
        p_organization_id: semanticPayload.organizationId,
        p_stock_loan_id: semanticPayload.stockLoanId,
        p_physical_quantity: semanticPayload.physicalQuantity,
        p_monetary_amount: semanticPayload.monetaryAmount,
        p_notes: semanticPayload.notes,
      });

      if (error) throw persistenceError("Falha ao registrar restituição do empréstimo", error.message);
      const row = (data as RestitutionRpcRow[] | null)?.[0];
      if (!row) throw persistenceError("O comando de restituição não retornou resultado");

      const [{ data: restitutionData, error: restitutionError }, loan] = await Promise.all([
        this.client
          .from("stock_loan_restitutions")
          .select(RESTITUTION_SELECT)
          .eq("organization_id", input.organizationId)
          .eq("id", row.restitution_id)
          .single(),
        this.findById(input.organizationId, input.stockLoanId),
      ]);

      if (restitutionError) throw persistenceError("Falha ao recarregar restituição", restitutionError.message);
      if (!loan) throw persistenceError("O empréstimo não pôde ser recarregado após a restituição");

      return {
        restitution: toRestitution(restitutionData as StockLoanRestitutionRow),
        loanStatus: row.status,
        balance: Object.freeze({
          stockItemId: loan.stockItemId,
          stockLocationId: loan.sourceLocationId,
          quantity: Quantity.fromDecimal(String(row.quantity_on_hand)),
          averageCost: Money.fromDecimal(String(row.average_cost)),
        }),
      };
    };

    if (input.commandId) return execute(input.commandId);
    return this.commands.execute(
      `stock-loan:restitution:${input.stockLoanId}`,
      semanticPayload,
      execute,
    );
  }
}
