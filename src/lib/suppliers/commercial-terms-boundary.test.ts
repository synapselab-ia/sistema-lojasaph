import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("supplier commercial terms boundary", () => {
  it("uses the authenticated browser client without privileged credentials", () => {
    const panel = source("src/modules/suppliers/ui/supplier-commercial-terms-panel.tsx");
    const gateway = source("src/modules/suppliers/adapters/supabase-supplier-commercial-terms-gateway.ts");

    expect(panel).toContain("createBrowserSupabaseClient");
    expect(panel).not.toContain("SUPABASE_SECRET_KEY");
    expect(panel).not.toContain("createServerAdminSupabaseClient");
    expect(gateway).not.toContain("SUPABASE_SECRET_KEY");
    expect(gateway).not.toContain("createServerAdminSupabaseClient");
  });

  it("reads only the current supplier term and never deletes commercial history", () => {
    const gateway = source("src/modules/suppliers/adapters/supabase-supplier-commercial-terms-gateway.ts");

    expect(gateway).toContain('.is("valid_to", null)');
    expect(gateway).toContain('.order("valid_from", { ascending: false })');
    expect(gateway).not.toContain(".delete(");
  });
});
