import { SupabaseClient } from "@supabase/supabase-js";
import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import { IdempotentCommandRegistry } from "@/lib/runtime/idempotent-command";

export type PurchaseOrderStatus = "draft" | "ordered" | "partially_received" | "received" | "cancelled";

export interface SupplierPurchaseItem {
  readonly supplierItemId: EntityId;
  readonly stockItemId: EntityId;
  readonly stockItemName: string;
  readonly purchaseUnit?: string;
  readonly unitsPerPackage?: Quantity;
  readonly latestUnitPrice?: Money;
}

export interface RuntimePurchaseOrderItem {
  readonly id: EntityId;
  readonly supplierItemId: EntityId;
  readonly stockItemId: EntityId;
  readonly orderedQuantity: Quantity;
  readonly receivedQuantity: Quantity;
  readonly unitPriceSnapshot: Money;
  readonly purchaseUnitSnapshot?: string;
}

export interface RuntimePurchaseOrder {
  readonly id: EntityId;
  readonly supplierId: EntityId;
  readonly stockLocationId: EntityId;
  readonly status: PurchaseOrderStatus;
  readonly expectedDeliveryDate?: string;
  readonly orderedAt?: string;
  readonly notes?: string;
  readonly createdAt: string;
  readonly items: readonly RuntimePurchaseOrderItem[];
}

export interface RuntimePurchaseReceiptItem {
  readonly id: EntityId;
  readonly purchaseOrderItemId: EntityId;
  readonly quantity: Quantity;
  readonly unitCostSnapshot: Money;
  readonly batchCode?: string;
  readonly expirationDate?: string;
}

export interface RuntimePurchaseReceipt {
  readonly id: EntityId;
  readonly purchaseOrderId: EntityId;
  readonly receivedAt: string;
  readonly notes?: string;
  readonly items: readonly RuntimePurchaseReceiptItem[];
}

interface SupplierItemRow {
  id: string;
  stock_item_id: string;
  purchase_unit: string | null;
  units_per_package: number | string | null;
}
interface StockItemNameRow { id: string; name: string }
interface SupplierPriceRow { supplier_item_id: string; unit_price: number | string }
interface PurchaseOrderRow {
  id: string;
  supplier_id: string;
  stock_location_id: string;
  status: PurchaseOrderStatus;
  expected_delivery_date: string | null;
  ordered_at: string | null;
  notes: string | null;
  created_at: string;
}
interface PurchaseOrderItemRow {
  id: string;
  purchase_order_id: string;
  supplier_item_id: string;
  stock_item_id: string;
  ordered_quantity: number | string;
  received_quantity: number | string;
  unit_price_snapshot: number | string;
  purchase_unit_snapshot: string | null;
}
interface PurchaseReceiptRow {
  id: string;
  purchase_order_id: string;
  received_at: string;
  notes: string | null;
}
interface PurchaseReceiptItemRow {
  id: string;
  purchase_receipt_id: string;
  purchase_order_item_id: string;
  quantity: number | string;
  unit_cost_snapshot: number | string;
  batch_code: string | null;
  expiration_date: string | null;
}

function commandError(scope: string, message: string): DomainError {
  const known: Record<string, string> = {
    PURCHASE_ORDER_ITEMS_REQUIRED: "Adicione pelo menos um item ao pedido.",
    DUPLICATE_PURCHASE_ORDER_ITEM: "O mesmo item do fornecedor não pode aparecer duas vezes no pedido.",
    INVALID_PURCHASE_QUANTITY: "A quantidade pedida deve ser maior que zero e usar no máximo três casas decimais.",
    INVALID_PURCHASE_PRICE: "O preço unitário deve ser válido e usar no máximo duas casas decimais.",
    SUPPLIER_NOT_AVAILABLE: "Fornecedor indisponível para este pedido.",
    SUPPLIER_ITEM_NOT_AVAILABLE: "Um item não pertence ao fornecedor selecionado ou está inativo.",
    PURCHASE_ORDER_NOT_FOUND: "Pedido não encontrado ou indisponível no seu escopo.",
    PURCHASE_ORDER_NOT_ISSUABLE: "Somente pedidos em rascunho podem ser emitidos.",
    PURCHASE_ORDER_NOT_RECEIVABLE: "Este pedido não está disponível para recebimento.",
    PURCHASE_RECEIPT_EXCEEDS_PENDING: "A quantidade recebida não pode ultrapassar o saldo pendente do item.",
    PURCHASE_RECEIPT_ITEMS_REQUIRED: "Informe ao menos um item para receber.",
    DUPLICATE_PURCHASE_RECEIPT_ITEM: "O mesmo item do pedido não pode aparecer duas vezes no recebimento.",
    RECEIVED_PURCHASE_ORDER_IMMUTABLE: "Pedido totalmente recebido não pode ser cancelado.",
    PURCHASE_ORDER_ALREADY_CANCELLED: "Pedido já cancelado.",
    INSUFFICIENT_ROLE: "Seu perfil não possui permissão para esta operação de compras.",
    INSUFFICIENT_SCOPE: "Esta operação não está disponível no seu escopo atual.",
    IDEMPOTENCY_KEY_CONFLICT: "A operação foi repetida com dados diferentes. Atualize a tela antes de tentar novamente.",
  };
  const code = Object.keys(known).find((candidate) => message.includes(candidate));
  return new DomainError(code ?? "SUPABASE_PERSISTENCE_ERROR", code ? known[code] : `${scope}: ${message}`);
}

