# Handoff — Sistema Lojasaph

## Estado de transição

**Fase 51 / Issue #142 continua ativa.**

O sistema possui núcleo operacional consolidado, mas ainda há gaps obrigatórios antes de chamá-lo de `100%`. A fonte de verdade é `docs/product/final-product-gap-audit.md`.

Baseline anterior à slice atual:

- `main=6f0c0cfcd0e969335cd4d23ddefd1a2ef17dad11` — merge do PR #169;
- CI #580 / run `33424103707`: **success**;
- Issue #142 aberta;
- #75/#121 **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro deve ser feito para evidência.

## Não refazer

Já integrados: #145, #147, #149, #151, #153, #155, #157, #159, #161, #163, #165, #167, #168 e #169.

PR #170 fecha o P0 do runtime legado `/cadastros/*`. Não reabrir essas slices por preferência estética; corrigir somente gaps comprovados.

## P0 fechado — runtime legado `/cadastros/*`

A árvore antiga foi mantida apenas como camada de compatibilidade de URL, sem experiência demo própria.

Mapeamento:

- `/cadastros` → `/workspace`;
- `/cadastros/estrutura` → `/workspace/administracao/estrutura`;
- `/cadastros/produtos` → `/workspace/produtos`;
- `/cadastros/fornecedores` → `/workspace/fornecedores`;
- `/cadastros/estoque` → `/workspace/estoque`;
- `/cadastros/inventarios` → `/workspace/inventarios`;
- `/cadastros/validades` → `/workspace/estoque/lotes`.

O layout legado não usa mais `DemoWorkspaceProvider` nem `AdminShell`. Um teste de contrato trava os redirects e garante que a navegação canônica não referencie `/cadastros`.

Nenhum schema, migration, RPC, grant, RLS, perfil, regra de estoque/financeiro/caixa/compras ou PENDING foi alterado.

## NEXT_ACTION imediata

### Fechar telas auxiliares de autenticação/contexto

No próximo chat:

1. ler `AGENTS.md`, `00-START-HERE.md`, `CURRENT_STATE.md`, `HANDOFF.md`, `NEXT_ACTION.md` e `docs/product/final-product-gap-audit.md`;
2. confirmar `main`, Issue #142, PRs/branches/CI reais;
3. inspecionar `/auth/atualizar-senha`, `/auth/invite`, `/bootstrap` e `/workspace/selecionar-organizacao`;
4. comparar essas telas com os primitives/padrões compartilhados já consolidados;
5. corrigir somente gaps concretos de consistência, feedback acessível, loading/error/success, foco/teclado e touch targets;
6. preservar contratos de auth, sessão, autorização e RLS;
7. adicionar/ajustar testes de contrato quando aplicável;
8. manter CI verde;
9. reconciliar documentação e promover a homologação UX completa como próxima slice.

Não fazer deploy Vercel manual para provar a slice.

## Depois — homologação UX completa

Continuar a matriz de `docs/qa/fase51-ux-homologation.md` em desktop/tablet/mobile, usando browser real e sessão/ambiente seguro.

Jornadas mínimas:

- Entrada/contexto;
- Visão geral;
- Administração;
- Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa.

CI/CSS/HTML estático não substituem evidência de viewport, drawer, foco, teclado, overflow, touch e fluxos interativos.

Production não deve receber fixtures, usuários artificiais ou ações destrutivas para prova.

## Depois da homologação UX

Executar reconciliação funcional final com o gate:

> Uma pessoa autorizada consegue executar corretamente a necessidade operacional pela aplicação sem conhecimento de implementação, IDs técnicos ou procedimento externo não documentado?

Revisar MUST e SHOULD aplicáveis, não apenas existência de backend/telas.

## PENDINGs que continuam sem decisão por inferência

- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita/BOM;
- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio;
- `REQ-EXP-004` — FEFO;
- `REQ-FIN-004` — pagamento parcial/múltiplo;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas/POS.

Q-022 permanece aberta: mapear perfis reais antes do go-live, sem equiparar automaticamente papéis técnicos a cargos.

## Fechamento operacional depois dos PENDINGs

1. ambiente seguro com dados representativos;
2. homologação com operação real;
3. preparação de estrutura/usuários/perfis/configurações;
4. congelamento das fontes;
5. dry-run/importação rastreável;
6. tratamento de inconsistências;
7. importação final;
8. reconciliação de saldos/totais/amostras;
9. cutover;
10. encerramento/transição das planilhas.

## Production-readiness final

Somente depois retomar #75/#121 e fechar backup PostgreSQL, Storage/binários quando aplicável, destino off-site, integridade/retenção, restore/drill, observabilidade/gates e `REQ-PLAT-005`.

#75/#121 permanecem **TOTALMENTE ON HOLD** até essa etapa ou decisão explícita.

## Ordem final oficial

1. ~~runtime legado `/cadastros/*`~~ — PR #170;
2. **telas auxiliares de autenticação/contexto**;
3. **homologação UX desktop/tablet/mobile**;
4. **reconciliação funcional final**;
5. **PENDINGs necessários + Q-022**;
6. **dados representativos/homologação operacional**;
7. **migração/cutover**;
8. **#75/#121 / production-readiness**.

## Guardrails permanentes

GitHub é fonte de verdade; RLS/backend são boundaries; nenhum secret no Git/docs/browser; Production não recebe fixture para prova; nenhum deploy Vercel manual/rotineiro; PENDINGs não são resolvidos por inferência; #75/#121 continuam on hold até o final.
