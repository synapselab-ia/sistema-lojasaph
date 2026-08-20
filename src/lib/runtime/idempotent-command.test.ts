import { describe, expect, it, vi } from "vitest";
import { asEntityId, EntityId } from "@/domain/common/entity-id";
import { IdempotentCommandRegistry, semanticCommandFingerprint } from "./idempotent-command";

function idFactory(...values: string[]): () => EntityId {
  let index = 0;
  return () => asEntityId(values[index++] ?? `generated-${index}`);
}

describe("IdempotentCommandRegistry", () => {
  it("reuses the same command id after an ambiguous failure", async () => {
    const registry = new IdempotentCommandRegistry(idFactory("command-1", "command-2"));
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error("network lost after send"))
      .mockResolvedValueOnce("ok");

    await expect(registry.execute("stock-entry", { quantity: "1" }, operation)).rejects.toThrow("network lost");
    await expect(registry.execute("stock-entry", { quantity: "1" }, operation)).resolves.toBe("ok");

    expect(operation).toHaveBeenNthCalledWith(1, asEntityId("command-1"));
    expect(operation).toHaveBeenNthCalledWith(2, asEntityId("command-1"));
  });

  it("clears the intent after definitive success", async () => {
    const registry = new IdempotentCommandRegistry(idFactory("command-1", "command-2"));
    const operation = vi.fn().mockResolvedValue("ok");

    await registry.execute("stock-entry", { quantity: "1" }, operation);
    await registry.execute("stock-entry", { quantity: "1" }, operation);

    expect(operation).toHaveBeenNthCalledWith(1, asEntityId("command-1"));
    expect(operation).toHaveBeenNthCalledWith(2, asEntityId("command-2"));
  });

  it("starts a new intent when the semantic payload changes after failure", async () => {
    const registry = new IdempotentCommandRegistry(idFactory("command-1", "command-2"));
    const operation = vi.fn().mockRejectedValue(new Error("offline"));

    await expect(registry.execute("stock-entry", { quantity: "1" }, operation)).rejects.toThrow("offline");
    await expect(registry.execute("stock-entry", { quantity: "2" }, operation)).rejects.toThrow("offline");

    expect(operation).toHaveBeenNthCalledWith(1, asEntityId("command-1"));
    expect(operation).toHaveBeenNthCalledWith(2, asEntityId("command-2"));
  });

  it("deduplicates concurrent submissions of the same intent", async () => {
    let resolveOperation: ((value: string) => void) | undefined;
    const registry = new IdempotentCommandRegistry(idFactory("command-1"));
    const operation = vi.fn(() => new Promise<string>((resolve) => { resolveOperation = resolve; }));

    const first = registry.execute("cash-close", { counted: "10" }, operation);
    const second = registry.execute("cash-close", { counted: "10" }, operation);

    expect(first).toBe(second);
    expect(operation).toHaveBeenCalledTimes(0);
    await Promise.resolve();
    expect(operation).toHaveBeenCalledTimes(1);
    resolveOperation?.("ok");
    await expect(first).resolves.toBe("ok");
  });

  it("rejects a changed payload while the previous intent is still in flight", async () => {
    let resolveOperation: (() => void) | undefined;
    const registry = new IdempotentCommandRegistry(idFactory("command-1", "command-2"));
    const operation = vi.fn(() => new Promise<void>((resolve) => { resolveOperation = resolve; }));

    const first = registry.execute("purchase-receive", { quantity: "1" }, operation);
    await Promise.resolve();

    await expect(registry.execute("purchase-receive", { quantity: "2" }, operation)).rejects.toMatchObject({
      code: "IDEMPOTENT_COMMAND_IN_FLIGHT",
    });
    expect(operation).toHaveBeenCalledTimes(1);

    resolveOperation?.();
    await first;
  });

  it("fingerprints object key order canonically", () => {
    expect(semanticCommandFingerprint({ b: 2, a: { y: 2, x: 1 } }))
      .toBe(semanticCommandFingerprint({ a: { x: 1, y: 2 }, b: 2 }));
  });
});
