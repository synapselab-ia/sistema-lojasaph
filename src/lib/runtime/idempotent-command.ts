import { DomainError } from "@/domain/common/domain-error";
import { EntityId, newEntityId } from "@/domain/common/entity-id";

interface ActiveCommandIntent {
  readonly fingerprint: string;
  readonly commandId: EntityId;
  inFlight?: Promise<unknown>;
}

function canonicalize(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, canonicalize(record[key])]),
    );
  }

  return String(value);
}

export function semanticCommandFingerprint(payload: unknown): string {
  return JSON.stringify(canonicalize(payload));
}

export class IdempotentCommandRegistry {
  private readonly active = new Map<string, ActiveCommandIntent>();

  constructor(private readonly createCommandId: () => EntityId = newEntityId) {}

  execute<T>(
    scope: string,
    semanticPayload: unknown,
    operation: (commandId: EntityId) => Promise<T>,
  ): Promise<T> {
    const normalizedScope = scope.trim();
    if (!normalizedScope) {
      return Promise.reject(new DomainError("IDEMPOTENT_COMMAND_SCOPE_REQUIRED", "Command intent scope is required."));
    }

    const fingerprint = semanticCommandFingerprint(semanticPayload);
    const current = this.active.get(normalizedScope);

    if (current && current.fingerprint !== fingerprint) {
      if (current.inFlight) {
        return Promise.reject(new DomainError(
          "IDEMPOTENT_COMMAND_IN_FLIGHT",
          "A operação anterior ainda está em andamento. Aguarde a conclusão antes de alterar os dados.",
        ));
      }
      this.active.delete(normalizedScope);
    }

    let intent = this.active.get(normalizedScope);
    if (!intent) {
      intent = {
        fingerprint,
        commandId: this.createCommandId(),
      };
      this.active.set(normalizedScope, intent);
    }

    if (intent.inFlight) return intent.inFlight as Promise<T>;

    const commandId = intent.commandId;
    const inFlight = Promise.resolve()
      .then(() => operation(commandId))
      .then(
        (result) => {
          if (this.active.get(normalizedScope)?.commandId === commandId) {
            this.active.delete(normalizedScope);
          }
          return result;
        },
        (error: unknown) => {
          const activeIntent = this.active.get(normalizedScope);
          if (activeIntent?.commandId === commandId) {
            activeIntent.inFlight = undefined;
          }
          throw error;
        },
      );

    intent.inFlight = inFlight;
    return inFlight;
  }

  reset(scope: string): void {
    const normalizedScope = scope.trim();
    const current = this.active.get(normalizedScope);
    if (current?.inFlight) {
      throw new DomainError(
        "IDEMPOTENT_COMMAND_IN_FLIGHT",
        "A operação anterior ainda está em andamento e não pode ser descartada.",
      );
    }
    this.active.delete(normalizedScope);
  }
}
