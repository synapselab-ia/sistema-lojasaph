import { EntityId } from "@/domain/common/entity-id";
import { SupplierItemOffer } from "../domain/supplier-item-offer";
import { SupplierItemOfferRepository } from "../repositories/supplier-item-offer-repository";

export class InMemorySupplierItemOfferRepository implements SupplierItemOfferRepository {
  private readonly offers = new Map<EntityId, SupplierItemOffer>();

  constructor(initialOffers: readonly SupplierItemOffer[] = []) {
    initialOffers.forEach((offer) => this.offers.set(offer.id, offer));
  }

  async list(): Promise<readonly SupplierItemOffer[]> {
    return [...this.offers.values()].sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  }

  async listBySupplier(supplierId: EntityId): Promise<readonly SupplierItemOffer[]> {
    return [...this.offers.values()].filter((offer) => offer.supplierId === supplierId);
  }

  async save(offer: SupplierItemOffer): Promise<void> {
    this.offers.set(offer.id, offer);
  }
}
