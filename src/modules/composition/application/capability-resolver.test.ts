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
    expect(isCapabilityEnabled(states, capabilityIds.stockMinimum)).toBe(true);
    expect(enabledCapabilityIds(states)).toContain(capabilityIds.inventory);
    expect(enabledCapabilityIds(states)).toContain(capabilityIds.stockLoans);
    expect(enabledCapabilityIds(states)).toContain(capabilityIds.stockMinimum);
  });

  it("applies independent stock capability overrides without disabling inventory", () => {
    const loanStates = resolveCapabilities([{ capabilityId: capabilityIds.stockLoans, enabled: false }]);
    expect(isCapabilityEnabled(loanStates, capabilityIds.stockLoans)).toBe(false);
    expect(isCapabilityEnabled(loanStates, capabilityIds.stockMinimum)).toBe(true);
    expect(isCapabilityEnabled(loanStates, capabilityIds.inventory)).toBe(true);

    const minimumStates = resolveCapabilities([{ capabilityId: capabilityIds.stockMinimum, enabled: false }]);
    expect(isCapabilityEnabled(minimumStates, capabilityIds.stockMinimum)).toBe(false);
    expect(isCapabilityEnabled(minimumStates, capabilityIds.stockLoans)).toBe(true);
    expect(isCapabilityEnabled(minimumStates, capabilityIds.inventory)).toBe(true);
  });

  it("ignores persisted attempts to mutate locked or unknown capabilities", () => {
    const states = resolveCapabilities([
      { capabilityId: capabilityIds.audit, enabled: false },
      { capabilityId: "future-unknown", enabled: false },
    ]);
    expect(isCapabilityEnabled(states, capabilityIds.audit)).toBe(true);
  });

  it("accepts changes to the two approved capabilities and rejects locked inventory", () => {
    const states = resolveCapabilities([]);
    expect(() => validateCapabilityChange(states, capabilityIds.stockLoans, false)).not.toThrow();
    expect(() => validateCapabilityChange(states, capabilityIds.stockMinimum, false)).not.toThrow();
    expect(() => validateCapabilityChange(states, capabilityIds.inventory, false))
      .toThrow(CapabilityDependencyError);
  });
});

describe("capability-aware workspace navigation", () => {
  it("removes each disabled stock capability without hiding the inventory area", () => {
    const states = resolveCapabilities([
      { capabilityId: capabilityIds.stockLoans, enabled: false },
      { capabilityId: capabilityIds.stockMinimum, enabled: false },
    ]);
    const navigation = resolveWorkspaceNavigation({
      enabledCapabilities: enabledCapabilityIds(states),
      isOrganizationOwner: false,
    });
    const hrefs = workspaceNavigationHrefs(navigation);

    expect(hrefs).toContain("/workspace/estoque");
    expect(hrefs).not.toContain("/workspace/emprestimos");
    expect(hrefs).not.toContain("/workspace/estoque/minimos");
    expect(hrefs).not.toContain("/workspace/administracao/modulos");
  });

  it("shows the compositor only to an Organization-wide owner", () => {
    const states = resolveCapabilities([]);
    const navigation = resolveWorkspaceNavigation({
      enabledCapabilities: enabledCapabilityIds(states),
      isOrganizationOwner: true,
    });
    const hrefs = workspaceNavigationHrefs(navigation);

    expect(hrefs).toContain("/workspace/emprestimos");
    expect(hrefs).toContain("/workspace/estoque/minimos");
    expect(hrefs).toContain("/workspace/administracao/modulos");
  });
});
