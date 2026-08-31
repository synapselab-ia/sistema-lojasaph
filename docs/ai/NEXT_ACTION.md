# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 continua ativa.**

A slice de telas auxiliares de autenticação/contexto foi fechada no PR #171. Os fluxos preservam seus contratos de auth/sessão/autorização/RLS e agora usam os padrões compartilhados de feedback, controles, touch targets e submit pendente.

Baseline anterior ao PR #171:

- `main=fad41dbe672d41e1fd6277e57f1f894d647a8ef2` — merge do PR #170;
- CI pós-merge #583 / run `33425164783`: **success**;
- Issue #142 aberta;
- #75/#121 **TOTALMENTE ON HOLD**.

Validação do primeiro head do PR #171:

- `25109c0054933fe714d299d67b4067305a0372ea`;
- CI #584 / run `33426151982`: **success**;
- lint, typecheck, unit tests, production build e banco/RLS: success.

## NEXT_ACTION objetiva

### **Concluir homologação UX real em desktop, tablet e mobile**

Usar `docs/qa/fase51-ux-homologation.md` como matriz e evidência oficial.

Esta é a próxima slice executável.

## 1. Reconciliar o estado real antes de testar

No começo da execução:

1. ler `AGENTS.md`, `docs/00-START-HERE.md`, `CURRENT_STATE.md`, `HANDOFF.md` e este arquivo;
2. ler `docs/product/product-completion-ux-roadmap.md`, `docs/product/final-product-gap-audit.md` e `docs/qa/fase51-ux-homologation.md`;
3. confirmar `main`, Issue #142, PRs, branches e CI reais;
4. consultar somente o deployment **automático** correspondente ao `main` corrente quando útil;
5. não disparar deploy Vercel manual/rotineiro para fabricar evidência;
6. não refazer slices já integradas.

## 2. Pré-condições de evidência

Antes de declarar uma jornada aprovada, exigir evidência apropriada:

- browser gráfico operável para viewport/foco/teclado/drawer/overflow;
- sessão/credencial legítima e aprovada para jornadas autenticadas;
- token legítimo para convite/recuperação/nova senha quando necessário;
- ambiente seguro para operações mutáveis.

Se uma pré-condição não existir:

- registrar o bloqueio objetivamente na matriz;
- executar apenas a evidência válida disponível;
- **não** contornar auth;
- **não** criar usuário, convite, fixture ou dado artificial em Production;
- **não** promover HTML/CSS/CI a prova de browser real.

## 3. Revalidar achados públicos anteriores

A matriz atual registra UX-51-001/002/003 como corrigidos tecnicamente, mas com revalidação hospedada pendente.

Quando a versão corrente estiver disponível automaticamente:

- `/recuperar-senha`: target de toque e feedback acessível;
- `/sem-acesso`: links/ações e feedback acessível;
- confirmar que `/` e `/workspace` sem sessão continuam encaminhando corretamente.

Registrar commit/deployment observado e resultado real. Não disparar deploy manual.

## 4. Matriz de viewports

Executar as jornadas representativas em:

- desktop;
- tablet;
- mobile.

Registrar dimensões usadas e, por jornada, verificar:

- navegação e hierarquia;
- foco visível e ordem por teclado;
- drawer/menu mobile;
- touch targets;
- overflow horizontal/vertical;
- legibilidade de tabelas e formulários densos;
- loading, empty, error e success;
- feedback após ações;
- linguagem de negócio sem resíduos de engenharia;
- retorno coerente no padrão `lista → detalhe → ação → retorno` quando aplicável.

## 5. Jornadas mínimas

### Entrada/contexto

- login;
- recuperação de senha;
- definição de nova senha;
- convite;
- bootstrap quando aplicável;
- 0/1/múltiplas organizações e troca de contexto;
- logout;
- sessão expirada/acesso negado.

### Visão geral

- filtros;
- cards/alertas;
- links para jornadas;
- estados vazios/erro/loading.

### Administração

- Estrutura;
- Usuários/Permissões;
- Proteção dos dados somente dentro do estado real permitido enquanto #75/#121 estão on hold.

### Cadastros

- Produtos;
- Fornecedores;
- Funcionários.

### Estoque

- posição/filtros;
- entradas;
- retiradas/baixas/perdas;
- devoluções;
- transferências;
- inventários;
- lotes/validades;
- estoque mínimo.

### Compras

- lista;
- novo pedido;
- detalhe;
- emissão/cancelamento quando seguro;
- recebimento parcial/total;
- histórico.

### Financeiro

- lista;
- novo documento;
- detalhe;
- vencimentos;
- pagamento;
- estorno/cancelamento quando seguro;
- anexos;
- histórico.

### Caixa

- visão;
- lista de sessões;
- abertura;
- detalhe;
- movimentos;
- contagem/fechamento;
- cancelamento quando seguro;
- configuração conforme permissão.

## 6. Regra para achados

Para cada problema real:

1. registrar rota, viewport, estado e passos;
2. classificar impacto (navegação, acessibilidade, responsividade, feedback, linguagem ou fluxo);
3. aplicar a menor correção consistente com os padrões existentes;
4. não alterar regra de negócio/auth/RLS para resolver estética;
5. adicionar teste de contrato/regressão quando útil;
6. manter CI verde;
7. revalidar a jornada corrigida no mesmo tipo de evidência que revelou o problema.

Não criar redesign amplo sem achado concreto.

## 7. Critério de aceite desta slice

A homologação só termina quando:

- a matriz `docs/qa/fase51-ux-homologation.md` contém evidência representativa de desktop/tablet/mobile para as áreas críticas;
- jornadas autenticadas necessárias foram percorridas com sessão legítima, ou qualquer limitação externa restante foi explicitamente aceita pelo operador como bloqueio/adiação;
- UX-51-001/002/003 foram revalidados na versão corrente quando possível;
- achados concretos foram corrigidos e revalidados;
- não há gap P0/P1 de UX conhecido sem tratamento;
- CI permanece verde;
- documentação/handoff reflete o estado real.

## 8. Próxima slice após a homologação

Promover imediatamente:

### **Reconciliação funcional final requisito por requisito**

Gate:

> Uma pessoa autorizada consegue executar corretamente a necessidade operacional pela aplicação sem conhecimento de implementação, IDs técnicos ou procedimento externo não documentado?

Classificar MUST e SHOULD aplicáveis como utilizável/homologado, gap de produto, dependente de PENDING, migração/cutover ou formalmente adiado.

## 9. Guardrails permanentes

Não resolver por inferência:

- `REQ-ITEM-004`;
- `REQ-ITEM-005`;
- `REQ-STK-007`;
- `REQ-STK-010`;
- `REQ-EXP-004`;
- `REQ-FIN-004`;
- `REQ-CASH-007`;
- `REQ-CASH-008`;
- Q-022.

#75/#121 permanecem **TOTALMENTE ON HOLD**. Não investigar scheduling, Storage/R2/S3, restore drills, secrets/variables ou Production fixtures nesta slice.

## Ordem final

1. ~~runtime legado `/cadastros/*`~~ — PR #170;
2. ~~telas auxiliares de autenticação/contexto~~ — PR #171;
3. **homologação UX desktop/tablet/mobile — NEXT_ACTION atual**;
4. **reconciliação funcional final**;
5. **PENDINGs necessários + Q-022**;
6. **dados representativos/homologação operacional**;
7. **migração/cutover**;
8. **#75/#121 / production-readiness**.
