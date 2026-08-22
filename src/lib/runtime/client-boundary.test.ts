import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("environment client/server boundary", () => {
  it("keeps server-only Supabase secret access out of browser integration", () => {
    const browser = source("src/lib/supabase/browser.ts");
    const provider = source("src/modules/master-data/ui/runtime-workspace-provider.tsx");
    const clientEnvNames = [...browser.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((match) => match[1]);

    expect(browser).not.toContain("SUPABASE_SECRET_KEY");
    expect(browser).not.toContain("@/lib/runtime/server");
    expect(clientEnvNames.length).toBeGreaterThan(0);
    expect(clientEnvNames.every((name) => name === "NODE_ENV" || name.startsWith("NEXT_PUBLIC_"))).toBe(true);
    expect(provider).not.toContain("SUPABASE_SECRET_KEY");
    expect(provider).not.toContain("process.env");
  });

  it("marks every secret-reading facade as server-only", () => {
    const facade = source("src/lib/supabase/env.ts");
    const runtimeServer = source("src/lib/runtime/server.ts");

    expect(facade).toContain('import "server-only"');
    expect(runtimeServer).toContain('import "server-only"');
    expect(runtimeServer).toContain("SUPABASE_SECRET_KEY");
  });

  it("keeps finance attachment Storage administration server-only", () => {
    const panel = source("src/modules/finance/ui/finance-attachments-panel.tsx");
    const attachmentServer = source("src/lib/finance/attachment-server.ts");
    const uploadRoute = source("src/app/api/finance/attachments/route.ts");
    const downloadRoute = source("src/app/api/finance/attachments/[attachmentId]/route.ts");

    expect(panel).not.toContain("SUPABASE_SECRET_KEY");
    expect(panel).not.toContain("createServerAdminSupabaseClient");
    expect(panel).not.toContain("storage.createBucket");
    expect(attachmentServer).toContain('import "server-only"');
    expect(attachmentServer).toContain("createServerAdminSupabaseClient");
    expect(uploadRoute).toContain("attachment-server");
    expect(downloadRoute).toContain("attachment-server");
    expect(uploadRoute).not.toContain("SUPABASE_SECRET_KEY");
    expect(downloadRoute).not.toContain("SUPABASE_SECRET_KEY");
  });
});
