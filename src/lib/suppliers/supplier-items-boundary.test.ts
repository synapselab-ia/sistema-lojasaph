import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("supplier items boundary", () => {
  it("uses the authenticated browser client without privileged credentials", () => {
    const panel = source("src/modules/suppliers/ui/supplier-items-panel.tsx");
    const gateway = source("src/modules/suppliers/adapters/supabase-supplier-items-gateway.ts");

    expect(panel).toContain("createBrowserSupabaseClient");
    expect(panel).not.toContain("SUPABASE_SECRET_KEY");
    expect(panel).not.toContain("createServerAdminSupabaseClient");
    expect(gateway).not.toContain("SUPABASE_SECRET_KEY");
    expect(gateway).not.toContain("createServerAdminSupabaseClient");
  });

  it("uses explicit Organization and supplier filters and never deletes mappings", () => {
    const gateway = source("src/modules/suppliers/adapters/supabase-supplier-items-gateway.ts");

    expect(gateway).toContain('.eq("organization_id", organizationId)');
    expect(gateway).toContain('.eq("supplier_id", supplierId)');
    expect(gateway).toContain('.is("supplier_sku", null)');
    expect(gateway).not.toContain(".delete(");
  });

  it("reuses an existing default mapping before inserting a new one", () => {
    const gateway = source("src/modules/suppliers/adapters/supabase-supplier-items-gateway.ts");

    expect(gateway).toContain("existingData");
    expect(gateway).toContain(".update(payload)");
    expect(gateway).toContain(".insert({");
  });
});
