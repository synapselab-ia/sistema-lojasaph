import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const updatePasswordPage = readFileSync(new URL("./auth/atualizar-senha/page.tsx", import.meta.url), "utf8");
const invitePage = readFileSync(new URL("./auth/invite/page.tsx", import.meta.url), "utf8");
const bootstrapPage = readFileSync(new URL("./bootstrap/page.tsx", import.meta.url), "utf8");
const organizationPage = readFileSync(new URL("./workspace/selecionar-organizacao/page.tsx", import.meta.url), "utf8");
const submitButton = readFileSync(new URL("../components/ui/submit-button.tsx", import.meta.url), "utf8");
const uiIndex = readFileSync(new URL("../components/ui/index.ts", import.meta.url), "utf8");

describe("auxiliary auth and context UX contract", () => {
  it("provides a shared pending-state submit control", () => {
    expect(uiIndex).toContain('export { SubmitButton } from "./submit-button"');
    expect(submitButton).toContain('useFormStatus');
    expect(submitButton).toContain('type = "submit"');
    expect(submitButton).toContain('loading={busy}');
    expect(submitButton).toContain('pendingLabel');
  });

  it("keeps password update semantics while using accessible shared primitives", () => {
    expect(updatePasswordPage).toContain('updatePasswordAction');
    expect(updatePasswordPage).toContain('safeInternalPath');
    expect(updatePasswordPage).toContain('FormField');
    expect(updatePasswordPage).toContain('Input');
    expect(updatePasswordPage).toContain('FeedbackMessage');
    expect(updatePasswordPage).toContain('role="alert"');
    expect(updatePasswordPage).toContain('pendingLabel="Atualizando senha..."');
  });

  it("announces invite loading and failure without changing the session handoff", () => {
    expect(invitePage).toContain('parseImplicitInviteFragment');
    expect(invitePage).toContain('fetch("/auth/invite/session"');
    expect(invitePage).toContain('/auth/atualizar-senha?next=');
    expect(invitePage).toContain('aria-busy');
    expect(invitePage).toContain('role="status"');
    expect(invitePage).toContain('role="alert"');
    expect(invitePage).toContain('FeedbackMessage');
  });

  it("preserves bootstrap actions and exposes consistent feedback and pending states", () => {
    expect(bootstrapPage).toContain('inviteBootstrapOwnerAction');
    expect(bootstrapPage).toContain('bootstrapOwnerAction');
    expect(bootstrapPage).toContain('FeedbackMessage');
    expect(bootstrapPage).toContain('role="alert"');
    expect(bootstrapPage).toContain('role="status"');
    expect(bootstrapPage).toContain('SubmitButton');
    expect(bootstrapPage).toContain('href="/login?next=/bootstrap"');
  });

  it("preserves organization context redirects while standardizing selection feedback", () => {
    expect(organizationPage).toContain('resolveMembershipContext');
    expect(organizationPage).toContain('redirect("/sem-acesso")');
    expect(organizationPage).toContain('redirect("/workspace")');
    expect(organizationPage).toContain('selectOrganizationAction');
    expect(organizationPage).toContain('PageHeader');
    expect(organizationPage).toContain('FeedbackMessage');
    expect(organizationPage).toContain('role="alert"');
    expect(organizationPage).toContain('pendingLabel="Selecionando..."');
  });
});
