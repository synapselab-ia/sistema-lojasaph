import { EntityId } from "@/domain/common/entity-id";
import { SupplierItemOffer } from "../domain/supplier-item-offer";

export interface SupplierItemOfferRepository {
  list(): Promise<readonly SupplierItemOffer[]>;
  listBySupplier(supplierId: EntityId): Promise<readonly SupplierItemOffer[]>;
  save(offer: SupplierItemOffer): Promise<void>;
}
