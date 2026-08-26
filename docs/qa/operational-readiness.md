# Prontidão operacional — homologação e cutover

Data: 2026-08-26  
Fase: 46  
Escopo: readiness operacional, sem importação real, sem criação de usuários reais, sem secrets e sem nova feature funcional.

## Conclusão executiva

O núcleo funcional do MVP permanece reconciliado após as Fases 41–45. A Fase 46 não encontrou nova lacuna funcional não-PENDING que justifique abrir Issue por inércia.

O sistema possui fundações técnicas suficientes para avançar para homologação controlada, mas **não está liberado para migração/cutover real**. Os bloqueios restantes são predominantemente de três tipos:

1. decisões de negócio que afetam transformações ou configurações específicas;
2. pré-condições externas — fontes finais, pessoas/e-mails, credenciais, computador confiável e aceite de corte;
3. engenharia de migração que só pode ser especificada com segurança depois que a fonte e as regras daquele recorte estiverem congeladas.

Não foi aberta nova Issue nesta fase porque nenhum desses bloqueios externos deve ser convertido artificialmente em feature.

## Snapshot real em 2026-08-26

### GitHub

- `main`: `62c3af63939c808487434e6e539ef0870a60d530`;
- PR #102 / Fase 45: merged;
- Issue #101: closed/completed;
- PR #103 / handoff da Fase 45: merged;
- PRs abertos na entrada da Fase 46: nenhum;
- única Issue aberta: #75 — backup automático real de Production;
- branches `agent/*` existentes são históricos; a frente atual foi criada a partir do HEAD real da `main`;
- CI da `main` #396: success em `62c3af63...`;
- o schedule de `Production Database Backup` permanece desarmado: run #5 de 2026-08-26 concluiu como `skipped`, coerente com `BACKUP_AUTOMATION_ENABLED` ainda não ativado.

### Supabase Production

Projeto `fhbvwyttikrbeaanatlr`:

- status `ACTIVE_HEALTHY`;
- região `sa-east-1`;
- PostgreSQL 17 (`17.6.1.141`);
- zero development branches;
- migration history termina em `20260822195823 / finance_attachments`;
- nenhuma migration/DDL/DML foi aplicada na Fase 46.

### Vercel Production

Projeto `sistema-lojasaph`:

- latest deployment observado: `dpl_RRAzMvYKVLKAjbrNV6hAGqg42wfg`;
- target `production`;
- estado `READY`;
- commit hospedado: `62c3af63939c808487434e6e539ef0870a60d530`, igual à `main` na entrada da fase;
- alias canônico inclui `sistema-lojasaph.vercel.app`;
- `GET /health` em 2026-08-26 respondeu HTTP 200 com:
  - `environment=production`;
  - `supabaseAccess=allowed`;
  - `supabaseReason=production_backend`;
  - `adminAccess=blocked`.

Nenhum deployment foi criado pela Fase 46. A listagem da Vercel também não expõe, pela ferramenta disponível, os valores/targets das environment variables; portanto eles continuam não auditados materialmente. O runtime fail-closed permanece o controle compensatório.

---

# Classificação A/B/C/D

## A — pronto/comprovado

| Área | Estado comprovado | Evidência | Observação para homologação/cutover |
| --- | --- | --- | --- |
| Núcleo funcional do MVP | Reconciliado | Fases 41–45 + `CURRENT_STATE` | Não abrir nova feature sem regressão ou prioridade explícita. |
| Schema/migrations | Versionado e alinhado | `supabase/migrations/` + migration history hospedado | Última migration `20260822195823_finance_attachments`. |
| RLS/autorização por papel e escopo | Implementada e testada | `docs/architecture/authorization.md`, suites SQL | Roles/escopos técnicos existem; pessoas reais ainda não foram mapeadas. |
| Validação autoritativa | Atendida | `docs/qa/data-validation.md` | Regras críticas não dependem apenas da UI. |
| Import staging | Implementado | `docs/modules/imports.md` | `import_batches`/`import_rows`, lineage e RLS disponíveis. |
| Idempotência de staging | Implementada | `docs/qa/import-foundation-audit.md` | Não equivale a idempotência da futura escrita operacional. |
| Preview/dry run | Implementado | `finalize_import_preview` + QA de importação | `ready` significa preview validado, não autorização para aplicar dados. |
| Relatório de inconsistências | Implementado | estados `accepted/duplicate/warning/rejected/pending_mapping` | Mapeamentos ambíguos permanecem para revisão humana. |
| Aliases migratórios | Implementados | `item_aliases` + resolver exato/alias | Sem fuzzy auto-merge. |
| Isolamento de ambientes | Guardrails implementados | `docs/operations/environments.md`, `docs/qa/environment-isolation.md` | Preview sem backend próprio continua bloqueado, que é o comportamento seguro. |
| Production web atual | Alinhada à `main` de entrada | Vercel deployment `dpl_RRAz...` + `/health` | Não é necessário criar outro deploy para a auditoria. |
| Bootstrap do primeiro owner | Mecanismo técnico pronto | `docs/operations/bootstrap-owner.md` | Execução real depende das pré-condições C abaixo. |
| Backup/restore — mecânica | Código e runbooks prontos | workflows/scripts + `docs/operations/backup-restore.md` | Ativação real permanece C / Issue #75. |
| CI | Verde | CI #396 | Database, lint, typecheck, testes e build passaram no HEAD de entrada. |

