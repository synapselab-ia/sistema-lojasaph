import { getRuntimeAccessSummary } from "@/lib/runtime/server";

export const dynamic = "force-dynamic";

export function GET() {
  const runtime = getRuntimeAccessSummary();
  return Response.json({
    status: "ok",
    service: "sistema-lojasaph",
    environment: runtime.environment,
    supabaseAccess: runtime.supabaseAccess,
    supabaseReason: runtime.supabaseReason,
    adminAccess: runtime.adminAccess,
  });
}
