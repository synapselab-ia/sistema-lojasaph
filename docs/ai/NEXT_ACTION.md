# Next Action — Sistema Lojasaph

## Estado

Fase 51 / #142 e Fase 52 / #180 concluídas. A frente guarda-chuva continua sendo **Fase 53 / #181 — conclusão de negócio**.

As duas bases de Estoque que condicionavam a sequência estão concluídas:

- #187 — custeio por lote/camada física;
- #183 — empréstimos com restituição física e/ou financeira.

A #183 foi mergeada pelo PR #194 e promovida a Production pelas migrations `20260911102000_stock_loans` e `20260911102500_stock_loan_allocation_order`. CI, workflow dedicado, rollout version-preserving, verificação read-only e advisors foram executados com sucesso. Production `fhbvwyttikrbeaanatlr` está alinhada até `20260911102500`.

## Frentes bloqueadas neste momento

### #185 — PDV Legal — ON HOLD

A Issue exige **amostra real anonimizada ou estrutura oficial de colunas** dos arquivos escolhidos. Essa evidência ainda não existe no repositório.

Gatilho: receber amostra/estrutura oficial ou documentação/contrato oficial suficiente para definir o formato. Não fabricar fixture, não fazer scraping e não usar dado Production como substituto.

### #188 — catálogo comercial, preços e margem — ON HOLD por #185

A modelagem precisa considerar a estrutura real de produto/venda/preço/identificadores que chegará do PDV Legal. #187 está resolvida, mas #185 ainda não.

### #189 — fichas técnicas/receitas — ON HOLD por #185/#188

Tem dependências explícitas dessas frentes. Não antecipar implementação.

### #184 — consumo de funcionários — ON HOLD por definição de origem

A semântica de negócio está decidida, mas ainda faltam origem do lançamento, granularidade e regra de estorno. A fonte real de venda/consumo está vinculada ao estudo #185. Não inventar comportamento.

## NEXT_ACTION objetiva

### **Executar Issue #190 — compositor modular do sistema para owner**

A #190 é a próxima frente independente e viável. A direção arquitetural já está aceita em `ADR-010-modular-product-composition.md`.

## Contrato arquitetural já decidido

### Registry e configuração

- criar `Module/Capability Registry` estático e versionado no código;
- cada capability pode declarar id estável, nome/descrição, categoria, core/configurável, dependências, dependentes, rotas/nav, cards derivados, gates e permissões;
- persistir por Organization **somente a configuração** habilitada/desabilitada/opções aprovadas;
- não copiar a definição estrutural inteira para o banco.

### Desabilitar não é apagar

- impedir novas operações quando aplicável;
- remover/ocultar superfícies de forma coerente;
- preservar tabelas, migrations, ledger, audit e histórico;
- reativação deve recuperar acesso ao histórico intacto;
- nenhum toggle executa `DROP TABLE` ou limpeza destrutiva.

### Backend também é boundary

Esconder menu não basta. Rotas, server actions, gateways/RPCs e outros boundaries autoritativos precisam respeitar module gating quando a capacidade for configurável. RLS/autorização continuam sendo boundary de dados e não são substituídas pelo compositor.

### Core não removível

Não permitir desligar:

- Organization/contexto;
- autenticação;
- autorização/RLS;
- auditoria;
- integridade transacional/idempotência;
- configuração necessária ao compositor.

### Dependências explícitas

O registry deve impedir combinações inválidas e explicar impacto em linguagem de produto. Exemplos já aprovados:

- Empréstimos → Estoque;
- FEFO/Validades → Estoque + camadas/lotes;
- Fichas técnicas → Catálogo + itens/insumos;
- Consumo de funcionários → Funcionários + fonte de venda/consumo;
- relatórios de venda → fonte de venda/importação.

### Autorização e audit

- primeiro rollout somente para `owner` Organization-wide;
- não hardcodar pessoa, e-mail ou UUID;
- toda mudança de composição deve registrar Organization, ator, timestamp, antes/depois e contexto quando necessário.

### UX

A área deve parecer configuração de produto, não painel de feature flags:

- `Administração → Módulos` ou equivalente;
- cards com nome, descrição e estados `Ativo`, `Desativado`, `Obrigatório`, `Requer ...`;
- dependências e impacto explicados antes da alteração;
- preview da navegação resultante quando útil;
- confirmação para mudança relevante;
- teclado/mobile funcionais;
- nenhum UUID, flag interna ou nome de tabela exposto.

## Procedimento da #190

1. Ler, nesta ordem:
   - `AGENTS.md`;
   - `docs/00-START-HERE.md`;
   - `docs/ai/CURRENT_STATE.md`;
   - `docs/ai/HANDOFF.md`;
   - este `NEXT_ACTION.md`;
   - `docs/ai/WORKFLOW.md`;
   - Issue #190 e comentário vigente;
   - `docs/decisions/ADR-010-modular-product-composition.md`;
   - requisitos/regras referenciados pelo ADR;
2. Consultar GitHub real para `main`, Issues, PRs, branches e CI;
3. Confirmar que não existe outra branch/PR já executando #190;
4. Auditar `src/modules/*`, `src/lib/navigation/workspace-navigation.ts`, rotas, server actions, gateways/RPCs, permissions/capabilities e dashboards atuais;
5. Produzir mapa explícito de módulos/capabilities, dependências e core não removível antes de implementar toggles;
6. Selecionar **1–2 capabilities de baixo risco** para prova incremental;
7. Definir registry/resolver estático e, se necessário, migration versionada para configuração por Organization;
8. Implementar gating de navegação e backend sem enfraquecer RLS/autorização;
9. Garantir preservação de histórico ao desabilitar e reativar;
10. Implementar audit trail da composição;
11. Implementar UX orientada ao owner, com dependências/impactos compreensíveis;
12. Cobrir combinações válidas/inválidas, autorização, isolamento por Organization, desativação/reativação e backend gating;
13. Validar aplicação + PostgreSQL + CI;
14. CI verde → PR → review → merge → CI pós-merge;
15. Se houver migration mergeada, seguir rollout Production version-preserving de `docs/qa/database-migrations.md`;
16. Atualizar `CURRENT_STATE`, `HANDOFF` e `NEXT_ACTION`.

## Aceite da primeira entrega incremental

- registry/capability graph explícito e testável;
- core locked corretamente;
- configuração por Organization sem duplicar definição estrutural;
- 1–2 capabilities opcionais provando enabled/disabled;
- dependência inválida bloqueada com mensagem compreensível;
- navegação sem links mortos;
- backend impede nova operação quando capability estiver desabilitada;
- histórico permanece íntegro e volta a ser acessível após reativação;
- owner-only para mudança de composição;
- audit trail;
- UX coerente com Fase 51;
- PostgreSQL + aplicação + CI verdes.

## Depois da primeira entrega de #190

Expandir capabilities apenas depois de provar registry/gating. As frentes #185/#188/#189/#184 permanecem condicionadas aos gatilhos acima e devem ser retomadas assim que a evidência/dependência real existir. Q-022 continua obrigatório antes de preparar pessoas reais para go-live.

## Guardrails

- GitHub é fonte de verdade;
- Supabase/schema/RLS/grants são hard boundaries;
- nenhum secret em Git/docs/chat/log;
- nenhuma fixture/dado Production para fabricar evidência;
- module gating não substitui autorização;
- desabilitar módulo nunca apaga histórico;
- não criar dezenas de toggles antes da prova incremental;
- não repetir migration reconciliation sem drift;
- não disparar deploy Vercel manual rotineiro;
- #75/#121 continuam TOTALMENTE ON HOLD.
