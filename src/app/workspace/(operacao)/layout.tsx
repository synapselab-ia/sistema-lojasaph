import { redirect } from "next/navigation";
import { EntityId } from "@/domain/common/entity-id";
import { RuntimeShell } from "@/components/runtime-shell";
import { resolveMembershipContext } from "@/lib/auth/runtime";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SupabaseStockItemRepository } from "@/modules/catalog/adapters/supabase-stock-item-repository";
import { loadWorkspaceReferenceData } from "@/modules/master-data/adapters/supabase-workspace-query";
import { RuntimeWorkspaceProvider } from "@/modules/master-data/ui/runtime-workspace-provider";
import { SupabaseSupplierRepository } from "@/modules/suppliers/adapters/supabase-supplier-repository";

export const dynamic = "force-dynamic";

export default async function PersistentWorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const context = await resolveMembershipContext();
  if (!context.authenticated) redirect("/login?next=/workspace&error=Sessão+expirada.+Entre+novamente.");
  if (context.organizations.length === 0) redirect("/sem-acesso");
  if (!context.selectedOrganization) redirect("/workspace/selecionar-organizacao");

  const organization = context.selectedOrganization;
  const organizationId = organization.id as EntityId;
  const supabase = await createServerSupabaseClient();
  const stockItemsRepository = new SupabaseStockItemRepository(supabase);
  const suppliersRepository = new SupabaseSupplierRepository(supabase);

  const [stockItems, suppliers, referenceData] = await Promise.all([
    stockItemsRepository.listByOrganization(organizationId),
    suppliersRepository.listByOrganization(organizationId),
    loadWorkspaceReferenceData(supabase, organizationId),
  ]);

  return (
    <RuntimeWorkspaceProvider
      organizationId={organizationId}
      organizationName={organization.name}
      roles={organization.roles}
      organizationWideRoles={organization.organizationWideRoles}
      initialData={{ ...referenceData, stockItems, suppliers }}
    >
      <RuntimeShell
        organizationName={organization.name}
        roles={organization.roles}
        canSwitchOrganization={context.organizations.length > 1}
      >
        {children}
      </RuntimeShell>
    </RuntimeWorkspaceProvider>
  );
}
