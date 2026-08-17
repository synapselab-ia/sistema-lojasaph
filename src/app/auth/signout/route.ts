import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { ORGANIZATION_COOKIE } from "@/lib/auth/runtime";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(ORGANIZATION_COOKIE);
  revalidatePath("/", "layout");
  return NextResponse.redirect(new URL("/login", request.url), { status: 302 });
}
