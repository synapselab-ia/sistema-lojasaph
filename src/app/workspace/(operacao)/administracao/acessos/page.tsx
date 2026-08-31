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
  inviteOrganizationAccessAction,
  linkEmployeeIdentityAction,
  updateOrganizationAccessAction,
} from "@/lib/administration/actions";
import { resolveMembershipContext } from "@/lib/auth/runtime";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { canManageOrganizationAccess } from "@/modules/administration/application/administration-permissions";
import { administrationScopeValue } from "@/modules/administration/application/administration-scope";
import {
  loadAdministrationAccess,
  loadAdministrationEmployees,
  loadAdministrationStructure,
} from "@/modules/administration/adapters/supabase-administration-query";
import {
  AdministrationAccess,
  AdministrationStructure,
  administrationRoleLabels,
  administrationRoles,
} from "@/modules/administration/domain/administration";

interface AccessPageProps {
  searchParams: Promise<{ error?: string | string[]; message?: string | string[] }>;
}

interface ScopeOption {
  readonly value: string;
  readonly label: string;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function scopeOptions(structure: AdministrationStructure): readonly ScopeOption[] {
  const options: ScopeOption[] = [{ value: "organization", label: "Toda a organização" }];
  for (const business of structure.businesses) {
    options.push({ value: `business:${business.id}`, label: `Negócio · ${business.name}` });
  }
  for (const unit of structure.units) {
    const business = structure.businesses.find((candidate) => candidate.id === unit.businessId);
    options.push({
      value: `unit:${unit.id}`,
      label: `Unidade · ${unit.name}${business ? ` · ${business.name}` : ""}`,
    });
  }
  for (const sector of structure.sectors) {
    const unit = structure.units.find((candidate) => candidate.id === sector.unitId);
    options.push({
      value: `sector:${sector.id}`,
      label: `Setor · ${sector.name}${unit ? ` · ${unit.name}` : ""}`,
    });
  }
  return options;
}

function accessScopeLabel(access: AdministrationAccess, structure: AdministrationStructure): string {
  if (access.sectorId) {
    const sector = structure.sectors.find((candidate) => candidate.id === access.sectorId);
    const unit = sector ? structure.units.find((candidate) => candidate.id === sector.unitId) : undefined;
    return sector ? `Setor · ${sector.name}${unit ? ` · ${unit.name}` : ""}` : "Setor fora da estrutura visível";
  }
  if (access.unitId) {
    const unit = structure.units.find((candidate) => candidate.id === access.unitId);
    return unit ? `Unidade · ${unit.name}` : "Unidade fora da estrutura visível";
  }
  if (access.businessId) {
    const business = structure.businesses.find((candidate) => candidate.id === access.businessId);
    return business ? `Negócio · ${business.name}` : "Negócio fora da estrutura visível";
  }
  return "Toda a organização";
}

export default async function AdministrationAccessPage({ searchParams }: AccessPageProps) {
  const context = await resolveMembershipContext();
  if (!context.authenticated) redirect("/login?next=/workspace/administracao/acessos");
  if (!context.selectedOrganization) redirect("/workspace/selecionar-organizacao");
  if (!context.userId) redirect("/login?next=/workspace/administracao/acessos");

  const organization = context.selectedOrganization;
  const canManageAccess = canManageOrganizationAccess(organization.organizationWideRoles);
  const params = await searchParams;
  const error = first(params.error);
  const message = first(params.message);

  if (!canManageAccess) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          eyebrow="Administração"
          title="Usuários e permissões"
          description="A gestão de acesso à organização é restrita a perfis administrativos com permissão sobre toda a organização."
        />
        {error && <FeedbackMessage tone="danger">{error}</FeedbackMessage>}
        <Panel tone="attention">
          <h2 className="font-semibold">Acesso administrativo necessário</h2>
          <p className="mt-2 text-sm leading-6">
            Seu perfil atual pode continuar usando as áreas permitidas, mas não pode convidar pessoas nem alterar seus acessos.
          </p>
        </Panel>
      </div>
    );
  }

  const organizationId = asEntityId(organization.id);
  const client = await createServerSupabaseClient();
  const [structure, accesses, employees] = await Promise.all([
    loadAdministrationStructure(client, organizationId, asEntityId(context.userId)),
    loadAdministrationAccess(client, organizationId),
    loadAdministrationEmployees(client, organizationId),
  ]);
  const scopes = scopeOptions(structure);
  const firstMembershipByUser = new Map<string, string>();
  for (const access of accesses) {
    if (!firstMembershipByUser.has(access.userId)) {
      firstMembershipByUser.set(access.userId, access.membershipId);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Usuários e permissões"
        description="Convide pessoas por e-mail, atribua os perfis e áreas de atuação disponíveis e, quando corresponder à mesma pessoa, vincule a conta de acesso a um funcionário cadastrado."
      />

      {error && <FeedbackMessage tone="danger">{error}</FeedbackMessage>}
      {message && <FeedbackMessage tone="success">{message}</FeedbackMessage>}

      <FeedbackMessage tone="attention">
        Os perfis disponíveis agrupam permissões do sistema. Eles não representam automaticamente os cargos reais da operação; valide a necessidade de acesso antes de atribuir um perfil.
      </FeedbackMessage>

      <Panel>
        <h2 className="text-lg font-semibold text-neutral-950">Convidar ou adicionar acesso</h2>
        <p className="mt-1 text-sm leading-6 text-neutral-600">
          Se o e-mail ainda não possuir uma conta de acesso, será enviado um convite para definição de senha. Se a conta já existir, o novo acesso é associado sem reenviar convite automaticamente.
        </p>
        <form action={inviteOrganizationAccessAction} className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] lg:items-end">
          <FormField id="invite-access-email" label="E-mail" required>
            {(props) => <Input {...props} name="email" type="email" autoComplete="email" required />}
          </FormField>
          <FormField id="invite-access-role" label="Perfil" required>
            {(props) => (
              <Select {...props} name="role" defaultValue="viewer" required>
                {administrationRoles.map((role) => (
                  <option key={role} value={role}>{administrationRoleLabels[role]}</option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField id="invite-access-scope" label="Área de atuação" required>
            {(props) => (
              <Select {...props} name="scope" defaultValue="organization" required>
                {scopes.map((scope) => <option key={scope.value} value={scope.value}>{scope.label}</option>)}
              </Select>
            )}
          </FormField>
          <Button type="submit" variant="primary">Adicionar acesso</Button>
        </form>
      </Panel>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-950">Acessos cadastrados</h2>
          <p className="mt-1 text-sm text-neutral-600">Uma pessoa pode possuir mais de um acesso quando precisa atuar com perfis ou áreas de atuação diferentes.</p>
        </div>

        {accesses.length === 0 ? (
          <EmptyState
            title="Nenhum acesso cadastrado"
            description="Convide a primeira pessoa autorizada ou adicione um perfil a uma conta existente."
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {accesses.map((access) => {
              const currentScope = administrationScopeValue(access);
              const availableScope = scopes.some((scope) => scope.value === currentScope);
              const identityOwnerCard = firstMembershipByUser.get(access.userId) === access.membershipId;
              const employeeOptions = employees.filter(
                (employee) => !employee.linkedUserId || employee.linkedUserId === access.userId,
              );

              return (
                <Panel key={access.membershipId} as="article" className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-all font-semibold text-neutral-950">{access.email}</p>
                      <p className="mt-1 text-sm text-neutral-600">
                        {access.employeeName ? `Funcionário vinculado: ${access.employeeName}` : "Sem funcionário vinculado"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={access.emailConfirmed ? "success" : "attention"}>
                        {access.emailConfirmed ? "Conta confirmada" : "Convite pendente"}
                      </StatusBadge>
                      <StatusBadge tone={access.active ? "success" : "neutral"}>
                        {access.active ? "Acesso ativo" : "Acesso inativo"}
                      </StatusBadge>
                    </div>
                  </div>

                  <dl className="grid gap-3 rounded-xl bg-neutral-50 p-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-neutral-500">Perfil</dt>
                      <dd className="mt-1 font-medium text-neutral-900">{administrationRoleLabels[access.role]}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-neutral-500">Área de atuação</dt>
                      <dd className="mt-1 font-medium text-neutral-900">{accessScopeLabel(access, structure)}</dd>
                    </div>
                  </dl>

                  {identityOwnerCard && (
                    <details>
                      <summary className="cursor-pointer text-sm font-semibold underline underline-offset-4">Vincular funcionário</summary>
                      <form action={linkEmployeeIdentityAction} className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <input type="hidden" name="membershipId" value={access.membershipId} />
                        <FormField
                          id={`access-${access.membershipId}-employee`}
                          label="Funcionário"
                          hint="O vínculo indica que a conta e o cadastro representam a mesma pessoa. Ele não altera permissões."
                        >
                          {(props) => (
                            <Select {...props} name="employeeId" defaultValue={access.employeeId ?? ""}>
                              <option value="">Sem funcionário vinculado</option>
                              {employeeOptions.map((employee) => (
                                <option key={employee.id} value={employee.id}>
                                  {employee.name}{employee.code ? ` · ${employee.code}` : ""}{employee.status === "inactive" ? " · inativo" : ""}
                                </option>
                              ))}
                            </Select>
                          )}
                        </FormField>
                        <Button type="submit">Salvar vínculo</Button>
                      </form>
                    </details>
                  )}

                  <details>
                    <summary className="cursor-pointer text-sm font-semibold underline underline-offset-4">Alterar acesso</summary>
                    <form action={updateOrganizationAccessAction} className="mt-4 grid gap-4 sm:grid-cols-2">
                      <input type="hidden" name="membershipId" value={access.membershipId} />
                      <FormField id={`access-${access.membershipId}-role`} label="Perfil" required>
                        {(props) => (
                          <Select {...props} name="role" defaultValue={access.role} required>
                            {administrationRoles.map((role) => (
                              <option key={role} value={role}>{administrationRoleLabels[role]}</option>
                            ))}
                          </Select>
                        )}
                      </FormField>
                      <FormField
                        id={`access-${access.membershipId}-scope`}
                        label="Área de atuação"
                        hint={!availableScope ? "A área atual não está mais visível nesta estrutura; selecione uma opção válida antes de salvar." : undefined}
                        required
                      >
                        {(props) => (
                          <Select {...props} name="scope" defaultValue={availableScope ? currentScope : ""} required>
                            {!availableScope && <option value="" disabled>Selecione uma área disponível</option>}
                            {scopes.map((scope) => <option key={scope.value} value={scope.value}>{scope.label}</option>)}
                          </Select>
                        )}
                      </FormField>
                      <FormField id={`access-${access.membershipId}-active`} label="Estado">
                        {(props) => (
                          <Select {...props} name="active" defaultValue={access.active ? "true" : "false"}>
                            <option value="true">Ativo</option>
                            <option value="false">Inativo</option>
                          </Select>
                        )}
                      </FormField>
                      <div className="self-end">
                        <Button type="submit" variant="primary">Salvar acesso</Button>
                      </div>
                    </form>
                  </details>
                </Panel>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
