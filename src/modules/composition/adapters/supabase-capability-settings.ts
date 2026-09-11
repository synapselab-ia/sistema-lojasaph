import "server-only";

import { SupabaseClient } from "@supabase/supabase-js";
import { EntityId } from "@/domain/common/entity-id";
import {
  PersistedCapabilitySetting,
  ResolvedCapabilityState,
  resolveCapabilities,
} from "../application/capability-resolver";

interface CapabilitySettingRow {
  capability_id: string;
  enabled: boolean;
}

export async function loadOrganizationCapabilitySettings(
  client: SupabaseClient,
  organizationId: EntityId,
): Promise<readonly PersistedCapabilitySetting[]> {
  const { data, error } = await client
    .from("organization_capability_settings")
    .select("capability_id, enabled")
    .eq("organization_id", organizationId)
    .order("capability_id", { ascending: true });

  if (error) {
    throw new Error(`Não foi possível carregar a composição da organização: ${error.message}`);
  }

  return Object.freeze(((data ?? []) as CapabilitySettingRow[]).map((row) => Object.freeze({
    capabilityId: row.capability_id,
    enabled: row.enabled,
  })));
}

export async function loadResolvedOrganizationCapabilities(
  client: SupabaseClient,
  organizationId: EntityId,
): Promise<readonly ResolvedCapabilityState[]> {
  return resolveCapabilities(await loadOrganizationCapabilitySettings(client, organizationId));
}
