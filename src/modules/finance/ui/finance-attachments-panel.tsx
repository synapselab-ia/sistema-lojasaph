"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  FINANCE_ATTACHMENT_MAX_BYTES,
  FINANCE_ATTACHMENT_MIME_TYPES,
  validateFinanceAttachmentFile,
} from "@/lib/finance/attachment-policy";

interface AttachmentRow {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

interface PublicErrorBody {
  code?: string;
  message?: string;
  reference?: string;
}

function sizeLabel(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FinanceAttachmentsPanel(props: {
  organizationId: string;
  payableDocumentId: string;
  canUpload: boolean;
}) {
  const client = useRef(createBrowserSupabaseClient()).current;
  const inputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await client
      .from("finance_attachments")
      .select("id, original_filename, mime_type, size_bytes, created_at")
      .eq("organization_id", props.organizationId)
      .eq("payable_document_id", props.payableDocumentId)
      .order("created_at", { ascending: false });
    if (error) {
      setMessage("Não foi possível carregar os anexos deste documento.");
    } else {
      setAttachments((data ?? []) as AttachmentRow[]);
    }
    setLoading(false);
  }, [client, props.organizationId, props.payableDocumentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setMessage(null);
    try {
      validateFinanceAttachmentFile({ name: file.name, type: file.type, size: file.size });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Arquivo inválido.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("organizationId", props.organizationId);
      formData.set("payableDocumentId", props.payableDocumentId);
      formData.set("file", file);

      const response = await fetch("/api/finance/attachments", { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as PublicErrorBody;
        throw new Error(body.message || "Não foi possível anexar o arquivo.");
      }

      await load();
      setMessage("Anexo registrado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível anexar o arquivo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Anexos privados</p>
          <p className="text-xs text-neutral-500">PDF, XML, JPEG, PNG ou WebP · até {FINANCE_ATTACHMENT_MAX_BYTES / 1024 / 1024} MB.</p>
        </div>
        {props.canUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={FINANCE_ATTACHMENT_MIME_TYPES.join(",")}
              onChange={(event) => void onFile(event)}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50"
            >
              {uploading ? "Enviando..." : "Anexar arquivo"}
            </button>
          </>
        )}
      </div>

      {message && <p className="mt-3 text-xs text-neutral-600">{message}</p>}
      {loading ? (
        <p className="mt-3 text-xs text-neutral-500">Carregando anexos...</p>
      ) : attachments.length === 0 ? (
        <p className="mt-3 text-xs text-neutral-500">Nenhum anexo neste documento.</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs">
              <div className="min-w-0">
                <p className="truncate font-medium" title={attachment.original_filename}>{attachment.original_filename}</p>
                <p className="text-neutral-500">{sizeLabel(attachment.size_bytes)} · {new Date(attachment.created_at).toLocaleString("pt-BR")}</p>
              </div>
              <a
                href={`/api/finance/attachments/${attachment.id}`}
                className="shrink-0 rounded-md border border-neutral-300 px-2.5 py-1.5 font-medium"
              >
                Baixar
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
