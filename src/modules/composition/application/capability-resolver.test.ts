import { describe, expect, it } from "vitest";
import { resolveWorkspaceNavigation, workspaceNavigationHrefs } from "@/lib/navigation/workspace-navigation";
import {
  CapabilityDependencyError,
  enabledCapabilityIds,
  isCapabilityEnabled,
  resolveCapabilities,
  validateCapabilityChange,
} from "./capability-resolver";
import { capabilityIds } from "../domain/capability";

describe("capability resolver", () => {
  it("preserves the existing product by default when no organization override exists", () => {
    const states = resolveCapabilities([]);
    expect(isCapabilityEnabled(states, capabilityIds.stockLoans)).toBe(true);
    expect(enabledCapabilityIds(states)).toContain(capabilityIds.inventory);
    expect(enabledCapabilityIds(states)).toContain(capabilityIds.stockLoans);
  });

  it("applies the configurable stock-loans override without disabling its inventory dependency", () => {
    const states = resolveCapabilities([{ capabilityId: capabilityIds.stockLoans, enabled: false }]);
    expect(isCapabilityEnabled(states, capabilityIds.stockLoans)).toBe(false);
    expect(isCapabilityEnabled(states, capabilityIds.inventory)).toBe(true);
  });

  it("ignores persisted attempts to mutate locked or unknown capabilities", () => {
    const states = resolveCapabilities([
      { capabilityId: capabilityIds.audit, enabled: false },
      { capabilityId: "future-unknown", enabled: false },
    ]);
    expect(isCapabilityEnabled(states, capabilityIds.audit)).toBe(true);
  });

  it("rejects changes to capabilities that are not configurable in the current rollout", () => {
    const states = resolveCapabilities([]);
    expect(() => validateCapabilityChange(states, capabilityIds.inventory, false))
      .toThrow(CapabilityDependencyError);
  });
});

describe("capability-aware workspace navigation", () => {
  it("removes Empréstimos when the organization disables the capability", () => {
    const states = resolveCapabilities([{ capabilityId: capabilityIds.stockLoans, enabled: false }]);
    const navigation = resolveWorkspaceNavigation({
      enabledCapabilities: enabledCapabilityIds(states),
      isOrganizationOwner: false,
    });

    expect(workspaceNavigationHrefs(navigation)).not.toContain("/workspace/emprestimos");
    expect(workspaceNavigationHrefs(navigation)).not.toContain("/workspace/administracao/modulos");
  });

  it("shows the compositor only to an Organization-wide owner", () => {
    const states = resolveCapabilities([]);
    const navigation = resolveWorkspaceNavigation({
      enabledCapabilities: enabledCapabilityIds(states),
      isOrganizationOwner: true,
    });

    expect(workspaceNavigationHrefs(navigation)).toContain("/workspace/emprestimos");
    expect(workspaceNavigationHrefs(navigation)).toContain("/workspace/administracao/modulos");
  });
});
