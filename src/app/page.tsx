import { redirect } from "next/navigation";
import { rootEntryDestination } from "@/lib/auth/redirect";
import { resolveMembershipContext } from "@/lib/auth/runtime";
import { getRuntimeAccessSummary } from "@/lib/runtime/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const runtime = getRuntimeAccessSummary();
  if (runtime.supabaseAccess !== "allowed") {
    redirect(rootEntryDestination({ backendAvailable: false, authenticated: false }));
  }

  const context = await resolveMembershipContext();
  redirect(rootEntryDestination({ backendAvailable: true, authenticated: context.authenticated }));
}
