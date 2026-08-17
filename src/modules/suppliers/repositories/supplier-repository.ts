import { EntityId } from "@/domain/common/entity-id";
import { Supplier } from "../domain/supplier";

export interface SupplierRepository {
  findById(id: EntityId): Promise<Supplier | null>;
  listByOrganization(organizationId: EntityId): Promise<readonly Supplier[]>;
  save(supplier: Supplier): Promise<void>;
}
