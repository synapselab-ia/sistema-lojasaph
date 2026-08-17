# Current State — Sistema Lojasaph

Última atualização: 2026-08-17

## Fase atual

Fase 4 — cadastros base e primeiro fluxo funcional: implementada na branch `agent/base-catalogs`, PR #14, com CI completo passando.

## Estado do GitHub

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch principal: `main`
- Issue atual: #13 — Fase 4 — Cadastros base e primeiro fluxo funcional
- Branch atual: `agent/base-catalogs`
- PR atual: #14 — Fase 4 — cadastros base e primeiro fluxo funcional
- Próxima Issue criada: #15 — Fase 5 — Estoque transacional: entrada, retirada e transferência
- Supabase ainda não foi escolhido/configurado.

## Fases concluídas

### Fase 0 — governança

Governança para múltiplos chats, AGENTS, CURRENT_STATE, HANDOFF e NEXT_ACTION.

### Fase 1 — engenharia reversa

Seis planilhas transformadas em requisitos, regras, catálogo de campos, plano de migração e dúvidas rastreáveis.

### Fase 2 — domínio/modelo lógico

Modelo consolidado, ERD e ADR-001 a ADR-005 integrados.

### Fase 3 — fundação técnica

Next.js/React/TypeScript strict, Tailwind, ESLint, Vitest, package-lock, CI com `npm ci`, health endpoint, value objects e repository pattern.

### Fase 4 — cadastros base

Implementado:

- workspace responsivo em `/cadastros`;
- visualização da estrutura Organization → Business → Unit → Sector/StockLocation;
- cadastro/edição de StockItem;
- categorias e unidades essenciais de demonstração;
- Supplier com múltiplos contatos;
- cadastro/edição de fornecedores;
- preço observado por fornecedor/produto;
- MasterDataService separado da UI;
- repositories/adapters in-memory;
- fixtures anonimizados;
- testes de integração do serviço;
- documentação `docs/modules/master-data.md`.

## Persistência atual

O workspace de cadastros é propositalmente in-memory no navegador. Alterações duram apenas durante a sessão/reload e a interface informa isso explicitamente.

Essa limitação é intencional para validar domínio e UX antes da adoção de banco real.

## Validação

O CI do PR #14 passou:

1. `npm ci`;
2. lint;
3. typecheck;
4. testes unitários/integração;
5. build de produção.

Um erro inicial do lint sobre acesso a `ref` durante render foi detectado pelo CI, corrigido usando inicialização lazy via `useState` e revalidado com sucesso.

## Decisões vigentes

1. GitHub é a fonte oficial de verdade.
2. Sistema multi-negócio/multi-unidade.
3. Setor e local de estoque são distintos.
4. SalesItem e StockItem são distintos.
5. Saldo de estoque deriva do ledger.
6. Movimentos confirmados são revertidos/estornados, não apagados.
7. Transferência tem despacho e recebimento separados.
8. Custo médio ponderado móvel é o default gerencial.
9. Financeiro separa documento, parcela e pagamento.
10. Caixa usa CashSession.
11. Domínio independe de framework/banco.
12. Persistência usa repositories/adapters.
13. Operações críticas devem ser idempotentes, transacionais e auditáveis.
14. Supabase continua adiado até o domínio/fluxos justificarem a integração.

## Próxima ação

Após integrar o PR #14 e encerrar a Issue #13, iniciar a Issue #15 em branch própria a partir da `main`: estoque transacional com entrada, retirada e transferência em duas etapas.

Consulte `docs/ai/NEXT_ACTION.md`.