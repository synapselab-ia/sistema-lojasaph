import { EntityId } from "@/domain/common/entity-id";
import {
  CreateStockLoanInput,
  CreateStockLoanResult,
  RecordStockLoanRestitutionInput,
  RecordStockLoanRestitutionResult,
  RuntimeStockLoan,
  RuntimeStockLoanRestitution,
} from "../domain/stock-loan";

export interface StockLoanGateway {
  listByOrganization(organizationId: EntityId): Promise<readonly RuntimeStockLoan[]>;
  findById(organizationId: EntityId, loanId: EntityId): Promise<RuntimeStockLoan | null>;
  listRestitutions(organizationId: EntityId, loanId: EntityId): Promise<readonly RuntimeStockLoanRestitution[]>;
  create(input: CreateStockLoanInput): Promise<CreateStockLoanResult>;
  recordRestitution(input: RecordStockLoanRestitutionInput): Promise<RecordStockLoanRestitutionResult>;
}
