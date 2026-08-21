import { DomainError } from "@/domain/common/domain-error";
import {
  financeAttachmentStorageKey,
  validateFinanceAttachmentFile,
  type FinanceAttachmentFileDescriptor,
} from "./attachment-policy";

export interface FinanceAttachmentRegistration {
  readonly attachmentId: string;
  readonly organizationId: string;
  readonly payableDocumentId: string;
  readonly storageKey: string;
  readonly originalFilename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
}

export interface FinanceAttachmentUploadDependencies {
  authorize(): Promise<boolean>;
  ensureBucket(): Promise<void>;
  upload(storageKey: string): Promise<void>;
  register(input: FinanceAttachmentRegistration): Promise<void>;
  remove(storageKey: string): Promise<void>;
}

export async function executeFinanceAttachmentUpload(input: {
  attachmentId: string;
  organizationId: string;
  payableDocumentId: string;
  file: FinanceAttachmentFileDescriptor;
  checksumSha256: string;
}, dependencies: FinanceAttachmentUploadDependencies): Promise<FinanceAttachmentRegistration> {
  validateFinanceAttachmentFile(input.file);
  if (!/^[0-9a-f]{64}$/.test(input.checksumSha256)) {
    throw new DomainError("INVALID_ATTACHMENT_CHECKSUM", "Checksum do anexo inválido.");
  }

  const authorized = await dependencies.authorize();
  if (!authorized) {
    throw new DomainError(
      "INSUFFICIENT_ROLE_OR_SCOPE",
      "Seu perfil ou escopo não permite anexar arquivos a este documento.",
    );
  }

  const storageKey = financeAttachmentStorageKey(
    input.organizationId,
    input.payableDocumentId,
    input.attachmentId,
  );
  const registration: FinanceAttachmentRegistration = Object.freeze({
    attachmentId: input.attachmentId,
    organizationId: input.organizationId,
    payableDocumentId: input.payableDocumentId,
    storageKey,
    originalFilename: input.file.name.trim(),
    mimeType: input.file.type,
    sizeBytes: input.file.size,
    checksumSha256: input.checksumSha256,
  });

  await dependencies.ensureBucket();
  await dependencies.upload(storageKey);

  try {
    await dependencies.register(registration);
  } catch (error) {
    try {
      await dependencies.remove(storageKey);
    } catch {
      // The caller logs compensation failure with its correlation id; the original error wins.
    }
    throw error;
  }

  return registration;
}
