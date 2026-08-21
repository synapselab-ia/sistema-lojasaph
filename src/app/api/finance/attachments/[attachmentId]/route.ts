import { DomainError } from "@/domain/common/domain-error";
import { downloadFinanceAttachment } from "@/lib/finance/attachment-server";
import { correlationIdFromHeaders } from "@/lib/observability/core";
import { toPublicError } from "@/lib/observability/public-error";
import { serverLogger } from "@/lib/observability/server";

function statusFor(error: unknown): number {
  if (!(error instanceof DomainError)) return 500;
  if (error.code === "AUTH_REQUIRED") return 401;
  if (error.code === "ATTACHMENT_NOT_FOUND") return 404;
  return 500;
}

function contentDisposition(filename: string): string {
  return `attachment; filename="${filename.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ attachmentId: string }> },
): Promise<Response> {
  const correlationId = correlationIdFromHeaders(request.headers);
  const { attachmentId } = await context.params;

  try {
    const attachment = await downloadFinanceAttachment(attachmentId);
    return new Response(attachment.body, {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(attachment.sizeBytes),
        "Content-Disposition": contentDisposition(attachment.filename),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    serverLogger.error("finance.attachment.download_failed", {
      correlationId,
      context: { attachmentId },
      error,
    });
    return Response.json(toPublicError(error, correlationId), { status: statusFor(error) });
  }
}
