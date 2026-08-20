import { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import { IdempotentCommandRegistry } from "@/lib/runtime/idempotent-command";

export type RuntimeInventoryCountStatus = "counting" | "confirmed" | "cancelled";

export interface RuntimeInventoryCountLine {
  readonly id: EntityId;
  readonly stockItemId: EntityId;
  readonly expectedQuantity: Quantity;
  readonly expectedAverageCost: Money;
  readonly countedQuantity?: Quantity;
  readonly adjustmentUnitCost?: Money;
}

export interface RuntimeInventoryCount {
  readonly id: EntityId;
  readonly stockLocationId: EntityId;
  readonly status: RuntimeInventoryCountStatus;
  readonly startedAt: string;
  readonly confirmedAt?: string;
  readonly lines: readonly RuntimeInventoryCountLine[];
}

interface CountRow {
  id: string;
  stock_location_id: string;
  status: RuntimeInventoryCountStatus;
  started_at: string;
  confirmed_at: string | null;
}

interface CountLineRow {
  id: string;
  inventory_count_id: string;
  stock_item_id: string;
  expected_quantity: string | number;
  expected_average_cost: string | number;
  counted_quantity: string | number | null;
  adjustment_unit_cost: string | number | null;
}

function rpcError(scope: string, message: string): DomainError {
  const known: Record<string, string> = {
    INVENTORY_COUNT_ALREADY_OPEN: "Já existe um inventário em andamento neste local.",
    INVENTORY_COUNT_INCOMPLETE: "Todas as linhas precisam ser contadas antes da confirmação.",
    INVENTORY_COUNT_STALE: "O estoque mudou depois do início da contagem. Cancele esta sessão e inicie um novo inventário.",
    TRACKED_POSITIVE_ADJUSTMENT_REQUIRES_LOT: "Há aumento físico em item rastreado por lote/validade. Esta versão não cria lote desconhecido; corrija a contagem ou trate o lote explicitamente.",
    POSITIVE_ADJUSTMENT_COST_REQUIRED: "Informe o custo unitário para criar estoque positivo sem custo-base anterior.",
    INVENTORY_BATCH_STOCK_MISMATCH: "Os lotes disponíveis não reconciliam com o saldo agregado. A confirmação foi cancelada sem ajustes parciais.",
    INVENTORY_COUNT_NOT_EDITABLE: "Este inventário não aceita mais alterações.",
    CONFIRMED_INVENTORY_COUNT_IMMUTABLE: "Inventário confirmado é imutável.",
    IDEMPOTENCY_KEY_CONFLICT: "A operação foi repetida com dados diferentes. Atualize a tela antes de tentar novamente.",
  };
  const code = Object.keys(known).find((candidate) => message.includes(candidate));
  return new DomainError(code ?? "SUPABASE_PERSISTENCE_ERROR", code ? known[code] : `${scope}: ${message}`);
}

export class SupabaseInventoryCountGateway {
  private readonly commands = new IdempotentCommandRegistry();

  constructor(private readonly client: SupabaseClient) {}

  async list(organizationId: EntityId): Promise<readonly RuntimeInventoryCount[]> {
    const { data: countsData, error: countsError } = await this.client
      .from("inventory_counts")
      .select("id, stock_location_id, status, started_at, confirmed_at")
      .eq("organization_id", organizationId)
      .order("started_at", { ascending: false })
      .limit(20);

    if (countsError) throw rpcError("Não foi possível carregar os inventários", countsError.message);
    const counts = (countsData ?? []) as CountRow[];
    if (counts.length === 0) return [];

    const ids = counts.map((count) => count.id);
    const { data: linesData, error: linesError } = await this.client
      .from("inventory_count_lines")
      .select("id, inventory_count_id, stock_item_id, expected_quantity, expected_average_cost, counted_quantity, adjustment_unit_cost")
      .eq("organization_id", organizationId)
      .in("inventory_count_id", ids)
      .order("stock_item_id", { ascending: true });

    if (linesError) throw rpcError("Não foi possível carregar as linhas do inventário", linesError.message);
    const linesByCount = new Map<string, RuntimeInventoryCountLine[]>();

    for (const row of (linesData ?? []) as CountLineRow[]) {
      const line: RuntimeInventoryCountLine = Object.freeze({
        id: row.id as EntityId,
        stockItemId: row.stock_item_id as EntityId,
        expectedQuantity: Quantity.fromDecimal(String(row.expected_quantity)),
        expectedAverageCost: Money.fromDecimal(String(row.expected_average_cost)),
        countedQuantity: row.counted_quantity === null ? undefined : Quantity.fromDecimal(String(row.counted_quantity)),
        adjustmentUnitCost: row.adjustment_unit_cost === null ? undefined : Money.fromDecimal(String(row.adjustment_unit_cost)),
      });
      const current = linesByCount.get(row.inventory_count_id) ?? [];
      current.push(line);
      linesByCount.set(row.inventory_count_id, current);
    }

    return counts.map((count) => Object.freeze({
      id: count.id as EntityId,
      stockLocationId: count.stock_location_id as EntityId,
      status: count.status,
      startedAt: count.started_at,
      confirmedAt: count.confirmed_at ?? undefined,
      lines: Object.freeze(linesByCount.get(count.id) ?? []),
    }));
  }

  async start(organizationId: EntityId, stockLocationId: EntityId): Promise<EntityId> {
    const semanticPayload = { organizationId, stockLocationId };
    return this.commands.execute("inventory-count:start", semanticPayload, async (commandId) => {
      const { data, error } = await this.client.rpc("start_inventory_count", {
        p_command_id: commandId,
        p_organization_id: organizationId,
        p_stock_location_id: stockLocationId,
      });
      if (error) throw rpcError("Não foi possível iniciar o inventário", error.message);
      const row = (data as { inventory_count_id: string }[] | null)?.[0];
      if (!row) throw new DomainError("SUPABASE_PERSISTENCE_ERROR", "O comando de inventário não retornou a sessão criada.");
      return row.inventory_count_id as EntityId;
    });
  }

  async setLine(input: {
    organizationId: EntityId;
    inventoryCountId: EntityId;
    stockItemId: EntityId;
    countedQuantity: string;
    adjustmentUnitCost?: string;
  }): Promise<void> {
    const counted = Quantity.fromDecimal(input.countedQuantity);
    if (counted.isNegative()) throw new DomainError("INVALID_COUNTED_QUANTITY", "A contagem física não pode ser negativa.");
    const cost = input.adjustmentUnitCost?.trim() ? Money.fromDecimal(input.adjustmentUnitCost) : undefined;
    if (cost?.isNegative()) throw new DomainError("INVALID_ADJUSTMENT_COST", "O custo de ajuste não pode ser negativo.");

    const semanticPayload = {
      organizationId: input.organizationId,
      inventoryCountId: input.inventoryCountId,
      stockItemId: input.stockItemId,
      countedQuantity: counted.toDecimal(),
      adjustmentUnitCost: cost?.toDecimal() ?? null,
    };

    await this.commands.execute(
      `inventory-count:line:${input.inventoryCountId}:${input.stockItemId}`,
      semanticPayload,
      async (commandId) => {
        const { error } = await this.client.rpc("set_inventory_count_line", {
          p_command_id: commandId,
          p_organization_id: semanticPayload.organizationId,
          p_inventory_count_id: semanticPayload.inventoryCountId,
          p_stock_item_id: semanticPayload.stockItemId,
          p_counted_quantity: semanticPayload.countedQuantity,
          p_adjustment_unit_cost: semanticPayload.adjustmentUnitCost,
        });
        if (error) throw rpcError("Não foi possível salvar a contagem", error.message);
      },
    );
  }

  async confirm(organizationId: EntityId, inventoryCountId: EntityId): Promise<void> {
    const semanticPayload = { organizationId, inventoryCountId };
    await this.commands.execute(`inventory-count:confirm:${inventoryCountId}`, semanticPayload, async (commandId) => {
      const { error } = await this.client.rpc("confirm_inventory_count", {
        p_command_id: commandId,
        p_organization_id: organizationId,
        p_inventory_count_id: inventoryCountId,
      });
      if (error) throw rpcError("Não foi possível confirmar o inventário", error.message);
    });
  }

  async cancel(organizationId: EntityId, inventoryCountId: EntityId): Promise<void> {
    const semanticPayload = { organizationId, inventoryCountId };
    await this.commands.execute(`inventory-count:cancel:${inventoryCountId}`, semanticPayload, async (commandId) => {
      const { error } = await this.client.rpc("cancel_inventory_count", {
        p_command_id: commandId,
        p_organization_id: organizationId,
        p_inventory_count_id: inventoryCountId,
      });
      if (error) throw rpcError("Não foi possível cancelar o inventário", error.message);
    });
  }
}