export class SupabasePurchaseGateway {
  private readonly commands = new IdempotentCommandRegistry();

  constructor(private readonly client: SupabaseClient) {}

  async listSupplierItems(organizationId: EntityId, supplierId: EntityId): Promise<readonly SupplierPurchaseItem[]> {
    const { data: mappingsData, error: mappingsError } = await this.client
      .from("supplier_items")
      .select("id, stock_item_id, purchase_unit, units_per_package")
      .eq("organization_id", organizationId)
      .eq("supplier_id", supplierId)
      .eq("active", true)
      .order("created_at", { ascending: true });
    if (mappingsError) throw commandError("Não foi possível carregar os itens do fornecedor", mappingsError.message);

    const mappings = (mappingsData ?? []) as SupplierItemRow[];
    if (mappings.length === 0) return [];
    const stockIds = mappings.map((row) => row.stock_item_id);
    const supplierItemIds = mappings.map((row) => row.id);

    const [stockResult, priceResult] = await Promise.all([
      this.client.from("stock_items").select("id, name").eq("organization_id", organizationId).in("id", stockIds),
      this.client
        .from("supplier_prices")
        .select("supplier_item_id, unit_price")
        .eq("organization_id", organizationId)
        .in("supplier_item_id", supplierItemIds)
        .order("observed_at", { ascending: false }),
    ]);
    if (stockResult.error) throw commandError("Não foi possível carregar os produtos do fornecedor", stockResult.error.message);
    if (priceResult.error) throw commandError("Não foi possível carregar os preços do fornecedor", priceResult.error.message);

    const names = new Map(((stockResult.data ?? []) as StockItemNameRow[]).map((row) => [row.id, row.name]));
    const latestPrices = new Map<string, Money>();
    for (const row of (priceResult.data ?? []) as SupplierPriceRow[]) {
      if (!latestPrices.has(row.supplier_item_id)) latestPrices.set(row.supplier_item_id, Money.fromDecimal(String(row.unit_price)));
    }

    return mappings.map((row) => Object.freeze({
      supplierItemId: row.id as EntityId,
      stockItemId: row.stock_item_id as EntityId,
      stockItemName: names.get(row.stock_item_id) ?? "Produto indisponível",
      purchaseUnit: row.purchase_unit ?? undefined,
      unitsPerPackage: row.units_per_package === null ? undefined : Quantity.fromDecimal(String(row.units_per_package)),
      latestUnitPrice: latestPrices.get(row.id),
    }));
  }

