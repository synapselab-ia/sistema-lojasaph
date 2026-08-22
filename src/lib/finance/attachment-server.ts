import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { DomainError } from "@/domain/common/domain-error";
import {
  FINANCE_ATTACHMENT_BUCKET,
  FINANCE_ATTACHMENT_MAX_BYTES,
  FINANCE_ATTACHMENT_MIME_TYPES,
  safeDownloadFilename,
} from "./attachment-policy";
import {
  executeFinanceAttachmentUpload,
  type FinanceAttachmentRegistration,
} from "./attachment-upload";
import {
  createServerAdminSupabaseClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";
import { serverLogger } from "@/lib/observability/server";

function persistenceError(scope: string, message: string): DomainError {
  return new DomainError("SUPABASE_PERSISTENCE_ERROR", `${scope}: ${message}`);
}

function storageError(scope: string, message: string): DomainError {
  return new DomainError("SUPABASE_STORAGE_ERROR", `${scope}: ${message}`);
}

function isAlreadyExists(message: string): boolean {
  return /already exists|duplicate|conflict/i.test(message);
}

async function ensureFinanceAttachmentBucket(): Promise<void> {
  const admin = createServerAdminSupabaseClient();
  const options = {
    public: false,
    fileSizeLimit: FINANCE_ATTACHMENT_MAX_BYTES,
    allowedMimeTypes: [...FINANCE_ATTACHMENT_MIME_TYPES],
  };
  const existing = await admin.storage.getBucket(FINANCE_ATTACHMENT_BUCKET);

  if (!existing.error) {
    const updated = await admin.storage.updateBucket(FINANCE_ATTACHMENT_BUCKET, options);
    if (updated.error) {
      throw storageError("Não foi possível configurar o bucket privado de anexos", updated.error.message);
    }
    return;
  }

  const created = await admin.storage.createBucket(FINANCE_ATTACHMENT_BUCKET, options);
  if (!created.error) return;

  if (isAlreadyExists(created.error.message)) {
    const updated = await admin.storage.updateBucket(FINANCE_ATTACHMENT_BUCKET, options);
    if (!updated.error) return;
  }

  throw storageError("Não foi possível criar o bucket privado de anexos", created.error.message);
}

export async function uploadFinanceAttachment(input: {
  organizationId: string;
  payableDocumentId: string;
  file: File;
  correlationId?: string;
}): Promise<FinanceAttachmentRegistration> {
  const userClient = await createServerSupabaseClient();
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    throw new DomainError("AUTH_REQUIRED", "Sua sessão expirou. Entre novamente.");
  }

  const bytes = Buffer.from(await input.file.arrayBuffer());
  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
  const attachmentId = randomUUID();
  const admin = createServerAdminSupabaseClient();

  return executeFinanceAttachmentUpload({
    attachmentId,
    organizationId: input.organizationId,
    payableDocumentId: input.payableDocumentId,
    file: { name: input.file.name, type: input.file.type, size: input.file.size },
    checksumSha256,
  }, {
    async authorize() {
      const { data, error } = await userClient.rpc("can_upload_finance_attachment", {
        p_organization_id: input.organizationId,
        p_payable_document_id: input.payableDocumentId,
      });
      if (error) throw persistenceError("Não foi possível validar a permissão do anexo", error.message);
      return data === true;
    },
    ensureBucket: ensureFinanceAttachmentBucket,
    async upload(storageKey) {
      const { error } = await admin.storage
        .from(FINANCE_ATTACHMENT_BUCKET)
        .upload(storageKey, bytes, {
          contentType: input.file.type,
          upsert: false,
          cacheControl: "3600",
        });
      if (error) throw storageError("Não foi possível armazenar o anexo", error.message);
    },
    async register(registration) {
      const { error } = await userClient.rpc("register_finance_attachment", {
        p_attachment_id: registration.attachmentId,
        p_organization_id: registration.organizationId,
        p_payable_document_id: registration.payableDocumentId,
        p_storage_bucket: FINANCE_ATTACHMENT_BUCKET,
        p_storage_key: registration.storageKey,
        p_original_filename: registration.originalFilename,
        p_mime_type: registration.mimeType,
        p_size_bytes: registration.sizeBytes,
        p_checksum_sha256: registration.checksumSha256,
      });
      if (error) throw persistenceError("Não foi possível registrar o anexo", error.message);
    },
    async remove(storageKey) {
      const { error } = await admin.storage.from(FINANCE_ATTACHMENT_BUCKET).remove([storageKey]);
      if (error) {
        serverLogger.error("finance.attachment.compensation_failed", {
          correlationId: input.correlationId,
          context: {
            organizationId: input.organizationId,
            payableDocumentId: input.payableDocumentId,
            attachmentId,
          },
          error,
        });
        throw storageError("Não foi possível compensar o upload do anexo", error.message);
      }
    },
  });
}

interface FinanceAttachmentRow {
  id: string;
  storage_bucket: string;
  storage_key: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
}

export async function downloadFinanceAttachment(attachmentId: string): Promise<{
  body: Blob;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}> {
  const userClient = await createServerSupabaseClient();
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    throw new DomainError("AUTH_REQUIRED", "Sua sessão expirou. Entre novamente.");
  }

  const { data, error } = await userClient
    .from("finance_attachments")
    .select("id, storage_bucket, storage_key, original_filename, mime_type, size_bytes")
    .eq("id", attachmentId)
    .maybeSingle();
  if (error) throw persistenceError("Não foi possível localizar o anexo", error.message);
  if (!data) throw new DomainError("ATTACHMENT_NOT_FOUND", "Anexo não encontrado.");

  const attachment = data as FinanceAttachmentRow;
  if (attachment.storage_bucket !== FINANCE_ATTACHMENT_BUCKET) {
    throw new DomainError("SUPABASE_STORAGE_ERROR", "Bucket de anexo inconsistente.");
  }

  const admin = createServerAdminSupabaseClient();
  const downloaded = await admin.storage.from(FINANCE_ATTACHMENT_BUCKET).download(attachment.storage_key);
  if (downloaded.error || !downloaded.data) {
    throw storageError(
      "Não foi possível baixar o anexo",
      downloaded.error?.message ?? "Objeto indisponível",
    );
  }

  return {
    body: downloaded.data,
    filename: safeDownloadFilename(attachment.original_filename),
    mimeType: attachment.mime_type,
    sizeBytes: attachment.size_bytes,
  };
}
