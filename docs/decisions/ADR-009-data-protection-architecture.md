# ADR-009 — Proteção, backup e recuperação de dados

Status: **aceito e parcialmente implementado; backup PostgreSQL off-site + persistência autoritativa + UI read-only implementados, Storage e restore Production end-to-end ainda pendentes**  
Data: 2026-08-26  
Requisito: `REQ-PLAT-005`  
Issue: #75

## Contexto

A estratégia histórica da #75 usava backup lógico do Supabase Production com Google Drive/rclone e Gmail App Password. A revisão de 2026-08-26 substituiu essas dependências pessoais por uma arquitetura adequada a produto comercial/multi-Organization.

A proteção precisa:

1. manter backup automático real e independente de ação humana;
2. expor um estado compreensível e autoritativo no Lojasaph;
3. permitir exportação manual complementar sem transformá-la no disaster recovery principal;
4. preservar portabilidade entre provedores;
5. distinguir PostgreSQL dos objetos binários do Supabase Storage;
6. comprovar restaurabilidade em destino isolado sem tocar Production.

## Decisão

### 1. Três camadas complementares

#### A — backup automático de recuperação

Fonte principal de disaster recovery:

- roda sem clique humano;
- cobre Production dentro do RPO;
- gera snapshot lógico consistente do PostgreSQL;
- transfere para storage off-site fora do Supabase Production;
- verifica integridade antes/depois da transferência;
- aplica retenção;
- mantém evidência autoritativa;
- possui restore drill recorrente e isolado.

Confirmação humana não transforma um arquivo em backup válido.

#### B — observabilidade `Proteção dos dados`

Implementada no PR #115:

- link `Proteção dos dados` no `RuntimeShell`;
- página `/workspace/backup`;
- estado verde/âmbar/vermelho derivado de evidência autoritativa + RPO 24h;
- última execução PostgreSQL;
- última cópia válida;
- integridade;
- tamanho;
- retenção;
- histórico;
- restore drill quando houver registro autoritativo;
- declaração explícita de cobertura incompleta de Storage/anexos.

A UI consome PostgreSQL sob RLS e não infere sucesso pelo cron ou GitHub Actions.

Atraso do backup não bloqueia automaticamente caixa, estoque, compras ou financeiro. Bloqueio futuro exige nova decisão.

#### C — exportação manual complementar

Pode ser oferecida posteriormente a `owner/admin` Organization-wide como cópia adicional sob custódia do cliente.

- não substitui o automático;
- deve ser versionada/auditada;
- preserva IDs/relacionamentos necessários;
- inclui manifesto/checksum;
- é conteúdo altamente sensível;
- não entra no RPO automático.

## 2. Destino off-site por contrato S3-compatible

Contrato:

- endpoint HTTPS;
- bucket privado;
- region/prefix configuráveis;
- credencial máquina-a-máquina de menor privilégio;
- upload + existência remota + re-download/rehash;
- provider substituível sem redesenhar a aplicação.

Cloudflare R2 é o provider inicial autorizado, mas o código permanece provider-neutral.

## 3. Estado operacional do R2

Concluído pelo operador em 2026-08-26:

- bucket privado dedicado a Production;
- namespace `production/postgres`;
- lifecycle 30 dias;
- Bucket Lock 30 dias;
- token `Object Read & Write` limitado ao bucket;
- GitHub Actions Secrets/Variables provisionados fora do chat;
- `BACKUP_AUTOMATION_ENABLED=true`.

Nenhum secret deve ser reproduzido em Issue, PR, documentação ou chat.

## 4. Controles do bucket

- nenhum acesso público/CORS de navegador;
- credencial escopada ao bucket;
- prefixo por ambiente;
- retenção/lock no provider;
- automação não deleta backups por idade;
- secrets somente em secret store apropriado.

## 5. Hard cap pré-upload

Política implementada:

- máximo `300000000` bytes decimais por archive;
- acima disso o workflow falha antes do upload;
- incidente operacional é registrado;
- bundle parcial não é enviado.

## 6. Evidência autoritativa

### Off-site

Cada backup válido possui:

- archive;
- SHA-256 do archive;
- manifesto não sensível;
- SHA-256 do manifesto;
- revalidação pós-upload por re-download/rehash.

### PostgreSQL

Migration Production:

`20260826201252 / protection_run_persistence`

Fonte autoritativa:

- `public.protection_runs`;
- `public.protection_run_organizations`.

Tipos:

- `automatic_database`;
- `automatic_storage`;
- `manual_export`;
- `restore_drill`.

Estados:

- `running`;
- `succeeded`;
- `failed`.

Leitura segue RLS/membership. Mutation comum é proibida. Escrita autorizada ocorre pelos comandos privados server-side, idempotentes por `execution_reference`.

O backup PostgreSQL continua global por database/environment; não duplicar dump físico por Organization.

O run histórico `33006253661` antecede essa persistência e não deve ser backfillado manualmente.

## 7. UI read-only — implementada

O PR #115 introduziu uma camada de leitura que:

1. usa a sessão Supabase autenticada existente;
2. filtra a relação run↔Organization pela Organization selecionada;
3. lê os runs ainda sujeitos à RLS;
4. não usa `service_role` no browser;
5. não seleciona/exibe `execution_reference`, GitHub internals, bucket físico, secrets ou dump;
6. trata zero rows como estado inicial legítimo.

