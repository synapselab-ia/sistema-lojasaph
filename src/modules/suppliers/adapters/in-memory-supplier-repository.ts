import { EntityId } from "@/domain/common/entity-id";
import { Supplier } from "../domain/supplier";
import { SupplierRepository } from "../repositories/supplier-repository";

export class InMemorySupplierRepository implements SupplierRepository {
  private readonly suppliers = new Map<EntityId, Supplier>();

  constructor(initialSuppliers: readonly Supplier[] = []) {
    initialSuppliers.forEach((supplier) => this.suppliers.set(supplier.id, supplier));
  }

  async findById(id: EntityId): Promise<Supplier | null> {
    return this.suppliers.get(id) ?? null;
  }

  async listByOrganization(organizationId: EntityId): Promise<readonly Supplier[]> {
    return [...this.suppliers.values()]
      .filter((supplier) => supplier.organizationId === organizationId)
      .sort((a, b) => a.tradeName.localeCompare(b.tradeName, "pt-BR"));
  }

  async save(supplier: Supplier): Promise<void> {
    this.suppliers.set(supplier.id, supplier);
  }
}
