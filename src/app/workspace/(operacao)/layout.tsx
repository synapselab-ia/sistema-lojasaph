import { redirect } from "next/navigation";
import { EntityId } from "@/domain/common/entity-id";
import { RuntimeShell } from "@/components/runtime-shell";
import { resolveMembershipContext } from "@/lib/auth/runtime";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SupabaseStockItemRepository } from "@/modules/catalog/adapters/supabase-stock-item-repository";
import { enabledCapabilityIds } from "@/modules/composition/application/capability-resolver";
import { loadResolvedOrganizationCapabilities } from "@/modules/composition/adapters/supabase-capability-settings";
import { SupabaseEmployeeRepository } from "@/modules/employees/adapters/supabase-employee-repository";
import { SupabaseStockLossGateway } from "@/modules/inventory/adapters/supabase-stock-loss-gateway";
import { SupabaseStockMinimumPolicyGateway } from "@/modules/inventory/adapters/supabase-stock-minimum-policy-gateway";
import { loadWorkspaceReferenceData } from "@/modules/master-data/adapters/supabase-workspace-query";
import { RuntimeWorkspaceBootstrap } from "@/modules/master-data/ui/runtime-workspace-bootstrap";
import { serializeRuntimeWorkspaceInitialData } from "@/modules/master-data/ui/runtime-workspace-wire";
import { SupabaseSupplierRepository } from "@/modules/suppliers/adapters/supabase-supplier-repository";

export const dynamic = "force-dynamic";

export default async function PersistentWorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const context = await resolveMembershipContext();
  if (!context.authenticated) redirect("/login?next=/workspace&error=Sessão+expirada.+Entre+novamente.");
  if (context.organizations.length === 0) redirect("/sem-acesso");
  if (!context.selectedOrganization) redirect("/workspace/selecionar-organizacao");

  const organization = context.selectedOrganization;
  const organizationId = organization.id as EntityId;
  const supabaseConfig = getSupabasePublicEnv();
  const supabase = await createServerSupabaseClient();
  const stockItemsRepository = new SupabaseStockItemRepository(supabase);
  const suppliersRepository = new SupabaseSupplierRepository(supabase);
  const employeesRepository = new SupabaseEmployeeRepository(supabase);
  const stockLossGateway = new SupabaseStockLossGateway(supabase);
  const stockMinimumGateway = new SupabaseStockMinimumPolicyGateway(supabase);

  const [
    stockItems,
    suppliers,
    employees,
    referenceData,
    stockLossReasons,
    stockLosses,
    stockMinimumPolicies,
    capabilityStates,
  ] = await Promise.all([
    stockItemsRepository.listByOrganization(organizationId),
    suppliersRepository.listByOrganization(organizationId),
    employeesRepository.listByOrganization(organizationId),
    loadWorkspaceReferenceData(supabase, organizationId),
    stockLossGateway.listReasons(organizationId),
    stockLossGateway.listRecent(organizationId),
    stockMinimumGateway.listByOrganization(organizationId),
    loadResolvedOrganizationCapabilities(supabase, organizationId),
  ]);

  const initialData = serializeRuntimeWorkspaceInitialData({
    ...referenceData,
    stockItems,
    suppliers,
    employees,
    stockLossReasons,
    stockLosses,
    stockMinimumPolicies,
  });
  const activeCapabilities = enabledCapabilityIds(capabilityStates);

  return (
    <RuntimeWorkspaceBootstrap
      organizationId={organizationId}
      organizationName={organization.name}
      roles={organization.roles}
      organizationWideRoles={organization.organizationWideRoles}
      initialData={initialData}
      supabaseConfig={supabaseConfig}
    >
      <RuntimeShell
        organizationName={organization.name}
        roles={organization.roles}
        canSwitchOrganization={context.organizations.length > 1}
        enabledCapabilities={activeCapabilities}
        isOrganizationOwner={organization.organizationWideRoles.includes("owner")}
      >
        {children}
      </RuntimeShell>
    </RuntimeWorkspaceBootstrap>
  );
}