Semântica mínima:

- verde: PostgreSQL `succeeded` + integridade verificada + cópia válida dentro de 24h;
- âmbar: estado inicial/transitório;
- vermelho: falha persistida ou cópia ausente/vencida além do RPO.

A UI não é mecanismo de comando: iniciar/retry/cancelar backup permanece fora de escopo.

## 8. Alertas

Gmail App Password e rclone não fazem parte da arquitetura alvo.

Falha de proteção deve produzir:

- `failure` no GitHub Actions;
- evidência `failed` quando o workflow estiver integrado à fonte autoritativa;
- incidente GitHub-native persistente/idempotente.

## 9. Cobertura PostgreSQL

O exportador segue o padrão Supabase CLI em arquivos separados:

- roles;
- schema;
- data;
- checksums.

Migrations são fonte de verdade do schema do produto, mas não substituem dados.

Auth usa PostgreSQL internamente, porém recuperação completa da plataforma pode exigir reconfiguração de elementos externos ao dump.

## 10. Restore drill: requisito e gap atual

O restore drill deve comprovar que o **bundle Production real** baixado do storage off-site restaura em destino PostgreSQL/Supabase isolado compatível.

Issue #110 registrou a primeira falha do workflow mensal. O run `33000481649` ocorreu antes da existência do primeiro archive Production e falhou porque não havia backup disponível para download.

O primeiro archive real foi criado depois, no run `33006253661`.

O workflow atual ainda possui um gap:

- baixa e verifica o bundle Production real;
- em seguida cria um banco sintético com migrations + seed;
- `scripts/verify-backup-restore.sh` gera/restaura um novo dump desse banco sintético;
- portanto ainda não restaura roles/schema/data do bundle Production baixado.

Assim, um workflow verde no desenho atual não deve ser chamado de prova Production end-to-end.

Próxima evolução obrigatória:

- restaurar o bundle real em PostgreSQL 17/destino isolado;
- nunca tocar Production;
- tratar explicitamente roles, schema, data, extensions, triggers/FKs;
- validar os warnings de constraints circulares em `stock_movements` e `payments`;
- executar smoke tests;
- persistir `restore_drill` autoritativamente apenas após prova suficiente.

## 11. Storage/anexos: trilha separada obrigatória

`REQ-FIN-008` usa Supabase Storage. O backup SQL não copia os binários.

Portanto:

- backup PostgreSQL pode ser considerado operacional;
- a UI deve continuar dizendo que Storage/anexos não estão cobertos;
- futura trilha deve copiar objetos off-site + inventário/keys/checksums;
- restore de Storage deve ocorrer em destino isolado;
- não manipular `storage.*` diretamente por SQL para copiar objetos.

## 12. Segurança da exportação manual

Se implementada:

- somente `owner/admin` Organization-wide;
- autorização server-side;
- nenhuma exportação cross-Organization;
- formato versionado + manifesto/checksum;
- audit trail;
- sem secrets ou material de autenticação reutilizável.

## Política operacional

- RPO: 24 horas;
- cadência automática: diária ou mais frequente;
- RTO objetivo: até 4 horas em condição operacional normal;
- retenção: 30 dias;
- restore drill: mensal e isolado;
- nenhum novo serviço pago/add-on sem autorização explícita.

## Evidências já comprovadas

### Backup off-site

Run `33006253661`:

- `53185` bytes;
- checksums/manifesto válidos;
- upload off-site concluído;
- objetos rebaixados e re-hasheados;
- Issue #111 fechada após recuperação.

### Persistência

- migration `20260826201252` aplicada;
- RLS/grants testados em CI e hospedado;
- mutation autenticada bloqueada;
- outsider bloqueado;
- boundary server-side integrado ao backup automático.

### UI

PR #115 / CI funcional inicial #430:

- estados vazio/sucesso/running/falha/RPO testados;
- lint/typecheck/tests/build verdes;
- RLS/hardening reexecutados verdes.

## Consequências

### Positivas

- proteção independe de comportamento humano;
- credenciais máquina-a-máquina;
- provider substituível;
- evidência autoritativa disponível para produto;
- UI reflete somente evidência permitida pela Organization;
- limites de cobertura ficam explícitos.

### Limitações ainda abertas

- primeiro run automático pós-persistência ainda precisa inaugurar o histórico real;
- restore Production end-to-end ainda não foi comprovado;
- workflow de restore ainda precisa persistir `restore_drill`;
- Storage requer trilha própria;
- exportação manual permanece opcional/posterior.

## Não fazer

- não voltar a Drive/rclone/Gmail;
- não pedir/armazenar secrets em chat/Issue/PR;
- não considerar confirmação humana prova de backup;
- não backfillar run histórico;
- não bloquear operação por atraso sem nova decisão;
- não declarar Storage protegido pelo dump PostgreSQL;
- não armazenar archives reais no Git/GitHub Artifact;
- não restaurar Production para teste;
- não remover o hard cap sem nova decisão;
- não permitir mutation de `protection_runs` pelo browser;
- não usar cron/GitHub Actions como fonte primária da UI.

## Próxima slice técnica

**Restore end-to-end do bundle PostgreSQL Production real em destino isolado + persistência autoritativa de `restore_drill`, reconciliando a Issue #110.**

Depois disso, Storage/anexos permanece obrigatório antes do fechamento da #75.
