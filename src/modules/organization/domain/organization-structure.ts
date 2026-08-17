import { EntityId } from "@/domain/common/entity-id";

export interface StockLocationSummary {
  readonly id: EntityId;
  readonly name: string;
}

export interface SectorSummary {
  readonly id: EntityId;
  readonly name: string;
}

export interface UnitSummary {
  readonly id: EntityId;
  readonly name: string;
  readonly sectors: readonly SectorSummary[];
  readonly stockLocations: readonly StockLocationSummary[];
}

export interface BusinessSummary {
  readonly id: EntityId;
  readonly name: string;
  readonly units: readonly UnitSummary[];
}

export interface OrganizationStructure {
  readonly id: EntityId;
  readonly name: string;
  readonly businesses: readonly BusinessSummary[];
}
