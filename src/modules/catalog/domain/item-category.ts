import { EntityId } from "@/domain/common/entity-id";

export interface ItemCategory {
  readonly id: EntityId;
  readonly organizationId: EntityId;
  readonly name: string;
}

export interface UnitOfMeasureOption {
  readonly code: string;
  readonly name: string;
}