## B — decisão de negócio/PENDING

Uma pergunta aberta só bloqueia o domínio/transformação que realmente depende dela. Não é necessário responder Q-001..Q-025 em bloco para iniciar homologação sintética ou preparar um recorte independente.

### Mapa Q-001..Q-025 por impacto

| Questão | Impacto real | O que bloqueia | O que não bloqueia |
| --- | --- | --- | --- |
| Q-001 | Estrutura organizacional | Mapeamento final de Tabatinga/Capricórnio/Barba Negra para Organization/Business/Unit e migração cross-unit | CI, dados sintéticos e módulos já modelados sem nomes hardcoded. |
| Q-002 | Estrutura/setores | Mapeamento final de Cozinha/Quiosque/Empório para Sector/Unit e locais reais | Modelo genérico de Unit/Sector/StockLocation. |
| Q-003 | Transferências históricas | Semântica/importação da coluna checkbox sem título | Importar outros campos inequívocos ou manter o valor bruto em staging. |
| Q-004 | Transferências/financeiro | Transformar `Valor total em haver` em conceito financeiro/gerencial | Ledger físico de transferências sem inventar componente financeiro. |
| Q-005 | Transferência x empréstimo | Classificar registros que representam empréstimo e decidir se nasce fluxo próprio | Transferências inequívocas; REQ-STK-007 continua PENDING. |
| Q-006 | Catálogo | Importador do `Gabarito` e eventual separação Product/SalesItem x StockItem | Cadastro canônico de StockItem vindo de fontes independentes. |
| Q-007 | Caixa/POS | Qualquer integração com vendas individuais/POS | MVP atual de caixa por totais; REQ-CASH-008 continua PENDING. |
| Q-008 | Custeio | Política final de valuation/custo e transformações que dependam de custo derivado | Reconciliação de quantidades e ledger sem inferir método de custeio. |
| Q-009 | Caixa | Semântica e impacto de `Consumo Funcionários` | Demais meios/totais do caixa; REQ-CASH-007 continua PENDING. |
| Q-010 | Caixa | Interpretação fiel do campo histórico `Encerramento de caixa` como esperado/contado | Modelo novo já distingue esperado, contado e divergência. |
| Q-011 | Caixa | Decidir se Voucher deve ser configurado/importado quando houver dado real | Outros meios de pagamento. |
| Q-012 | Caixa | Regra final de taxas se o sistema precisar recalcular/importar configuração histórica | Preservação de totais observados sem inventar regra de adquirente/bandeira. |
| Q-013 | Financeiro | Agrupar com segurança linhas da planilha em documentos/NFs sem identificador confiável | Staging da linha bruta e campos inequívocos de parcela. |
| Q-014 | Financeiro | Cardinalidade/regra final de pagamento parcial/múltiplo e transformação de casos desse tipo | Modelo financeiro básico e registros sem ambiguidade; REQ-FIN-004 segue PENDING. |
| Q-015 | Financeiro | Classificar diferença como juros/multa/desconto/ajuste | Preservar valor nominal e valor pago diferentes, já requisito MUST. |
| Q-016 | Financeiro | Classificação tipada de `Pix/Boleto` | Preservar referência/instrução bruta em campo separado. |
| Q-017 | Financeiro | Importar `Checar data` como semântica própria, se houver | Status pago/vencido/a vencer continua derivado; não importar fórmula como estado. |
| Q-018 | Lotes/validade | Momento futuro de captura automática no recebimento | Importar validade/lote existente quando fonte/local/item estiverem resolvidos. |
| Q-019 | Estoque/validade | FEFO automático/sugestão de lote | Cutover básico; REQ-EXP-004 permanece PENDING. |
| Q-020 | Alertas | Janela operacional de alerta de validade | Persistência de lotes/validades; refinamento pode vir depois. |
| Q-021 | Estoque | Configuração real de política de saldo negativo por local antes da operação real | Mecanismo técnico de policy/validação já existente. |
| Q-022 | Segurança/operação | Mapeamento das pessoas reais para roles e escopos; multiusuário real | Modelo role+scope, RLS e bootstrap técnico do primeiro owner. |
| Q-023 | Fornecedores | Regras adicionais por categoria/região se necessárias | Múltiplos contatos básicos já são suportados. |
| Q-024 | Compras | Qualquer alerta/automação baseada em agenda fixa | Armazenar agenda como informação textual, como hoje. |
| Q-025 | Compras | Enforcement/automação de pedido mínimo por produto/condição, se existir | Registrar o valor mínimo observado no fornecedor como condição comercial básica. |

