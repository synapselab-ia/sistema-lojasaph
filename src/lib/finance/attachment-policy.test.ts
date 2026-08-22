import { describe, expect, it } from "vitest";
import { DomainError } from "@/domain/common/domain-error";
import {
  FINANCE_ATTACHMENT_MAX_BYTES,
  financeAttachmentStorageKey,
  safeDownloadFilename,
  validateFinanceAttachmentFile,
} from "./attachment-policy";

describe("finance attachment policy", () => {
  it("accepts supported files at the size boundary", () => {
    expect(() => validateFinanceAttachmentFile({
      name: "nota.pdf",
      type: "application/pdf",
      size: FINANCE_ATTACHMENT_MAX_BYTES,
    })).not.toThrow();
  });

  it.each([
    [{ name: "", type: "application/pdf", size: 1 }, "INVALID_ATTACHMENT_FILENAME"],
    [{ name: "arquivo.exe", type: "application/octet-stream", size: 1 }, "INVALID_ATTACHMENT_MIME_TYPE"],
    [{ name: "nota.pdf", type: "application/pdf", size: 0 }, "INVALID_ATTACHMENT_SIZE"],
    [{ name: "nota.pdf", type: "application/pdf", size: FINANCE_ATTACHMENT_MAX_BYTES + 1 }, "INVALID_ATTACHMENT_SIZE"],
  ])("rejects invalid descriptor %#", (descriptor, expectedCode) => {
    try {
      validateFinanceAttachmentFile(descriptor);
      throw new Error("expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe(expectedCode);
    }
  });

  it("builds an opaque canonical storage key", () => {
    expect(financeAttachmentStorageKey(
      "92000000-0000-4000-8000-000000000100",
      "92000000-0000-4000-8000-000000000140",
      "92000000-0000-4000-8000-000000000150",
    )).toBe(
      "92000000-0000-4000-8000-000000000100/92000000-0000-4000-8000-000000000140/92000000-0000-4000-8000-000000000150",
    );
  });

  it("sanitizes download filenames", () => {
    expect(safeDownloadFilename('nota\r\n"perigosa/2026.pdf')).toBe("nota___perigosa_2026.pdf");
  });
});
