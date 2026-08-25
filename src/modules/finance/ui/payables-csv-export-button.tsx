"use client";

import { useMemo, useState } from "react";
import { EntityId } from "@/domain/common/entity-id";
import { buildPayablesCsv, payablesCsvFilename } from "@/lib/finance/payables-csv";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { SupabasePayablesExportGateway } from "@/modules/finance/adapters/supabase-payables-export-gateway";

export function PayablesCsvExportButton({ organizationId }: { organizationId: EntityId }) {
  const gateway = useMemo(() => new SupabasePayablesExportGateway(createBrowserSupabaseClient()), []);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function download() {
    setExporting(true);
    setMessage(null);

    try {
      const rows = await gateway.listRows(organizationId);
      const csv = buildPayablesCsv(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = payablesCsvFilename();
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage(`${rows.length} parcela${rows.length === 1 ? "" : "s"} exportada${rows.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível exportar as contas a pagar.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={exporting}
        onClick={() => void download()}
        className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-50"
      >
        {exporting ? "Exportando..." : "Exportar CSV"}
      </button>
      {message && <p aria-live="polite" className="max-w-sm text-right text-xs text-neutral-500">{message}</p>}
    </div>
  );
}
