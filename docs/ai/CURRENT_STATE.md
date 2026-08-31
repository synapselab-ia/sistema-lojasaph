# Current State — Sistema Lojasaph

Última atualização: 2026-08-31

## Estado atual

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — permanece ativa.**

O núcleo operacional está consolidado, mas o sistema **ainda não deve ser considerado 100% concluído**. A auditoria de gaps em `docs/product/final-product-gap-audit.md` continua como inventário da fila final; este arquivo registra quais itens dessa fila já foram executados.

Baseline antes da slice atual:

- `main=fad41dbe672d41e1fd6277e57f1f894d647a8ef2` — merge do PR #170;
- CI pós-merge #583 / run `33425164783`: **success**;
- Issue #142 aberta e ativa;
- #75/#121 abertas e **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro deve ser feito para evidência.

## Slices da Fase 51 já integradas/concluídas

1. remoção da entrada técnica — PR #145;
2. arquitetura da informação + navegação desktop/mobile — PR #147;
3. design system mínimo + padrões reutilizáveis — PR #149;
4. Administração: Estrutura + Usuários/Permissões — PR #151;
5. Cadastros: Produtos, Fornecedores e Funcionários — PR #153;
6. Estoque consolidado — PR #155;
7. Compras consolidado — PR #157;
8. Financeiro consolidado — PR #159;
9. Caixa consolidado — PR #161;
10. Dashboard / Visão geral — PR #163;
11. limpeza de linguagem/resíduos de engenharia — PR #165;
12. primeira rodada pública de homologação UX e correções — PR #167;
13. reconciliação documental da homologação — PR #168;
14. auditoria final de gaps e fila de fechamento — PR #169;
15. neutralização do runtime legado `/cadastros/*` — PR #170;
16. fechamento das telas auxiliares de autenticação/contexto — PR #171.

Não refazer essas slices sem bug/gap concreto.

## Telas auxiliares de autenticação/contexto — fechadas no PR #171

Foram reconciliadas, sem alterar os contratos de autenticação, sessão, autorização ou RLS:

- `/auth/atualizar-senha`;
- `/auth/invite`;
- `/bootstrap`;
- `/workspace/selecionar-organizacao`.

Mudanças de produto:

- `Panel`, `FeedbackMessage`, `FormField`, `Input`, `PageHeader` e estilos de `Button` reutilizados quando aplicável;
- erros relevantes usam anúncio acessível (`role="alert"`);
- estados informativos/carregamento usam semântica anunciável quando aplicável;
- novo `SubmitButton` compartilhado usa `useFormStatus` para bloquear ação duplicada e comunicar estado pendente;
- links e CTAs seguem touch target mínimo do design system;
- redirects 0/1/múltiplas organizações, parser/handoff de convite, bootstrap actions e `updatePasswordAction` foram preservados.

Teste de contrato: `src/app/auxiliary-auth-context-contract.test.ts`.

Validação do primeiro head do PR #171 (`25109c0054933fe714d299d67b4067305a0372ea`):

- CI #584 / run `33426151982`: **success**;
- lint: success;
- typecheck: success;
- unit tests: success;
- production build: success;
- database/migrations/RLS/auth Organization isolation: success;
- workflows adicionais de integração de inventário/negócio: success na mesma baseline.

Nenhum schema, migration, RPC, grant, RLS, papel, escopo ou regra de negócio foi alterado.

### Limite de evidência

Não foi fabricada sessão, convite, usuário ou dado em Production para homologar fluxos dependentes de token/contexto real. A validação real de convite, definição de senha, bootstrap aplicável e troca de organização deve ocorrer na homologação UX completa quando houver sessão/token legítimos e browser operável.

## Próxima slice obrigatória — homologação UX completa

Executar `docs/qa/fase51-ux-homologation.md` em **desktop, tablet e mobile**, com browser real e ambiente/sessão seguros.

Jornadas mínimas:

- Entrada/contexto: login, recuperação, nova senha, convite, bootstrap quando aplicável, seleção/troca de organização, logout e acesso negado;
- Visão geral;
- Administração;
- Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa.

Para cada jornada, validar navegação, foco/teclado, drawer mobile, touch targets, overflow, tabelas/formulários densos, loading/empty/error/success e linguagem operacional.

CI/build/CSS/HTML são evidências auxiliares e **não substituem browser real**.

Production não recebe fixtures, usuários artificiais ou ações destrutivas apenas para gerar prova.

## Depois da homologação UX

Executar reconciliação funcional final usando o gate:

> Uma pessoa autorizada consegue executar corretamente a necessidade operacional pela aplicação sem conhecimento de implementação, IDs técnicos ou procedimento externo não documentado?

Revisar MUST e SHOULD relevantes à implantação real.

## PENDINGs e negócio

Continuam sem inferência:

- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita/BOM;
- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio;
- `REQ-EXP-004` — FEFO;
- `REQ-FIN-004` — pagamento parcial/múltiplo;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas/POS.

Q-022 permanece aberta e deve ser resolvida antes de configurar definitivamente quem pode fazer cada ação no go-live.

## Dados, migração e cutover

Antes de Production real:

1. homologar com dados representativos em ambiente seguro;
2. preparar estrutura, usuários/perfis e configurações reais;
3. congelar fontes finais;
4. executar preview/dry-run e tratar inconsistências;
5. executar importação final idempotente/rastreável;
6. reconciliar saldos/totais/amostras;
7. aprovar cutover e encerrar/transicionar as planilhas.

## #75/#121 — production-readiness final

Permanecem **TOTALMENTE ON HOLD** até o fechamento funcional/negócio/cutover, salvo decisão explícita do operador.

Somente no fim retomar backup PostgreSQL real, Storage/binários, destino off-site, integridade/retenção, restore/drill, observabilidade/gates e `REQ-PLAT-005`.

## Ordem oficial de fechamento

1. ~~entrada técnica~~ — PR #145;
2. ~~arquitetura da informação/navegação~~ — PR #147;
3. ~~design system mínimo~~ — PR #149;
4. ~~Administração~~ — PR #151;
5. ~~Cadastros oficiais~~ — PR #153;
6. ~~Estoque~~ — PR #155;
7. ~~Compras~~ — PR #157;
8. ~~Financeiro~~ — PR #159;
9. ~~Caixa~~ — PR #161;
10. ~~Dashboard~~ — PR #163;
11. ~~limpeza de linguagem/resíduos de engenharia~~ — PR #165;
12. ~~primeiros achados públicos de UX~~ — PR #167;
13. ~~runtime legado `/cadastros/*`~~ — PR #170;
14. ~~telas auxiliares de autenticação/contexto~~ — PR #171;
15. **concluir homologação UX desktop/tablet/mobile**;
16. **reconciliação funcional final**;
17. **PENDINGs necessários + Q-022**;
18. **dados representativos e homologação operacional**;
19. **migração/cutover**;
20. **`REQ-PLAT-005` / #75/#121 e production-readiness final**.
