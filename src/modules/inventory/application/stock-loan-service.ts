import { DomainError } from "@/domain/common/domain-error";
import { EntityId } from "@/domain/common/entity-id";
import { Money } from "@/domain/common/money";
import { Quantity } from "@/domain/common/quantity";
import {
  CreateStockLoanInput,
  CreateStockLoanResult,
  RecordStockLoanRestitutionInput,
  RecordStockLoanRestitutionResult,
  RuntimeStockLoan,
  RuntimeStockLoanRestitution,
} from "../domain/stock-loan";
import { StockLoanGateway } from "../repositories/stock-loan-gateway";

export class StockLoanService {
  constructor(private readonly gateway: StockLoanGateway) {}

  listByOrganization(organizationId: EntityId): Promise<readonly RuntimeStockLoan[]> {
    return this.gateway.listByOrganization(organizationId);
  }

  findById(organizationId: EntityId, loanId: EntityId): Promise<RuntimeStockLoan | null> {
    return this.gateway.findById(organizationId, loanId);
  }

  listRestitutions(
    organizationId: EntityId,
    loanId: EntityId,
  ): Promise<readonly RuntimeStockLoanRestitution[]> {
    return this.gateway.listRestitutions(organizationId, loanId);
  }

  create(input: CreateStockLoanInput): Promise<CreateStockLoanResult> {
    const quantity = Quantity.fromDecimal(input.quantity);
    const counterparty = input.counterparty.trim();

    if (!quantity.isPositive()) {
      throw new DomainError("INVALID_STOCK_QUANTITY", "A quantidade emprestada deve ser maior que zero.");
    }
    if (!counterparty) {
      throw new DomainError("STOCK_LOAN_COUNTERPARTY_REQUIRED", "Informe a contraparte do empréstimo.");
    }

    return this.gateway.create({
      ...input,
      counterparty,
      quantity: quantity.toDecimal(),
      notes: input.notes?.trim() || undefined,
    });
  }

  recordRestitution(
    input: RecordStockLoanRestitutionInput,
  ): Promise<RecordStockLoanRestitutionResult> {
    const physicalQuantity = Quantity.fromDecimal(input.physicalQuantity?.trim() || "0");
    const monetaryAmount = Money.fromDecimal(input.monetaryAmount?.trim() || "0");

    if (physicalQuantity.isNegative()) {
      throw new DomainError("INVALID_STOCK_QUANTITY", "A quantidade física não pode ser negativa.");
    }
    if (monetaryAmount.isNegative()) {
      throw new DomainError("INVALID_STOCK_LOAN_AMOUNT", "O valor restituído não pode ser negativo.");
    }
    if (physicalQuantity.isZero() && monetaryAmount.cents === 0) {
      throw new DomainError(
        "STOCK_LOAN_RESTITUTION_REQUIRED",
        "Informe uma devolução física, um valor restituído ou ambos.",
      );
    }

    return this.gateway.recordRestitution({
      ...input,
      physicalQuantity: physicalQuantity.toDecimal(),
      monetaryAmount: monetaryAmount.toDecimal(),
      notes: input.notes?.trim() || undefined,
    });
  }
}
