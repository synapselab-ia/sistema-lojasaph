import { EntityId } from "@/domain/common/entity-id";

export const administrationRoles = [
  "owner",
  "admin",
  "manager",
  "finance",
  "purchases",
  "inventory",
  "cashier",
  "viewer",
] as const;

export type AdministrationRole = (typeof administrationRoles)[number];
export type AdministrationStatus = "active" | "inactive";
export type StockLocationType = "warehouse" | "kitchen" | "kiosk" | "store_floor" | "temporary" | "external";

export interface AdministrationBusiness {
  readonly id: EntityId;
  readonly name: string;
  readonly code: string;
  readonly status: AdministrationStatus;
}

export interface AdministrationUnit {
  readonly id: EntityId;
  readonly businessId: EntityId;
  readonly name: string;
  readonly code: string;
  readonly status: AdministrationStatus;
}

export interface AdministrationSector {
  readonly id: EntityId;
  readonly unitId: EntityId;
  readonly name: string;
  readonly code: string;
  readonly status: AdministrationStatus;
}

export interface AdministrationStockLocation {
  readonly id: EntityId;
  readonly unitId: EntityId;
  readonly sectorId?: EntityId;
  readonly name: string;
  readonly code: string;
  readonly locationType: StockLocationType;
  readonly allowNegativeStock: boolean;
  readonly status: AdministrationStatus;
}

export interface AdministrationMembershipScope {
  readonly role: AdministrationRole;
  readonly businessId?: EntityId;
  readonly unitId?: EntityId;
  readonly sectorId?: EntityId;
  readonly active: boolean;
}

export interface AdministrationStructure {
  readonly businesses: readonly AdministrationBusiness[];
  readonly units: readonly AdministrationUnit[];
  readonly sectors: readonly AdministrationSector[];
  readonly stockLocations: readonly AdministrationStockLocation[];
  readonly ownMemberships: readonly AdministrationMembershipScope[];
}

export interface AdministrationAccess {
  readonly membershipId: EntityId;
  readonly userId: EntityId;
  readonly email: string;
  readonly emailConfirmed: boolean;
  readonly role: AdministrationRole;
  readonly businessId?: EntityId;
  readonly unitId?: EntityId;
  readonly sectorId?: EntityId;
  readonly active: boolean;
  readonly employeeId?: EntityId;
  readonly employeeName?: string;
}

export interface AdministrationEmployee {
  readonly id: EntityId;
  readonly name: string;
  readonly code: string;
  readonly status: AdministrationStatus;
  readonly linkedUserId?: EntityId;
}

export const administrationRoleLabels: Record<AdministrationRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  manager: "Gerência",
  finance: "Financeiro",
  purchases: "Compras",
  inventory: "Estoque",
  cashier: "Caixa",
  viewer: "Consulta",
};

export const stockLocationTypeLabels: Record<StockLocationType, string> = {
  warehouse: "Depósito",
  kitchen: "Cozinha",
  kiosk: "Quiosque",
  store_floor: "Área de loja",
  temporary: "Temporário",
  external: "Externo",
};

export function isAdministrationRole(value: string): value is AdministrationRole {
  return administrationRoles.some((role) => role === value);
}

export function isAdministrationStatus(value: string): value is AdministrationStatus {
  return value === "active" || value === "inactive";
}

export function isStockLocationType(value: string): value is StockLocationType {
  return value in stockLocationTypeLabels;
}