### Decisões prioritárias por recorte

Não existe uma lista universal de perguntas obrigatórias. A prioridade deve seguir a primeira fonte/processo escolhido para migração:

- **estrutura/cadastros reais:** Q-001, Q-002 e Q-006 quando `Gabarito` entrar no recorte;
- **transferências históricas:** Q-003, Q-004 e Q-005 somente para linhas/campos afetados;
- **financeiro histórico:** Q-013 e, conforme os casos encontrados, Q-014/Q-015; Q-016 pode permanecer referência bruta;
- **caixa histórico:** Q-009/Q-010 e, quando houver dado aplicável, Q-011/Q-012; Q-007 não bloqueia o modelo agregado atual;
- **operação de estoque:** Q-008 e Q-021 antes de transformar custo/política real; Q-018..Q-020 são refinamentos específicos de validade/FEFO/alertas;
- **usuários reais:** Q-022 antes de provisionar pessoas além do primeiro owner controlado.

## C — pré-condição operacional/externa

| Pré-condição | Estado atual | Condição objetiva para desbloquear | Responsabilidade/contexto |
| --- | --- | --- | --- |
| Fontes finais congeladas | Não fornecidas para cutover | Cópias finais, timestamp de extração, SHA-256 e armazenamento seguro fora do Git | produto/cliente + operacional |
| Regras de transformação por fonte | Ainda preliminares | Especificação por fonte aprovada, referenciando apenas Qs realmente necessárias | produto/cliente + engenharia |
| Importador específico por fonte | Não implementado | Fonte congelada + transformação aprovada + targets definidos | engenharia, depois do gate anterior |
| Escrita definitiva/idempotente em tabelas operacionais | Não existe command genérico | Delimitar apply por domínio/fonte, idempotência e rollback/reconciliação após regra aprovada | engenharia, não antes do gate de fonte/regra |
| Dry run com fonte real | Não executado | Importador específico disponível + fonte congelada | operacional + engenharia |
| Validação de amostras/reconciliação | Não executada com dados reais | Relatório do dry run + critérios/totais de comparação + aceite do cliente | produto/cliente + operacional |
| Primeiro owner real | Não executar nesta fase | E-mail exato aprovado, Organization alvo confirmada, redirect HTTPS autorizado, entrega de e-mail verificada e envs temporárias server-only | credencial/ambiente confiável + operador |
| Pessoas/roles/escopos reais | Não mapeados | Resposta prática à Q-022 + lista aprovada de pessoas e escopos | produto/cliente + operacional |
| Onboarding multiusuário | Não deve ser inferido | Depois do mapeamento real, decidir/projetar o mecanismo administrativo necessário além do primeiro owner | produto/cliente + engenharia |
| Backup Production #75 | Automação implementada, desarmada | OAuth/rclone + Gmail App Password em computador confiável, secrets, `BACKUP_AUTOMATION_ENABLED=true`, primeiro run verde e archive/checksum off-site | credencial/ambiente confiável |
| Preview operacional com backend | Ausente por design | Backend não-prod isolado explicitamente aprovado e refs distintas de Production | operacional/infra; não é necessário para manter Preview fail-closed |
| Auditoria material das env vars Vercel por target | Não observável pela ferramenta atual | Ferramenta segura que liste nomes+targets sem expor valores | operacional/infra; guardrails fail-closed permanecem ativos |
| Data/hora de cutover | Não aprovada | Janela de corte aprovada + responsáveis disponíveis | produto/cliente + operacional |
| Uso paralelo das planilhas | Procedimento não definido | Bloqueio das planilhas no corte ou procedimento temporário explícito | operacional/cliente |
| Inventário inicial, se necessário | Condicional | Decisão baseada na qualidade/reconciliação do histórico de estoque | operacional/cliente |

