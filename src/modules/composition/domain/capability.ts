export const capabilityIds = {
  organizationContext: "organization-context",
  authorization: "authorization",
  audit: "audit",
  composition: "composition",
  inventory: "inventory",
  stockLoans: "stock-loans",
} as const;

export type CapabilityId = (typeof capabilityIds)[keyof typeof capabilityIds];

export type CapabilityCategory = "foundation" | "operations";

export interface CapabilityDefinition {
  readonly id: CapabilityId;
  readonly name: string;
  readonly description: string;
  readonly category: CapabilityCategory;
  readonly core: boolean;
  readonly configurable: boolean;
  readonly defaultEnabled: boolean;
  readonly dependencies: readonly CapabilityId[];
  readonly navigationHrefs: readonly string[];
}

export const capabilityRegistry: readonly CapabilityDefinition[] = Object.freeze([
  {
    id: capabilityIds.organizationContext,
    name: "Organização e contexto",
    description: "Mantém o isolamento dos dados e o contexto da organização ativa.",
    category: "foundation",
    core: true,
    configurable: false,
    defaultEnabled: true,
    dependencies: [],
    navigationHrefs: [],
  },
  {
    id: capabilityIds.authorization,
    name: "Autorização e escopos",
    description: "Aplica papéis, escopos e políticas de acesso do produto.",
    category: "foundation",
    core: true,
    configurable: false,
    defaultEnabled: true,
    dependencies: [capabilityIds.organizationContext],
    navigationHrefs: [],
  },
  {
    id: capabilityIds.audit,
    name: "Auditoria",
    description: "Preserva rastreabilidade das mudanças e operações relevantes.",
    category: "foundation",
    core: true,
    configurable: false,
    defaultEnabled: true,
    dependencies: [capabilityIds.organizationContext, capabilityIds.authorization],
    navigationHrefs: [],
  },
  {
    id: capabilityIds.composition,
    name: "Composição do sistema",
    description: "Mantém a configuração estrutural usada para montar o produto.",
    category: "foundation",
    core: true,
    configurable: false,
    defaultEnabled: true,
    dependencies: [capabilityIds.organizationContext, capabilityIds.authorization, capabilityIds.audit],
    navigationHrefs: ["/workspace/administracao/modulos"],
  },
  {
    id: capabilityIds.inventory,
    name: "Estoque",
    description: "Base operacional para saldos, movimentações, lotes e controles derivados.",
    category: "operations",
    core: false,
    configurable: false,
    defaultEnabled: true,
    dependencies: [],
    navigationHrefs: ["/workspace/estoque"],
  },
  {
    id: capabilityIds.stockLoans,
    name: "Empréstimos",
    description: "Controla saídas temporárias de mercadorias e suas restituições físicas ou monetárias.",
    category: "operations",
    core: false,
    configurable: true,
    defaultEnabled: true,
    dependencies: [capabilityIds.inventory],
    navigationHrefs: ["/workspace/emprestimos"],
  },
]);

const capabilityById = new Map(capabilityRegistry.map((capability) => [capability.id, capability]));

export function isCapabilityId(value: string): value is CapabilityId {
  return capabilityById.has(value as CapabilityId);
}

export function getCapabilityDefinition(id: CapabilityId): CapabilityDefinition {
  const capability = capabilityById.get(id);
  if (!capability) throw new Error(`Capability não registrada: ${id}`);
  return capability;
}
