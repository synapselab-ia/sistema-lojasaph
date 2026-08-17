import { DomainError } from "./domain-error";

export type EntityId = string & { readonly __entityId: unique symbol };

export function asEntityId(value: string): EntityId {
  const normalized = value.trim();

  if (!normalized) {
    throw new DomainError("INVALID_ENTITY_ID", "Entity ID cannot be empty.");
  }

  return normalized as EntityId;
}

export function newEntityId(): EntityId {
  return asEntityId(crypto.randomUUID());
}
