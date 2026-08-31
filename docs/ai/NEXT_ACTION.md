# Next Action — Sistema Lojasaph

## Estado

**Fase 51 / Issue #142 continua ativa.**

As slices de consolidação até o PR #171 estão integradas. A frente atual continua sendo a homologação UX real em desktop, tablet e mobile.

Baseline corrente:

- `main=64e1c0d242c3abfb7ee374ebc43850156d75089b` — merge do PR #171;
- CI pós-merge #586 / run `33426777989`: **success**;
- Issue #142 aberta;
- #75/#121 **TOTALMENTE ON HOLD**.

Deployment automático corrente:

- `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- `READY`, target `production`, source `git`;
- `githubCommitSha=64e1c0d242c3abfb7ee374ebc43850156d75089b`;
- alias canônico `sistema-lojasaph.vercel.app`.

A revalidação HTTP/HTML pública da versão corrente já foi executada e está registrada em `docs/qa/fase51-ux-homologation.md`. UX-51-001/002/003 estão confirmados como corrigidos no deployment atual nesse nível de evidência.

## NEXT_ACTION objetiva

### **Concluir a homologação UX real com browser gráfico e sessão legítima**

Usar `docs/qa/fase51-ux-homologation.md` como matriz e evidência oficial.

Esta continua sendo a próxima slice obrigatória. **Não promover para reconciliação funcional final apenas porque o deployment e o HTML público estão corretos.**

## 1. Reconciliar o estado real antes de testar

No começo da execução:

1. ler `AGENTS.md`, `docs/00-START-HERE.md`, `CURRENT_STATE.md`, `HANDOFF.md` e este arquivo;
2. ler `docs/product/product-completion-ux-roadmap.md`, `docs/product/final-product-gap-audit.md` e `docs/qa/fase51-ux-homologation.md`;
3. confirmar `main`, Issue #142, PRs, branches e CI reais;
4. confirmar somente o deployment **automático** correspondente ao `main` corrente quando útil;
5. não disparar deploy Vercel manual/rotineiro para fabricar evidência;
6. não refazer slices já integradas;
7. se o deployment não mudou, não repetir por inércia as mesmas verificações HTTP/HTML já registradas.

## 2. Gate de evidência agora pendente

A próxima evidência incremental exige:

- browser gráfico operável para viewport, foco, teclado, drawer, overflow e inspeção visual;
- sessão/credencial legítima e aprovada para jornadas autenticadas;
- token legítimo para convite/recuperação/nova senha quando necessário;
- ambiente seguro para operações mutáveis.

Se uma dessas pré-condições não existir:

- registrar o bloqueio objetivamente na matriz;
- executar apenas evidência nova e válida disponível;
- **não** contornar auth;
- **não** criar usuário, convite, fixture ou dado artificial em Production;
- **não** promover HTML/CSS/CI a prova de browser real;
- **não** gerar nova atividade documental apenas repetindo o mesmo bloqueio sem evidência nova.

## 3. Evidência pública já concluída na versão corrente

Não precisa ser refeita enquanto o deployment não mudar:

- `/` sem sessão → Login;
- `/workspace` sem sessão → Login com `next=/workspace` e alerta de sessão expirada;
- `/recuperar-senha` → UX-51-001/002 revalidados em HTTP/HTML;
- `/sem-acesso` → UX-51-003 revalidado em HTTP/HTML;
- `/auth/atualizar-senha` sem sessão válida → Login com alerta adequado;
- `/auth/invite` → estado inicial hospedado com semântica de loading/status;
- `/bootstrap` → estado real atual sem bootstrap artificial;
- `/workspace/selecionar-organizacao` sem sessão → Login preservando `next`.

## 4. Matriz de viewports a executar

Com browser gráfico real, usar e registrar dimensões representativas para:

- desktop;
- tablet;
- mobile.

Por jornada, verificar:

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

## 5. Jornadas mínimas autenticadas

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
2. classificar impacto: navegação, acessibilidade, responsividade, feedback, linguagem ou fluxo;
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
