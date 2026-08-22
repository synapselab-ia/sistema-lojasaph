import { DomainError } from "@/domain/common/domain-error";

export const FINANCE_ATTACHMENT_BUCKET = "finance-attachments";
export const FINANCE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const FINANCE_ATTACHMENT_MIME_TYPES = Object.freeze([
  "application/pdf",
  "application/xml",
  "text/xml",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const);

const MIME_SET = new Set<string>(FINANCE_ATTACHMENT_MIME_TYPES);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface FinanceAttachmentFileDescriptor {
  readonly name: string;
  readonly type: string;
  readonly size: number;
}

export function validateFinanceAttachmentFile(input: FinanceAttachmentFileDescriptor): void {
  const name = input.name.trim();
  if (!name || name.length > 255) {
    throw new DomainError("INVALID_ATTACHMENT_FILENAME", "O nome do arquivo é inválido.");
  }
  if (!MIME_SET.has(input.type)) {
    throw new DomainError(
      "INVALID_ATTACHMENT_MIME_TYPE",
      "Use PDF, XML, JPEG, PNG ou WebP.",
    );
  }
  if (!Number.isSafeInteger(input.size) || input.size < 1 || input.size > FINANCE_ATTACHMENT_MAX_BYTES) {
    throw new DomainError(
      "INVALID_ATTACHMENT_SIZE",
      "O arquivo deve ter até 10 MB e não pode estar vazio.",
    );
  }
}

export function financeAttachmentStorageKey(
  organizationId: string,
  payableDocumentId: string,
  attachmentId: string,
): string {
  for (const id of [organizationId, payableDocumentId, attachmentId]) {
    if (!UUID_PATTERN.test(id)) {
      throw new DomainError("INVALID_ATTACHMENT_ID", "Identificador de anexo inválido.");
    }
  }
  return `${organizationId}/${payableDocumentId}/${attachmentId}`;
}

export function safeDownloadFilename(name: string): string {
  const normalized = name.trim().replace(/[\r\n"\\/]/g, "_").slice(0, 255);
  return normalized || "anexo";
}
