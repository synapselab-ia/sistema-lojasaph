import { EntityId } from "@/domain/common/entity-id";
import {
  RecordStockReturnInput,
  RecordStockReturnResult,
  RuntimeStockReturnOverview,
} from "../domain/stock-return";

export interface StockReturnGateway {
  loadOverview(organizationId: EntityId): Promise<RuntimeStockReturnOverview>;
  record(input: RecordStockReturnInput): Promise<RecordStockReturnResult>;
}
