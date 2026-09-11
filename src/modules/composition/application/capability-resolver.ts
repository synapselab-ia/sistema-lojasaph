import {
  CapabilityDefinition,
  CapabilityId,
  capabilityRegistry,
  getCapabilityDefinition,
  isCapabilityId,
} from "../domain/capability";

export interface PersistedCapabilitySetting {
  readonly capabilityId: string;
  readonly enabled: boolean;
}

export interface ResolvedCapabilityState {
  readonly definition: CapabilityDefinition;
  readonly enabled: boolean;
  readonly configuredEnabled?: boolean;
  readonly blockedBy: readonly CapabilityId[];
}

export class CapabilityDependencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CapabilityDependencyError";
  }
}

export function resolveCapabilities(
  settings: readonly PersistedCapabilitySetting[],
): readonly ResolvedCapabilityState[] {
  const persisted = new Map<CapabilityId, boolean>();
  for (const setting of settings) {
    if (isCapabilityId(setting.capabilityId)) {
      persisted.set(setting.capabilityId, setting.enabled);
    }
  }

  const requested = new Map<CapabilityId, boolean>();
  for (const definition of capabilityRegistry) {
    const configuredEnabled = definition.configurable ? persisted.get(definition.id) : undefined;
    requested.set(
      definition.id,
      definition.core ? true : configuredEnabled ?? definition.defaultEnabled,
    );
  }

  return Object.freeze(capabilityRegistry.map((definition) => {
    const blockedBy = definition.dependencies.filter((dependency) => !requested.get(dependency));
    const configuredEnabled = definition.configurable ? persisted.get(definition.id) : undefined;
    return Object.freeze({
      definition,
      enabled: Boolean(requested.get(definition.id)) && blockedBy.length === 0,
      configuredEnabled,
      blockedBy: Object.freeze(blockedBy),
    });
  }));
}

export function enabledCapabilityIds(
  states: readonly ResolvedCapabilityState[],
): readonly CapabilityId[] {
  return Object.freeze(states.filter((state) => state.enabled).map((state) => state.definition.id));
}

export function isCapabilityEnabled(
  states: readonly ResolvedCapabilityState[],
  capabilityId: CapabilityId,
): boolean {
  return states.some((state) => state.definition.id === capabilityId && state.enabled);
}

export function validateCapabilityChange(
  states: readonly ResolvedCapabilityState[],
  capabilityId: CapabilityId,
  nextEnabled: boolean,
): void {
  const definition = getCapabilityDefinition(capabilityId);
  if (!definition.configurable) {
    throw new CapabilityDependencyError(`${definition.name} ainda não pode ser alterado nesta etapa do rollout.`);
  }

  if (nextEnabled) {
    const missing = definition.dependencies.filter((dependency) => !isCapabilityEnabled(states, dependency));
    if (missing.length > 0) {
      const names = missing.map((dependency) => getCapabilityDefinition(dependency).name).join(", ");
      throw new CapabilityDependencyError(`${definition.name} requer ${names} ativo.`);
    }
    return;
  }

  const enabledDependents = states
    .filter((state) => state.enabled && state.definition.dependencies.includes(capabilityId))
    .map((state) => state.definition.name);
  if (enabledDependents.length > 0) {
    throw new CapabilityDependencyError(
      `${definition.name} é necessário para: ${enabledDependents.join(", ")}. Desative os dependentes primeiro.`,
    );
  }
}