  private async hydrateOrders(organizationId: EntityId, rows: readonly PurchaseOrderRow[]): Promise<readonly RuntimePurchaseOrder[]> {
    if (rows.length === 0) return [];
    const { data: itemsData, error: itemsError } = await this.client
      .from("purchase_order_items")
      .select("id, purchase_order_id, supplier_item_id, stock_item_id, ordered_quantity, received_quantity, unit_price_snapshot, purchase_unit_snapshot")
      .eq("organization_id", organizationId)
      .in("purchase_order_id", rows.map((order) => order.id))
      .order("created_at", { ascending: true });
    if (itemsError) throw commandError("Não foi possível carregar os itens dos pedidos", itemsError.message);

    const itemsByOrder = new Map<string, RuntimePurchaseOrderItem[]>();
    for (const row of (itemsData ?? []) as PurchaseOrderItemRow[]) {
      const item: RuntimePurchaseOrderItem = Object.freeze({
        id: row.id as EntityId,
        supplierItemId: row.supplier_item_id as EntityId,
        stockItemId: row.stock_item_id as EntityId,
        orderedQuantity: Quantity.fromDecimal(String(row.ordered_quantity)),
        receivedQuantity: Quantity.fromDecimal(String(row.received_quantity)),
        unitPriceSnapshot: Money.fromDecimal(String(row.unit_price_snapshot)),
        purchaseUnitSnapshot: row.purchase_unit_snapshot ?? undefined,
      });
      const current = itemsByOrder.get(row.purchase_order_id) ?? [];
      current.push(item);
      itemsByOrder.set(row.purchase_order_id, current);
    }

    return rows.map((row) => Object.freeze({
      id: row.id as EntityId,
      supplierId: row.supplier_id as EntityId,
      stockLocationId: row.stock_location_id as EntityId,
      status: row.status,
      expectedDeliveryDate: row.expected_delivery_date ?? undefined,
      orderedAt: row.ordered_at ?? undefined,
      notes: row.notes ?? undefined,
      createdAt: row.created_at,
      items: Object.freeze(itemsByOrder.get(row.id) ?? []),
    }));
  }

