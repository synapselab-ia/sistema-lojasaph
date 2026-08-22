import { DomainError } from "@/domain/common/domain-error";
import { uploadFinanceAttachment } from "@/lib/finance/attachment-server";
import { correlationIdFromHeaders } from "@/lib/observability/core";
import { toPublicError } from "@/lib/observability/public-error";
import { serverLogger } from "@/lib/observability/server";

function statusFor(error: unknown): number {
  if (!(error instanceof DomainError)) return 500;
  if (error.code === "AUTH_REQUIRED") return 401;
  if (error.code === "INSUFFICIENT_ROLE_OR_SCOPE") return 403;
  if (error.code.startsWith("INVALID_ATTACHMENT")) return 400;
  return 500;
}

export async function POST(request: Request): Promise<Response> {
  const correlationId = correlationIdFromHeaders(request.headers);
  try {
    const formData = await request.formData();
    const organizationId = String(formData.get("organizationId") ?? "").trim();
    const payableDocumentId = String(formData.get("payableDocumentId") ?? "").trim();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new DomainError("INVALID_ATTACHMENT_FILE", "Selecione um arquivo para anexar.");
    }

    const registered = await uploadFinanceAttachment({
      organizationId,
      payableDocumentId,
      file,
      correlationId,
    });

    serverLogger.info("finance.attachment.uploaded", {
      correlationId,
      context: {
        organizationId,
        payableDocumentId,
        attachmentId: registered.attachmentId,
        mimeType: registered.mimeType,
        sizeBytes: registered.sizeBytes,
      },
    });

    return Response.json({ attachmentId: registered.attachmentId, correlationId }, { status: 201 });
  } catch (error) {
    serverLogger.error("finance.attachment.upload_failed", { correlationId, error });
    return Response.json(toPublicError(error, correlationId), { status: statusFor(error) });
  }
}
