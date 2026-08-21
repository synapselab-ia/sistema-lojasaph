import { describe, expect, it, vi } from "vitest";
import { DomainError } from "@/domain/common/domain-error";
import { executeFinanceAttachmentUpload } from "./attachment-upload";

const baseInput = {
  attachmentId: "92000000-0000-4000-8000-000000000150",
  organizationId: "92000000-0000-4000-8000-000000000100",
  payableDocumentId: "92000000-0000-4000-8000-000000000140",
  file: { name: "nota.pdf", type: "application/pdf", size: 1024 },
  checksumSha256: "a".repeat(64),
};

function dependencies() {
  return {
    authorize: vi.fn(async () => true),
    ensureBucket: vi.fn(async () => undefined),
    upload: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  };
}

describe("finance attachment upload orchestration", () => {
  it("authorizes before touching storage and registers canonical metadata", async () => {
    const deps = dependencies();
    const result = await executeFinanceAttachmentUpload(baseInput, deps);

    expect(deps.authorize).toHaveBeenCalledOnce();
    expect(deps.ensureBucket).toHaveBeenCalledOnce();
    expect(deps.upload).toHaveBeenCalledWith(result.storageKey);
    expect(deps.register).toHaveBeenCalledWith(result);
    expect(deps.remove).not.toHaveBeenCalled();
  });

  it("does not touch storage when scope is denied", async () => {
    const deps = dependencies();
    deps.authorize.mockResolvedValue(false);

    await expect(executeFinanceAttachmentUpload(baseInput, deps)).rejects.toMatchObject({
      code: "INSUFFICIENT_ROLE_OR_SCOPE",
    } satisfies Partial<DomainError>);
    expect(deps.ensureBucket).not.toHaveBeenCalled();
    expect(deps.upload).not.toHaveBeenCalled();
  });

  it("removes the uploaded object when metadata registration fails", async () => {
    const deps = dependencies();
    deps.register.mockRejectedValue(new Error("metadata failed"));

    await expect(executeFinanceAttachmentUpload(baseInput, deps)).rejects.toThrow("metadata failed");
    expect(deps.remove).toHaveBeenCalledWith(
      "92000000-0000-4000-8000-000000000100/92000000-0000-4000-8000-000000000140/92000000-0000-4000-8000-000000000150",
    );
  });
});
