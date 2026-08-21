# Current State — Sistema Lojasaph

Última atualização: 2026-08-21

## Estado atual

Fase 41 — reconciliação do MVP restante — **concluída com uma única próxima lacuna funcional comprovada**.

Evidência: `docs/qa/mvp-reconciliation.md`.

- Repositório: `synapselab-ia/sistema-lojasaph`
- `main` real na entrada da Fase 41: `cbcedfbcc65287d79b3f7b77feead60906981222` (PR #91)
- CI anterior de referência: #357 — success
- PRs abertos ao iniciar: nenhum
- Issue aberta ao iniciar: #75
- nova Issue funcional criada: #92 — `Fase 42 — anexos financeiros privados (REQ-FIN-008)`
- branch da Fase 41: `agent/finance-attachments`
- Supabase Production: `fhbvwyttikrbeaanatlr`, `ACTIVE_HEALTHY`, PostgreSQL 17
- Production usada somente para introspecção read-only nesta fase
- nenhum deployment Vercel
- nenhuma migration/DDL/DML de negócio na Fase 41

A referência anterior `765776a...` em continuidade era o merge do PR #90; a `main` real já havia avançado para `cbcedfb...` pelo PR #91. A Fase 41 corrige essa distinção sem abrir frente separada.

## Resultado da Fase 41

A matriz do MVP não encontrou novo MUST funcional do núcleo sem cobertura.

### Entregue no núcleo atual

- Organização, unidades, setores e locais de estoque;
- produtos/categorias/unidades de medida;
- fornecedores e contatos no núcleo atual;
- funcionários separados de usuários/Auth;
- Estoque: entrada, retirada, transferência, devolução, perdas, ledger, saldos e histórico;
- lotes, validades e alertas básicos;
- inventário físico e ajustes auditáveis;
- Compras e recebimentos;
- Financeiro: documentos, parcelas, pagamentos, estornos, referências e status derivados;
- Caixa completo no escopo atual;
- Auth, permissões por papel/escopo, RLS e auditoria;
- Dashboard operacional básico com filtros Unit/Setor/período;
- foundation de importação rastreável/idempotente/dry-run;
- requisitos transversais de responsividade, idempotência, validação, migrations, observabilidade e ambientes já auditados.

Não reabrir esses itens por mera ausência de documento recente.

### Fora da próxima vertical slice

Itens `PENDING`/dependentes de Q-001..Q-025 e fase posterior permanecem fora por decisão explícita, incluindo POS/produto de venda, ficha técnica, empréstimo distinto, FEFO/custeio final, estoque mínimo/sugestão de compra, compras avançadas, leitura de código de barras, PWA refinada e dashboards avançados.

O cutover de importação real também não é uma feature faltante genérica: depende de fonte congelada, mapeamentos aprovados, backup e reconciliação operacional.

### Gaps SHOULD comprovados

1. `REQ-FIN-008 — Anexos`: não entregue e implementável agora;
2. `REQ-EXPOR-001 — Exportação`: também sem implementação aparente, mas propositalmente genérico (`onde fizer sentido`) e sem uma superfície única pré-priorizada.

`REQ-FIN-008` foi escolhido porque o processo e o boundary já são explícitos: o MVP cita anexos/comprovantes, o requisito cita NF/PDF/XML/boleto/comprovante, o domínio já prevê `Attachment`, o modelo lógico já prevê metadata mínima e `docs/modules/finance.md` registra Storage/anexos como fora da Fase 11.

## Issue #92 — próxima vertical slice

Objetivo: anexos privados vinculados inicialmente a `payable_document`.

Contrato já delimitado:

- bucket privado;
- PDF/XML/imagens comuns de comprovante;
- metadata com Organization, documento, storage key, nome original, MIME, tamanho, SHA-256, ator e timestamps;
- upload apenas por papel financeiro autorizado no escopo do documento;
- listagem/download conforme visibilidade do próprio documento;
- browser sem secret/service key;
- sem URL pública permanente;
- sem overwrite/upsert;
- sem exclusão física na primeira versão;
- criação de metadata auditável;
- RLS/grants explícitos;
- compensação do objeto quando upload físico ocorrer e o registro de metadata falhar.

### Baseline Supabase/Storage

Introspecção read-only de Production confirmou na Fase 41:

- nenhum bucket em `storage.buckets`;
- nenhuma policy atual em `storage.objects`;
- nenhuma relação pública de attachments/files do Financeiro.

A documentação Supabase atual foi revisada: arquivos sensíveis devem ficar privados; operações de objeto devem usar Storage API; bucket pode impor MIME/tamanho; chave privilegiada fica somente em trusted server; tabelas públicas novas devem receber grants explícitos coerentes com RLS.

Nenhum bucket/policy/arquivo/schema foi criado remotamente nesta fase.

## Backup Production / Issue #75

A Fase 38 continua válida e não foi refeita.

Política aprovada:

- RPO 24h;
- backup diário;
- RTO objetivo até 4h;
- Google Drive privado;
- retenção 30 dias;
- owner/alerta `synapselab.ia@gmail.com`;
- restore drill mensal isolado;
- sem Pro/PITR por enquanto.

Já concluído:

- workflows de backup/drill mergeados;
- `PRODUCTION_SUPABASE_DB_URL` provisionado via Session pooler 5432.

Ainda pendente, deliberadamente até computador pessoal/confiável:

- OAuth Google Drive/rclone;
- `BACKUP_RCLONE_CONFIG_B64`;
- `BACKUP_ALERT_GMAIL_APP_PASSWORD`;
- `BACKUP_AUTOMATION_ENABLED=true`;
- primeiro backup Production real + archive/checksum off-site;
- fechamento da #75.

A #75 permanece aberta/desarmada e não bloqueia #92.

## Próxima ação

Fase 42 — implementar a Issue #92 / `REQ-FIN-008 — Anexos`.

Ver `docs/ai/NEXT_ACTION.md`.

## Não fazer

- não reabrir Fases 38–41 sem regressão concreta;
- não pedir/receber secrets de backup no chat;
- não ativar backup antes dos secrets restantes;
- não fechar #75 sem primeiro run real;
- não restaurar Production para teste;
- não implementar requisito `PENDING` por inferência;
- não transformar `REQ-EXPOR-001` em segunda frente simultânea;
- não criar bucket público;
- não expor secret/service key no browser;
- não manipular objetos de Storage por SQL;
- não inventar nome/timestamp de migration: gerar com Supabase CLI pinada;
- não criar deployment Vercel sem necessidade real;
- não importar dados reais/cutover.
