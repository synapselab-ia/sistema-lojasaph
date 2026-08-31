# Handoff — Sistema Lojasaph

## Estado de transição

**Fase 51 / Issue #142 continua ativa.**

As slices de consolidação até o PR #171 estão integradas. A frente atual é a homologação UX real em desktop/tablet/mobile.

Baseline corrente:

- `main=64e1c0d242c3abfb7ee374ebc43850156d75089b` — merge do PR #171;
- CI pós-merge #586 / run `33426777989`: **success**;
- Issue #142 aberta;
- nenhum PR aberto no início desta execução;
- #75/#121 **TOTALMENTE ON HOLD**;
- nenhum deploy Vercel manual/rotineiro deve ser feito para evidência.

## Não refazer

Já consolidados: #145, #147, #149, #151, #153, #155, #157, #159, #161, #163, #165, #167, #168, #169, #170 e #171.

Não reabrir por preferência estética; corrigir somente bug/gap comprovado.

## Deployment corrente confirmado

A integração Git da Vercel já publicou automaticamente a versão exata da `main`:

- deployment `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- `READY`;
- target `production`;
- source `git`;
- `githubCommitSha=64e1c0d242c3abfb7ee374ebc43850156d75089b`;
- alias canônico `sistema-lojasaph.vercel.app` sem erro.

Não houve deploy manual.

## Evidência pública reconciliada nesta execução

No deployment corrente, via resposta HTTP/HTML real:

- `/` sem sessão resolve para Login;
- `/workspace` sem sessão resolve para Login com `next=/workspace` e alerta de sessão expirada;
- UX-51-001 foi revalidado: `Voltar ao login` em `/recuperar-senha` possui `min-h-11`;
- UX-51-002 foi revalidado: erro em `/recuperar-senha` usa `role="alert"`;
- UX-51-003 foi revalidado: `/sem-acesso` usa ações com `min-h-11` e erro com `role="alert"`;
- `/auth/atualizar-senha` sem sessão válida retorna ao Login com alerta de link expirado;
- `/auth/invite` expõe no estado inicial hospedado `aria-busy`, `role="status"` e `aria-live`;
- `/bootstrap` reflete o estado real atual de configuração inicial desabilitada e mantém CTA coerente;
- `/workspace/selecionar-organizacao` sem sessão preserva `next=/workspace/selecionar-organizacao`.

A matriz oficial foi atualizada em `docs/qa/fase51-ux-homologation.md`.

## Evidência que continua ausente

A homologação **não está encerrada**.

Nesta sessão não existe browser gráfico operável exposto para controlar viewport, foco, teclado, drawer, overflow ou screenshots. A capacidade de browser automatizado foi investigada, mas o executável correspondente não está disponível no runtime e não existe outro conector de browser nesta sessão.

Também não há sessão/credencial legítima aprovada nem token legítimo para convite/recuperação.

Portanto permanecem bloqueados:

- certificação desktop/tablet/mobile;
- foco/teclado/drawer/overflow em browser;
- login autenticado real;
- seleção/troca de organização e logout autenticado;
- Visão geral;
- Administração;
- Cadastros;
- Estoque;
- Compras;
- Financeiro;
- Caixa;
- convite válido → sessão → nova senha;
- estados de bootstrap que não existam naturalmente no ambiente.

Não criar usuário, convite, fixture ou dado artificial em Production para produzir prova.

## NEXT_ACTION imediata

### Concluir homologação UX desktop/tablet/mobile quando houver evidência adequada

Usar `docs/qa/fase51-ux-homologation.md` como matriz executável.

No próximo chat:

1. reler governança e confirmar `main`, Issue #142, PRs/branches/CI;
2. confirmar que o deployment automático ainda corresponde à `main`; não disparar deploy manual;
3. **não repetir mecanicamente a revalidação HTTP/HTML já concluída** se o deployment não mudou;
4. verificar se existe browser gráfico operável;
5. verificar se existe sessão/credencial legítima aprovada e, quando necessário, token legítimo;
6. com browser, registrar dimensões e executar desktop/tablet/mobile por jornada;
7. com sessão legítima, cobrir Entrada/contexto, Visão geral, Administração, Cadastros, Estoque, Compras, Financeiro e Caixa;
8. validar foco/teclado, drawer, touch targets, overflow, loading/empty/error/success, tabelas/formulários densos e `lista → detalhe → ação → retorno`;
9. executar convite/nova senha/bootstrap/troca de organização somente em estados legítimos;
10. corrigir apenas achados concretos e revalidar no mesmo tipo de evidência;
11. promover reconciliação funcional final somente quando a matriz tiver evidência representativa suficiente ou quando bloqueios externos forem explicitamente aceitos pelo operador.

CI/CSS/HTML estático ou hospedado não substituem homologação de browser.

## Depois da homologação UX

Executar reconciliação funcional final com o gate:

> Uma pessoa autorizada consegue executar corretamente a necessidade operacional pela aplicação sem conhecimento de implementação, IDs técnicos ou procedimento externo não documentado?

Revisar MUST e SHOULD aplicáveis.

## PENDINGs sem decisão por inferência

- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita/BOM;
- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio;
- `REQ-EXP-004` — FEFO;
- `REQ-FIN-004` — pagamento parcial/múltiplo;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas/POS.

Q-022 permanece aberta: mapear perfis reais antes do go-live, sem equiparar automaticamente papéis técnicos a cargos.

## Fechamento operacional posterior

1. dados representativos em ambiente seguro;
2. homologação operacional;
3. estrutura/usuários/perfis/configurações reais;
4. congelamento de fontes;
5. dry-run/importação rastreável;
6. tratamento de inconsistências;
7. importação final;
8. reconciliação de saldos/totais/amostras;
9. cutover;
10. transição/encerramento das planilhas.

## Production-readiness final

Somente depois retomar #75/#121 e fechar backup PostgreSQL, Storage/binários, destino off-site, integridade/retenção, restore/drill, observabilidade/gates e `REQ-PLAT-005`.

#75/#121 permanecem **TOTALMENTE ON HOLD** até essa etapa ou decisão explícita.

## Ordem final oficial

1. ~~runtime legado `/cadastros/*`~~ — PR #170;
2. ~~telas auxiliares de autenticação/contexto~~ — PR #171;
3. **homologação UX desktop/tablet/mobile**;
4. **reconciliação funcional final**;
5. **PENDINGs necessários + Q-022**;
6. **dados representativos/homologação operacional**;
7. **migração/cutover**;
8. **#75/#121 / production-readiness**.

## Guardrails permanentes

GitHub é fonte de verdade; backend/RLS são boundaries; nenhum secret no Git/docs/browser; Production não recebe fixture para prova; nenhum deploy Vercel manual/rotineiro; PENDINGs não são resolvidos por inferência; #75/#121 continuam on hold até o final.
