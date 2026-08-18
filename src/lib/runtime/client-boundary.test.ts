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
});
