# Handoff — Sistema Lojasaph

## Estado de transição

**Fase 51 / Issue #142 — consolidação de produto, arquitetura de informação e UX — é a frente ativa.**

Estado integrado confirmado:

- `main=c015024fb2a05e9cdc8162029a13b4018cb8de91` após o merge do roadmap;
- PR #143 `docs: establish product completion and UX consolidation roadmap`: merged;
- CI pós-merge #506 / run `33181212548`: success;
- Issue #142 continua aberta e ativa;
- #75 e #121 continuam abertas e TOTALMENTE ON HOLD na trilha `REQ-PLAT-005`;
- nenhuma implementação da primeira slice foi iniciada ainda.

Não refazer #138/#139, não refazer a auditoria e não reabrir discussão sobre a ordem aprovada sem nova evidência ou prioridade explícita.

## Por que a Fase 51 existe

A auditoria de fechamento detectou que a régua anterior estava excessivamente técnica. O núcleo possui forte cobertura de domínio, banco, RLS, testes e CI, mas a experiência de produto ainda cresceu página por página e não passou por consolidação de arquitetura da informação, jornadas e administrabilidade.

O documento de autoridade é:

- `docs/product/product-completion-ux-roadmap.md`.

A `docs/qa/definition-of-done.md` foi ampliada para que UI não seja considerada pronta apenas por renderizar/passar build.

## Diagnóstico que não deve ser perdido

### 1. A landing atual de `/` é inútil como produto

Ela expõe "workspace persistente", demonstração, Supabase/PostgreSQL, RLS, CI e conteúdo de roadmap obsoleto. Deve desaparecer completamente da experiência normal.

A raiz deve apenas encaminhar:

- não autenticado → login;
- autenticado → fluxo operacional já existente (workspace/seleção/bootstrap conforme contexto).

Não redesenhar essa landing: **removê-la**.

### 2. A navegação precisa ser reorganizada antes de redesenhar telas

O menu plano atual mistura módulos e operações. Baseline alvo:

- Visão geral;
- Estoque;
- Compras;
- Financeiro;
- Caixa;
- Cadastros;
- Administração.

Estoque deve agrupar posição, entradas, baixas, devoluções, transferências, inventários, lotes/validades e mínimo/alertas.

### 3. O padrão de tela precisa mudar

Preferir para entidades complexas:

`lista → detalhe → ação`

com URLs estáveis e contexto próprio. Evitar megapáginas que misturam formulário de criação, listagem, execução e histórico.

Compras e Financeiro são exemplos prioritários para essa consolidação e ainda usam interações técnicas como `window.prompt()`.

### 4. Administração tem gaps reais

- Estrutura: backend/modelo existe, mas falta manutenção adequada de unidades/setores/locais no workspace persistente;
- Usuários/Permissões: RLS/roles/scopes existem, mas falta experiência administrativa de produto;
- Funcionários não pode depender de `UUID do auth.users` exposto ao operador.

Q-022 continua autoridade para pessoas/perfis reais; não inventar política de acesso.

### 5. Não começar pelo Dashboard

O Dashboard deve ser revisado **depois** de Estoque/Compras/Financeiro/Caixa e dos destinos principais estarem consolidados, para que seus atalhos e indicadores apontem para jornadas estáveis.

## Ordem oficial

1. remover entrada técnica;
2. arquitetura da informação;
3. navegação desktop/mobile;
4. design system mínimo;
5. Administração;
6. Cadastros;
7. Estoque;
8. Compras;
9. Financeiro;
10. Caixa;
11. Dashboard;
12. limpeza de linguagem técnica;
13. homologação UX real;
14. reconciliação funcional final;
15. PENDINGs necessários;
16. dados representativos;
17. migração/cutover;
18. `REQ-PLAT-005` final.

Não adicionar feature grande aleatória no meio desse programa salvo bug crítico, segurança, urgência operacional ou nova decisão explícita.

## Primeira slice executável

A primeira slice da Issue #142 é propositalmente pequena:

1. criar branch de implementação a partir da `main` real;
2. inspecionar `/`, `/login`, `/bootstrap`, `/workspace`, `/workspace/selecionar-organizacao` e helpers de auth/redirect;
3. remover a landing técnica de `/`;
4. reutilizar o fluxo existente para decidir o destino por sessão/contexto;
5. remover o CTA `Abrir demonstração` da navegação normal;
6. não apagar rotas demo nesta slice se ainda forem úteis internamente;
7. adicionar/ajustar testes do contrato de entrada;
8. lint/typecheck/test/build verdes;
9. sem deploy Vercel rotineiro/manual.

Não aproveitar essa slice para redesenhar sidebar, fazer design system completo ou tocar em banco.

## Regra de UI daqui para frente

Uma Issue com UI só é concluída quando, quando aplicável:

- jornada está clara;
- linguagem é operacional;
- loading/empty/error/success existem;
- feedback/confirm dialogs são adequados;
- desktop/tablet/mobile foram realmente considerados/validados;
- IDs e termos técnicos desnecessários não aparecem;
- componentes/padrões existentes são reutilizados;
- permissões e regras autoritativas continuam corretas.

## PENDING continua PENDING

Não promover por inferência:

- `REQ-ITEM-004` / produto de venda;
- `REQ-ITEM-005` / ficha técnica;
- `REQ-STK-007` / empréstimo;
- `REQ-STK-010` / custeio;
- `REQ-EXP-004` / FEFO;
- `REQ-FIN-004` / pagamento parcial/múltiplo final;
- `REQ-CASH-007` / consumo de funcionários;
- `REQ-CASH-008` / integração com vendas.

## #75/#121 permanecem ON HOLD

Não retomar scheduling, Storage, R2/S3, restore drills ou evidência automática de proteção durante a Fase 51. O hold só termina no fechamento funcional/homologação ou por nova instrução explícita do operador.

## Próximo chat

Consultar GitHub real e `NEXT_ACTION`, criar uma branch de implementação a partir da `main` atual e iniciar diretamente a primeira slice da Issue #142. Não refazer a auditoria, não reabrir a landing como problema de design e não saltar para redesign da sidebar antes de concluir a remoção da entrada técnica.

Restrições permanentes: GitHub é fonte de verdade; RLS é boundary; nenhum secret em browser/Git/docs; Production não recebe fixture para prova; nenhum deploy Vercel rotineiro; repo não deve ser tornado private automaticamente.
