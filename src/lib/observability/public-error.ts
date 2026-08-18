import { DomainError } from "@/domain/common/domain-error";

export interface PublicError {
  readonly code: string;
  readonly message: string;
  readonly reference?: string;
}

const GENERIC_MESSAGE = "Não foi possível concluir a operação. Tente novamente.";
const INTERNAL_DOMAIN_CODE = /(SUPABASE|PERSISTENCE|DATABASE|INTERNAL|UNEXPECTED)/i;

function referenceValue(reference?: string | null): string | undefined {
  const value = reference?.trim();
  if (!value || !/^[A-Za-z0-9][A-Za-z0-9._:-]{3,127}$/.test(value)) return undefined;
  return value;
}

export function toPublicError(error: unknown, reference?: string | null): PublicError {
  const safeReference = referenceValue(reference);

  if (error instanceof DomainError && !INTERNAL_DOMAIN_CODE.test(error.code)) {
    return {
      code: error.code,
      message: error.message,
      ...(safeReference ? { reference: safeReference } : {}),
    };
  }

  return {
    code: error instanceof DomainError ? "OPERATION_FAILED" : "UNEXPECTED_ERROR",
    message: GENERIC_MESSAGE,
    ...(safeReference ? { reference: safeReference } : {}),
  };
}
