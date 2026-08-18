import { describe, expect, it } from "vitest";
import { evaluateRuntimeEnvironment, supabaseProjectRefFromUrl } from "./environment";

const PROD_REF = "aaaaaaaaaaaaaaaaaaaa";
const PREVIEW_REF = "bbbbbbbbbbbbbbbbbbbb";
const DEV_REF = "cccccccccccccccccccc";
const key = "sb_publishable_synthetic_test_key";

function hosted(ref: string) {
  return {
    NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
  };
}

describe("runtime environment policy", () => {
  it("blocks preview when an isolated backend is not proven", () => {
    const policy = evaluateRuntimeEnvironment({ VERCEL_ENV: "preview", ...hosted(PROD_REF) });
    expect(policy.environment).toBe("preview");
    expect(policy.supabaseAccess).toBe("blocked");
    expect(policy.supabaseReason).toBe("preview_backend_unverified");
  });

  it("blocks preview when its configured backend equals production", () => {
    const policy = evaluateRuntimeEnvironment({
      VERCEL_ENV: "preview",
      LOJASAPH_PRODUCTION_SUPABASE_REF: PROD_REF,
      LOJASAPH_PREVIEW_SUPABASE_REF: PROD_REF,
      ...hosted(PROD_REF),
    });
    expect(policy.supabaseAccess).toBe("blocked");
    expect(policy.supabaseReason).toBe("preview_backend_mismatch");
  });

  it("allows preview only with a distinct, explicitly identified backend", () => {
    const policy = evaluateRuntimeEnvironment({
      VERCEL_ENV: "preview",
      VERCEL_URL: "feature.example.vercel.app",
      LOJASAPH_PRODUCTION_SUPABASE_REF: PROD_REF,
      LOJASAPH_PREVIEW_SUPABASE_REF: PREVIEW_REF,
      NEXT_PUBLIC_APP_URL: "https://production.example.com",
      ...hosted(PREVIEW_REF),
    });
    expect(policy.supabaseAccess).toBe("allowed");
    expect(policy.supabaseReason).toBe("preview_isolated_backend");
    expect(policy.appUrl).toBe("https://feature.example.vercel.app");
  });

  it("allows local development and rejects an unverified hosted development backend", () => {
    const local = evaluateRuntimeEnvironment({
      NODE_ENV: "development",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
    });
    expect(local.supabaseAccess).toBe("allowed");
    expect(local.supabaseReason).toBe("development_local_backend");

    const remote = evaluateRuntimeEnvironment({ NODE_ENV: "development", ...hosted(PROD_REF) });
    expect(remote.supabaseAccess).toBe("blocked");
    expect(remote.supabaseReason).toBe("development_backend_unverified");
  });

  it("allows an explicitly isolated hosted development backend", () => {
    const policy = evaluateRuntimeEnvironment({
      LOJASAPH_APP_ENV: "development",
      LOJASAPH_PRODUCTION_SUPABASE_REF: PROD_REF,
      LOJASAPH_DEVELOPMENT_SUPABASE_REF: DEV_REF,
      ...hosted(DEV_REF),
    });
    expect(policy.supabaseAccess).toBe("allowed");
    expect(policy.supabaseReason).toBe("development_isolated_backend");
  });

  it("allows production while optionally pinning the production project ref", () => {
    const policy = evaluateRuntimeEnvironment({
      VERCEL_ENV: "production",
      LOJASAPH_PRODUCTION_SUPABASE_REF: PROD_REF,
      NEXT_PUBLIC_APP_URL: "https://app.example.com/",
      ...hosted(PROD_REF),
    });
    expect(policy.supabaseAccess).toBe("allowed");
    expect(policy.appUrl).toBe("https://app.example.com");
  });

  it("fails closed when explicit and Vercel environment identities disagree", () => {
    const policy = evaluateRuntimeEnvironment({
      LOJASAPH_APP_ENV: "production",
      VERCEL_ENV: "preview",
      ...hosted(PREVIEW_REF),
    });
    expect(policy.environment).toBe("unknown");
    expect(policy.supabaseAccess).toBe("blocked");
    expect(policy.supabaseReason).toBe("environment_mismatch");
  });

  it("blocks admin credentials outside production unless explicitly enabled on an isolated backend", () => {
    const base = {
      VERCEL_ENV: "preview",
      LOJASAPH_PRODUCTION_SUPABASE_REF: PROD_REF,
      LOJASAPH_PREVIEW_SUPABASE_REF: PREVIEW_REF,
      SUPABASE_SECRET_KEY: "synthetic-secret",
      ...hosted(PREVIEW_REF),
    };
    expect(evaluateRuntimeEnvironment(base).adminAccess).toBe("blocked");
    expect(
      evaluateRuntimeEnvironment({ ...base, LOJASAPH_ALLOW_NON_PRODUCTION_ADMIN: "true" }).adminAccess,
    ).toBe("allowed");
  });

  it("extracts only hosted Supabase project refs", () => {
    expect(supabaseProjectRefFromUrl(`https://${PROD_REF}.supabase.co`)).toBe(PROD_REF);
    expect(supabaseProjectRefFromUrl("http://127.0.0.1:54321")).toBeUndefined();
  });
});