  async listOrders(organizationId: EntityId): Promise<readonly RuntimePurchaseOrder[]> {
    const { data, error } = await this.client
      .from("purchase_orders")
      .select("id, supplier_id, stock_location_id, status, expected_delivery_date, ordered_at, notes, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw commandError("Não foi possível carregar os pedidos", error.message);
    return this.hydrateOrders(organizationId, (data ?? []) as PurchaseOrderRow[]);
  }

  async getOrder(organizationId: EntityId, purchaseOrderId: EntityId): Promise<RuntimePurchaseOrder | null> {
    const { data, error } = await this.client
      .from("purchase_orders")
      .select("id, supplier_id, stock_location_id, status, expected_delivery_date, ordered_at, notes, created_at")
      .eq("organization_id", organizationId)
      .eq("id", purchaseOrderId)
      .maybeSingle();
    if (error) throw commandError("Não foi possível carregar o pedido", error.message);
    if (!data) return null;
    const hydrated = await this.hydrateOrders(organizationId, [data as PurchaseOrderRow]);
    return hydrated[0] ?? null;
  }

  async listReceipts(organizationId: EntityId, limit = 50): Promise<readonly RuntimePurchaseReceipt[]> {
    const { data: receiptsData, error: receiptsError } = await this.client
      .from("purchase_receipts")
      .select("id, purchase_order_id, received_at, notes")
      .eq("organization_id", organizationId)
      .order("received_at", { ascending: false })
      .limit(limit);
    if (receiptsError) throw commandError("Não foi possível carregar os recebimentos", receiptsError.message);

    const receipts = (receiptsData ?? []) as PurchaseReceiptRow[];
    if (receipts.length === 0) return [];

    const { data: itemsData, error: itemsError } = await this.client
      .from("purchase_receipt_items")
      .select("id, purchase_receipt_id, purchase_order_item_id, quantity, unit_cost_snapshot, batch_code, expiration_date")
      .eq("organization_id", organizationId)
      .in("purchase_receipt_id", receipts.map((receipt) => receipt.id))
      .order("created_at", { ascending: true });
    if (itemsError) throw commandError("Não foi possível carregar os itens dos recebimentos", itemsError.message);

    const itemsByReceipt = new Map<string, RuntimePurchaseReceiptItem[]>();
    for (const row of (itemsData ?? []) as PurchaseReceiptItemRow[]) {
      const current = itemsByReceipt.get(row.purchase_receipt_id) ?? [];
      current.push(Object.freeze({
        id: row.id as EntityId,
        purchaseOrderItemId: row.purchase_order_item_id as EntityId,
        quantity: Quantity.fromDecimal(String(row.quantity)),
        unitCostSnapshot: Money.fromDecimal(String(row.unit_cost_snapshot)),
        batchCode: row.batch_code ?? undefined,
        expirationDate: row.expiration_date ?? undefined,
      }));
      itemsByReceipt.set(row.purchase_receipt_id, current);
    }

    return receipts.map((row) => Object.freeze({
      id: row.id as EntityId,
      purchaseOrderId: row.purchase_order_id as EntityId,
      receivedAt: row.received_at,
      notes: row.notes ?? undefined,
      items: Object.freeze(itemsByReceipt.get(row.id) ?? []),
    }));
  }

  async create(input: {
    organizationId: EntityId;
    supplierId: EntityId;
    stockLocationId: EntityId;
    expectedDeliveryDate?: string;
    notes?: string;
    items: readonly { supplierItemId: EntityId; quantity: string; unitPrice: string }[];
  }): Promise<EntityId> {
    const items = input.items.map((item) => ({
      supplier_item_id: item.supplierItemId,
      quantity: Quantity.fromDecimal(item.quantity).toDecimal(),
      unit_price: Money.fromDecimal(item.unitPrice).toDecimal(),
    }));
    const semanticPayload = {
      organizationId: input.organizationId,
      supplierId: input.supplierId,
      stockLocationId: input.stockLocationId,
      expectedDeliveryDate: input.expectedDeliveryDate?.trim() || null,
      notes: input.notes?.trim() || null,
      items,
    };

    return this.commands.execute("purchase-order:create", semanticPayload, async (commandId) => {
      const { data, error } = await this.client.rpc("create_purchase_order", {
        p_command_id: commandId,
        p_organization_id: semanticPayload.organizationId,
        p_supplier_id: semanticPayload.supplierId,
        p_stock_location_id: semanticPayload.stockLocationId,
        p_expected_delivery_date: semanticPayload.expectedDeliveryDate,
        p_notes: semanticPayload.notes,
        p_items: semanticPayload.items,
      });
      if (error) throw commandError("Não foi possível criar o pedido", error.message);
      const row = (data as { purchase_order_id: string }[] | null)?.[0];
      if (!row) throw new DomainError("SUPABASE_PERSISTENCE_ERROR", "O comando não retornou o pedido criado.");
      return row.purchase_order_id as EntityId;
    });
  }

  async issue(organizationId: EntityId, purchaseOrderId: EntityId): Promise<void> {
    const semanticPayload = { organizationId, purchaseOrderId };
    await this.commands.execute(`purchase-order:issue:${purchaseOrderId}`, semanticPayload, async (commandId) => {
      const { error } = await this.client.rpc("issue_purchase_order", {
        p_command_id: commandId,
        p_organization_id: organizationId,
        p_purchase_order_id: purchaseOrderId,
      });
      if (error) throw commandError("Não foi possível emitir o pedido", error.message);
    });
  }

  async receive(input: {
    organizationId: EntityId;
    purchaseOrderId: EntityId;
    notes?: string;
    items: readonly { purchaseOrderItemId: EntityId; quantity: string; batchCode?: string; expirationDate?: string }[];
  }): Promise<void> {
    const items = input.items.map((item) => ({
      purchase_order_item_id: item.purchaseOrderItemId,
      quantity: Quantity.fromDecimal(item.quantity).toDecimal(),
      batch_code: item.batchCode?.trim() || null,
      expiration_date: item.expirationDate?.trim() || null,
    }));
    const semanticPayload = {
      organizationId: input.organizationId,
      purchaseOrderId: input.purchaseOrderId,
      items,
      notes: input.notes?.trim() || null,
    };

    await this.commands.execute(`purchase-order:receive:${input.purchaseOrderId}`, semanticPayload, async (commandId) => {
      const { error } = await this.client.rpc("receive_purchase_order", {
        p_command_id: commandId,
        p_organization_id: semanticPayload.organizationId,
        p_purchase_order_id: semanticPayload.purchaseOrderId,
        p_items: semanticPayload.items,
        p_notes: semanticPayload.notes,
      });
      if (error) throw commandError("Não foi possível registrar o recebimento", error.message);
    });
  }

  async cancel(organizationId: EntityId, purchaseOrderId: EntityId, reason?: string): Promise<void> {
    const semanticPayload = { organizationId, purchaseOrderId, reason: reason?.trim() || null };
    await this.commands.execute(`purchase-order:cancel:${purchaseOrderId}`, semanticPayload, async (commandId) => {
      const { error } = await this.client.rpc("cancel_purchase_order", {
        p_command_id: commandId,
        p_organization_id: organizationId,
        p_purchase_order_id: purchaseOrderId,
        p_reason: semanticPayload.reason,
      });
      if (error) throw commandError("Não foi possível cancelar o pedido", error.message);
    });
  }
}
