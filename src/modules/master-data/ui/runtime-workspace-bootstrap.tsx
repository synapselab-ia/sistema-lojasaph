"use client";

import { ReactNode, useMemo } from "react";
import { EntityId } from "@/domain/common/entity-id";
import type { SupabasePublicConfig } from "@/lib/runtime/environment";
import { RuntimeWorkspaceProvider } from "./runtime-workspace-provider";
import {
  hydrateRuntimeWorkspaceInitialData,
  type RuntimeWorkspaceInitialDataWire,
} from "./runtime-workspace-wire";

export function RuntimeWorkspaceBootstrap({
  children,
  organizationId,
  organizationName,
  roles,
  organizationWideRoles,
  initialData,
  supabaseConfig,
}: {
  children: ReactNode;
  organizationId: EntityId;
  organizationName: string;
  roles: readonly string[];
  organizationWideRoles: readonly string[];
  initialData: RuntimeWorkspaceInitialDataWire;
  supabaseConfig: SupabasePublicConfig;
}) {
  const hydratedInitialData = useMemo(
    () => hydrateRuntimeWorkspaceInitialData(initialData),
    [initialData],
  );

  return (
    <RuntimeWorkspaceProvider
      organizationId={organizationId}
      organizationName={organizationName}
      roles={roles}
      organizationWideRoles={organizationWideRoles}
      initialData={hydratedInitialData}
      supabaseConfig={supabaseConfig}
    >
      {children}
    </RuntimeWorkspaceProvider>
  );
}
