"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";
import type { CapabilityId } from "../domain/capability";

interface CapabilityContextValue {
  readonly enabledCapabilities: readonly CapabilityId[];
  isEnabled(capabilityId: CapabilityId): boolean;
}

const CapabilityContext = createContext<CapabilityContextValue | null>(null);

export function CapabilityProvider({
  children,
  enabledCapabilities,
}: {
  children: ReactNode;
  enabledCapabilities: readonly CapabilityId[];
}) {
  const value = useMemo<CapabilityContextValue>(() => {
    const enabled = new Set(enabledCapabilities);
    return Object.freeze({
      enabledCapabilities: Object.freeze([...enabledCapabilities]),
      isEnabled(capabilityId: CapabilityId) {
        return enabled.has(capabilityId);
      },
    });
  }, [enabledCapabilities]);

  return <CapabilityContext.Provider value={value}>{children}</CapabilityContext.Provider>;
}

export function useCapabilities(): CapabilityContextValue {
  const value = useContext(CapabilityContext);
  if (!value) throw new Error("CapabilityProvider ausente no workspace.");
  return value;
}
