import { redirect } from "next/navigation";
import {
  Button,
  EmptyState,
  FeedbackMessage,
  FormField,
  Input,
  PageHeader,
  Panel,
  Select,
  StatusBadge,
} from "@/components/ui";
import { asEntityId } from "@/domain/common/entity-id";
import {
  createBusinessAction,
  createSectorAction,
  createStockLocationAction,
  createUnitAction,
  updateBusinessAction,
  updateSectorAction,
  updateStockLocationAction,
  updateUnitAction,
} from "@/lib/administration/actions";
import { resolveMembershipContext } from "@/lib/auth/runtime";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  canManageBusiness,
  canManageSector,
  canManageStockLocation,
  canManageUnit,
} from "@/modules/administration/application/administration-permissions";
import { loadAdministrationStructure } from "@/modules/administration/adapters/supabase-administration-query";
import {
  AdministrationStatus,
  StockLocationType,
  stockLocationTypeLabels,
} from "@/modules/administration/domain/administration";

interface StructurePageProps {
  searchParams: Promise<{ error?: string | string[]; message?: string | string[] }>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function StatusSelect({ name = "status", value }: { name?: string; value: AdministrationStatus }) {
  return (
    <Select name={name} defaultValue={value}>
      <option value="active">Ativo</option>
      <option value="inactive">Inativo</option>
    </Select>
  );
}

function LocationTypeSelect({ value }: { value?: StockLocationType }) {
  return (
    <Select name="locationType" defaultValue={value ?? "warehouse"}>
      {Object.entries(stockLocationTypeLabels).map(([type, label]) => (
        <option key={type} value={type}>{label}</option>
      ))}
    </Select>
  );
}

export default async function AdministrationStructurePage({ searchParams }: StructurePageProps) {
  const context = await resolveMembershipContext();
  if (!context.authenticated) redirect("/login?next=/workspace/administracao/estrutura");
  if (!context.selectedOrganization) redirect("/workspace/selecionar-organizacao");
  if (!context.userId) redirect("/login?next=/workspace/administracao/estrutura");

  const organization = context.selectedOrganization;
  const organizationId = asEntityId(organization.id);
  const client = await createServerSupabaseClient();
  const structure = await loadAdministrationStructure(client, organizationId, asEntityId(context.userId));
  const params = await searchParams;
  const error = first(params.error);
  const message = first(params.message);
  const canCreateBusiness = canManageBusiness(structure.ownMemberships);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Estrutura"
        description={
          <>
            Mantenha negócios, unidades, setores e locais de estoque dentro do escopo que seu acesso permite.
            Relações existentes não são reorganizadas automaticamente e registros são inativados em vez de apagados.
          </>
        }
      />

      {error && <FeedbackMessage tone="danger">{error}</FeedbackMessage>}
      {message && <FeedbackMessage tone="success">{message}</FeedbackMessage>}

      <FeedbackMessage tone="info">
        A estrutura abaixo preserva o cadastro atual. Nomes operacionais existentes não são reinterpretados automaticamente;
        qualquer mudança de significado deve ser validada antes de reorganizar a hierarquia.
      </FeedbackMessage>

      {canCreateBusiness && (
        <Panel>
          <details>
            <summary className="cursor-pointer font-semibold text-neutral-950">Adicionar negócio</summary>
            <form action={createBusinessAction} className="mt-4 grid gap-4 sm:grid-cols-2">
              <FormField id="new-business-name" label="Nome" required>
                {(props) => <Input {...props} name="name" required maxLength={160} />}
              </FormField>
              <FormField id="new-business-code" label="Código" hint="Identificador curto e estável dentro da organização." required>
                {(props) => <Input {...props} name="code" required maxLength={80} />}
              </FormField>
              <div className="sm:col-span-2">
                <Button type="submit" variant="primary">Adicionar negócio</Button>
              </div>
            </form>
          </details>
        </Panel>
      )}

      {structure.businesses.length === 0 ? (
        <EmptyState
          title="Nenhum negócio visível"
          description="Não há negócios cadastrados no seu escopo atual ou seu acesso não permite visualizar essa parte da estrutura."
        />
      ) : (
        <div className="space-y-5">
          {structure.businesses.map((business) => {
            const units = structure.units.filter((unit) => unit.businessId === business.id);
            const canEditBusiness = canManageBusiness(structure.ownMemberships);
            const canAddUnit = canManageUnit(structure.ownMemberships, business.id);

            return (
              <Panel key={business.id} as="section" className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-neutral-950">{business.name}</h2>
                      <StatusBadge tone={business.status === "active" ? "success" : "neutral"}>
                        {business.status === "active" ? "Ativo" : "Inativo"}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">Código: {business.code}</p>
                  </div>
                  {(canEditBusiness || canAddUnit) && (
                    <div className="flex flex-wrap gap-2">
                      {canEditBusiness && (
                        <details className="relative">
                          <summary className="cursor-pointer rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium">Editar negócio</summary>
                          <Panel className="mt-3 w-full min-w-[min(32rem,80vw)] sm:absolute sm:right-0 sm:z-10">
                            <form action={updateBusinessAction} className="space-y-4">
                              <input type="hidden" name="id" value={business.id} />
                              <FormField id={`business-${business.id}-name`} label="Nome" required>
                                {(props) => <Input {...props} name="name" defaultValue={business.name} required maxLength={160} />}
                              </FormField>
                              <FormField id={`business-${business.id}-code`} label="Código" required>
                                {(props) => <Input {...props} name="code" defaultValue={business.code} required maxLength={80} />}
                              </FormField>
                              <FormField id={`business-${business.id}-status`} label="Estado">
                                {(props) => <StatusSelect name="status" value={business.status} {...props} />}
                              </FormField>
                              <Button type="submit" variant="primary">Salvar negócio</Button>
                            </form>
                          </Panel>
                        </details>
                      )}
                      {canAddUnit && (
                        <details className="relative">
                          <summary className="cursor-pointer rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium">Adicionar unidade</summary>
                          <Panel className="mt-3 w-full min-w-[min(32rem,80vw)] sm:absolute sm:right-0 sm:z-10">
                            <form action={createUnitAction} className="space-y-4">
                              <input type="hidden" name="businessId" value={business.id} />
                              <FormField id={`business-${business.id}-unit-name`} label="Nome da unidade" required>
                                {(props) => <Input {...props} name="name" required maxLength={160} />}
                              </FormField>
                              <FormField id={`business-${business.id}-unit-code`} label="Código" required>
                                {(props) => <Input {...props} name="code" required maxLength={80} />}
                              </FormField>
                              <Button type="submit" variant="primary">Adicionar unidade</Button>
                            </form>
                          </Panel>
                        </details>
                      )}
                    </div>
                  )}
                </div>

                {units.length === 0 ? (
                  <p className="text-sm text-neutral-500">Nenhuma unidade visível neste negócio.</p>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {units.map((unit) => {
                      const sectors = structure.sectors.filter((sector) => sector.unitId === unit.id);
                      const locations = structure.stockLocations.filter((location) => location.unitId === unit.id);
                      const canEditUnit = canManageUnit(structure.ownMemberships, business.id);
                      const canAddSector = canManageSector(structure.ownMemberships, {
                        businessId: business.id,
                        unitId: unit.id,
                      });
                      const locationTargets = [
                        { sectorId: undefined, label: "Sem setor específico" },
                        ...sectors.map((sector) => ({ sectorId: sector.id, label: sector.name })),
                      ].filter((target) => canManageStockLocation(structure.ownMemberships, {
                        businessId: business.id,
                        unitId: unit.id,
                        sectorId: target.sectorId,
                      }));

                      return (
                        <article key={unit.id} className="rounded-xl border border-neutral-200 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-neutral-950">{unit.name}</h3>
                                <StatusBadge tone={unit.status === "active" ? "success" : "neutral"}>
                                  {unit.status === "active" ? "Ativa" : "Inativa"}
                                </StatusBadge>
                              </div>
                              <p className="mt-1 text-xs text-neutral-500">Código: {unit.code}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {canEditUnit && (
                                <details>
                                  <summary className="cursor-pointer text-sm font-medium underline underline-offset-4">Editar</summary>
                                  <form action={updateUnitAction} className="mt-3 space-y-3 rounded-xl bg-neutral-50 p-3">
                                    <input type="hidden" name="id" value={unit.id} />
                                    <FormField id={`unit-${unit.id}-name`} label="Nome" required>
                                      {(props) => <Input {...props} name="name" defaultValue={unit.name} required maxLength={160} />}
                                    </FormField>
                                    <FormField id={`unit-${unit.id}-code`} label="Código" required>
                                      {(props) => <Input {...props} name="code" defaultValue={unit.code} required maxLength={80} />}
                                    </FormField>
                                    <FormField id={`unit-${unit.id}-status`} label="Estado">
                                      {(props) => <StatusSelect name="status" value={unit.status} {...props} />}
                                    </FormField>
                                    <Button type="submit" size="sm" variant="primary">Salvar</Button>
                                  </form>
                                </details>
                              )}
                            </div>
                          </div>

                          <div className="mt-5 space-y-4">
                            <div>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h4 className="text-sm font-semibold text-neutral-900">Setores</h4>
                                {canAddSector && (
                                  <details>
                                    <summary className="cursor-pointer text-xs font-semibold underline underline-offset-4">Adicionar setor</summary>
                                    <form action={createSectorAction} className="mt-3 space-y-3 rounded-xl bg-neutral-50 p-3">
                                      <input type="hidden" name="unitId" value={unit.id} />
                                      <FormField id={`unit-${unit.id}-sector-name`} label="Nome" required>
                                        {(props) => <Input {...props} name="name" required maxLength={160} />}
                                      </FormField>
                                      <FormField id={`unit-${unit.id}-sector-code`} label="Código" required>
                                        {(props) => <Input {...props} name="code" required maxLength={80} />}
                                      </FormField>
                                      <Button type="submit" size="sm" variant="primary">Adicionar</Button>
                                    </form>
                                  </details>
                                )}
                              </div>
                              <div className="mt-2 space-y-2">
                                {sectors.length === 0 && <p className="text-xs text-neutral-500">Nenhum setor visível.</p>}
                                {sectors.map((sector) => {
                                  const canEditSector = canManageSector(structure.ownMemberships, {
                                    businessId: business.id,
                                    unitId: unit.id,
                                    sectorId: sector.id,
                                  });
                                  return (
                                    <div key={sector.id} className="rounded-lg bg-neutral-50 p-3 text-sm">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                          <span className="font-medium text-neutral-900">{sector.name}</span>
                                          <span className="ml-2 text-xs text-neutral-500">{sector.code}</span>
                                        </div>
                                        <StatusBadge tone={sector.status === "active" ? "success" : "neutral"}>
                                          {sector.status === "active" ? "Ativo" : "Inativo"}
                                        </StatusBadge>
                                      </div>
                                      {canEditSector && (
                                        <details className="mt-2">
                                          <summary className="cursor-pointer text-xs font-medium underline underline-offset-4">Editar setor</summary>
                                          <form action={updateSectorAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                                            <input type="hidden" name="id" value={sector.id} />
                                            <FormField id={`sector-${sector.id}-name`} label="Nome" required>
                                              {(props) => <Input {...props} name="name" defaultValue={sector.name} required maxLength={160} />}
                                            </FormField>
                                            <FormField id={`sector-${sector.id}-code`} label="Código" required>
                                              {(props) => <Input {...props} name="code" defaultValue={sector.code} required maxLength={80} />}
                                            </FormField>
                                            <FormField id={`sector-${sector.id}-status`} label="Estado">
                                              {(props) => <StatusSelect name="status" value={sector.status} {...props} />}
                                            </FormField>
                                            <div className="self-end"><Button type="submit" size="sm" variant="primary">Salvar</Button></div>
                                          </form>
                                        </details>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h4 className="text-sm font-semibold text-neutral-900">Locais de estoque</h4>
                                {locationTargets.length > 0 && (
                                  <details>
                                    <summary className="cursor-pointer text-xs font-semibold underline underline-offset-4">Adicionar local</summary>
                                    <form action={createStockLocationAction} className="mt-3 space-y-3 rounded-xl bg-neutral-50 p-3">
                                      <input type="hidden" name="unitId" value={unit.id} />
                                      <FormField id={`unit-${unit.id}-location-name`} label="Nome" required>
                                        {(props) => <Input {...props} name="name" required maxLength={160} />}
                                      </FormField>
                                      <FormField id={`unit-${unit.id}-location-code`} label="Código" required>
                                        {(props) => <Input {...props} name="code" required maxLength={80} />}
                                      </FormField>
                                      <FormField id={`unit-${unit.id}-location-sector`} label="Setor">
                                        {(props) => (
                                          <Select {...props} name="sectorId" defaultValue={locationTargets[0]?.sectorId ?? ""}>
                                            {locationTargets.map((target) => (
                                              <option key={target.sectorId ?? "unit"} value={target.sectorId ?? ""}>{target.label}</option>
                                            ))}
                                          </Select>
                                        )}
                                      </FormField>
                                      <FormField id={`unit-${unit.id}-location-type`} label="Tipo">
                                        {(props) => <LocationTypeSelect {...props} />}
                                      </FormField>
                                      <Button type="submit" size="sm" variant="primary">Adicionar</Button>
                                    </form>
                                  </details>
                                )}
                              </div>
                              <div className="mt-2 space-y-2">
                                {locations.length === 0 && <p className="text-xs text-neutral-500">Nenhum local de estoque visível.</p>}
                                {locations.map((location) => {
                                  const canEditLocation = canManageStockLocation(structure.ownMemberships, {
                                    businessId: business.id,
                                    unitId: unit.id,
                                    sectorId: location.sectorId,
                                  });
                                  const locationSector = sectors.find((sector) => sector.id === location.sectorId);
                                  const permittedSectors = [
                                    ...(canManageStockLocation(structure.ownMemberships, {
                                      businessId: business.id,
                                      unitId: unit.id,
                                    }) ? [{ sectorId: undefined, label: "Sem setor específico" }] : []),
                                    ...sectors
                                      .filter((sector) => canManageStockLocation(structure.ownMemberships, {
                                        businessId: business.id,
                                        unitId: unit.id,
                                        sectorId: sector.id,
                                      }))
                                      .map((sector) => ({ sectorId: sector.id, label: sector.name })),
                                  ];

                                  return (
                                    <div key={location.id} className="rounded-lg bg-neutral-50 p-3 text-sm">
                                      <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                          <p className="font-medium text-neutral-900">{location.name}</p>
                                          <p className="mt-1 text-xs text-neutral-500">
                                            {stockLocationTypeLabels[location.locationType]} · {locationSector?.name ?? "Sem setor específico"} · Código {location.code}
                                          </p>
                                          <p className="mt-1 text-xs text-neutral-500">
                                            Estoque negativo: {location.allowNegativeStock ? "permitido pela configuração atual" : "bloqueado pela configuração atual"}.
                                          </p>
                                        </div>
                                        <StatusBadge tone={location.status === "active" ? "success" : "neutral"}>
                                          {location.status === "active" ? "Ativo" : "Inativo"}
                                        </StatusBadge>
                                      </div>
                                      {canEditLocation && permittedSectors.length > 0 && (
                                        <details className="mt-2">
                                          <summary className="cursor-pointer text-xs font-medium underline underline-offset-4">Editar local</summary>
                                          <form action={updateStockLocationAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                                            <input type="hidden" name="id" value={location.id} />
                                            <FormField id={`location-${location.id}-name`} label="Nome" required>
                                              {(props) => <Input {...props} name="name" defaultValue={location.name} required maxLength={160} />}
                                            </FormField>
                                            <FormField id={`location-${location.id}-code`} label="Código" required>
                                              {(props) => <Input {...props} name="code" defaultValue={location.code} required maxLength={80} />}
                                            </FormField>
                                            <FormField id={`location-${location.id}-sector`} label="Setor">
                                              {(props) => (
                                                <Select {...props} name="sectorId" defaultValue={location.sectorId ?? ""}>
                                                  {permittedSectors.map((target) => (
                                                    <option key={target.sectorId ?? "unit"} value={target.sectorId ?? ""}>{target.label}</option>
                                                  ))}
                                                </Select>
                                              )}
                                            </FormField>
                                            <FormField id={`location-${location.id}-type`} label="Tipo">
                                              {(props) => <LocationTypeSelect {...props} value={location.locationType} />}
                                            </FormField>
                                            <FormField id={`location-${location.id}-status`} label="Estado">
                                              {(props) => <StatusSelect name="status" value={location.status} {...props} />}
                                            </FormField>
                                            <div className="self-end"><Button type="submit" size="sm" variant="primary">Salvar</Button></div>
                                          </form>
                                        </details>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