### Gate obrigatório antes de escrita real

Nenhum importador/aplicador deve escrever dados reais em tabelas operacionais enquanto não existirem, para aquele recorte:

1. fonte final congelada e identificada por hash;
2. target canônico resolvido;
3. regras de transformação documentadas;
4. respostas somente às Qs materialmente necessárias;
5. dry run e relatório sem pendências não aceitas;
6. regra de idempotência da aplicação definitiva;
7. reconciliação definida;
8. aceite explícito para o recorte;
9. backup Production real comprovado antes do cutover que passa a depender dos dados migrados.

## D — fase futura/opcional

Não bloqueiam o MVP básico nem devem ser puxados pela Fase 46:

- integração POS/PDV, produto de venda e ficha técnica dependentes de Q-006/Q-007;
- empréstimo como fluxo distinto enquanto Q-005 não for confirmado;
- FEFO e alertas refinados de validade;
- estoque mínimo/reposição automática;
- barcode/fiscal refinado;
- cotação, comparação de fornecedores, sugestão automática de compra e BI avançado de preço;
- expansão automática de exportações;
- dashboards avançados não ligados a um gap operacional comprovado;
- Preview hospedado pago/branching apenas por conveniência;
- PWA/offline/app nativo sem nova prioridade explícita.

---

# Sequência segura recomendada

## 1. Manter a baseline integrada

- `main` e Production web atuais estão alinhadas no SHA `62c3af63...` na entrada da Fase 46;
- não criar deploy só para auditoria;
- não abrir feature nova enquanto nenhum requisito/desbloqueio novo existir.

## 2. Escolher o primeiro desbloqueio externo real

Três trilhas podem avançar independentemente, desde que suas próprias pré-condições sejam atendidas:

### Trilha A — backup Production

Quando o operador estiver em computador pessoal/confiável, concluir a Issue #75 exatamente pelo runbook existente. Essa trilha não exige nova feature nem alteração no Supabase/Vercel.

### Trilha B — homologação de dados/migração

Quando uma fonte final estiver congelada:

1. escolher somente essa fonte/vertical;
2. responder apenas às Qs que bloqueiam aquela transformação;
3. documentar transformação e reconciliação;
4. então abrir uma Issue de engenharia pequena para o importador/aplicador específico;
5. executar staging/dry run antes de qualquer escrita operacional;
6. não fazer cutover até #75 e demais gates de produção estarem atendidos.

Ordem preliminar do plano de migração continua começando por cadastros canônicos antes das transações.

### Trilha C — identidade/homologação operacional

Quando houver e-mail exato do owner e configuração de Auth/redirect/entrega aprovada:

1. seguir `docs/operations/bootstrap-owner.md`;
2. criar somente o primeiro owner controlado;
3. validar login/audit/RLS;
4. não provisionar demais pessoas até Q-022 e o mapeamento real de roles/escopos estarem aprovados.

## 3. Só marcar cutover quando os gates convergirem

Antes do corte real, confirmar em conjunto:

- backup Production real ativo e comprovado;
- acesso administrativo/owner controlado;
- pessoas necessárias mapeadas para a operação que entrará em uso;
- fonte(s) congelada(s), transformações e dry run aprovados;
- reconciliação concluída;
- Production web no commit aprovado;
- janela/data de corte aprovada;
- procedimento de uso paralelo/encerramento das planilhas definido.

## Próximo gatilho operacional

A Fase 46 conclui sem nova Issue funcional. O próximo chat deve verificar qual destes fatos passou a existir desde esta auditoria:

1. operador em computador confiável pronto para concluir #75;
2. fonte final congelada disponível para um recorte de migração;
3. e-mail/Organization/redirect de owner aprovados para bootstrap controlado;
4. nova prioridade explícita de produto ou regressão concreta.

Se nenhum fato novo existir, **não abrir feature para manter atividade**. Revalidar apenas o estado necessário e preservar a baseline.

## Não fazer

- não importar planilhas reais sem gates;
- não criar command genérico de apply por antecipação;
- não tratar `ready` de staging como autorização de escrita;
- não responder Q-001..Q-025 por inferência;
- não criar/invitar pessoas reais nesta auditoria;
- não pedir secrets em chat;
- não reutilizar outro projeto Supabase como Preview por inferência;
- não criar Supabase branch/projeto pago sem autorização;
- não restaurar Production para teste;
- não ativar/fechar #75 sem run real;
- não criar deploy Vercel desnecessário;
- não transformar SHOULD/COULD/PENDING em bloqueio artificial do MVP.