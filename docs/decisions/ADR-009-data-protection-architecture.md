# ADR-009 — Proteção, backup e recuperação de dados

Status: **aceito e parcialmente implementado; trilha PostgreSQL end-to-end comprovada, Supabase Storage/anexos ainda pendente**  
Data: 2026-08-27  
Requisito: `REQ-PLAT-005`  
Issue: #75

## Contexto

A estratégia histórica da #75 usava backup lógico do Supabase Production com Google Drive/rclone e Gmail App Password. A revisão de 2026-08-26 substituiu essas dependências pessoais por uma arquitetura adequada a produto comercial/multi-Organization.

A proteção precisa:

1. manter backup automático real e independente de ação humana;
2. expor estado compreensível e autoritativo no Lojasaph;
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
- restore drill;
- declaração explícita de cobertura incompleta de Storage/anexos.

A UI consome PostgreSQL sob RLS e não infere sucesso pelo cron ou GitHub Actions.

Atraso de backup não bloqueia automaticamente caixa, estoque, compras ou financeiro. Bloqueio futuro exige nova decisão.

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
- token limitado ao bucket;
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

## 5. Hard cap pré-upload PostgreSQL

Política implementada:

- máximo `300000000` bytes decimais por archive PostgreSQL;
- acima disso o workflow falha antes do upload;
- incidente operacional é registrado;
- bundle parcial não é enviado.

Esse limite **não deve ser reaproveitado automaticamente para Storage**; objetos/binários exigem guardrails próprios conforme inventário/volume real.

## 6. Evidência autoritativa

### Off-site

Cada backup PostgreSQL válido possui:

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

O run histórico `33006253661` antecede a persistência de `automatic_database` e não deve ser backfillado manualmente.

## 7. UI read-only

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

A UI não é mecanismo de comando.

## 8. Alertas

Gmail App Password e rclone não fazem parte da arquitetura alvo.

Falha de proteção produz:

- `failure` no GitHub Actions;
- evidência `failed` quando o processo autoritativo foi iniciado;
- incidente GitHub-native persistente/idempotente.

Recuperação suficiente registra sucesso e fecha o incidente automaticamente.

## 9. Backup PostgreSQL

O exportador segue o padrão Supabase CLI em arquivos separados:

- `roles.sql`;
- `schema.sql`;
- `data.sql`;
- `SHA256SUMS`;
- metadata não sensível.

Migrations são fonte de verdade do schema do produto, mas não substituem dados.

Auth usa PostgreSQL internamente, porém recuperação completa da plataforma pode exigir reconfiguração de elementos externos ao dump.

## 10. Restore PostgreSQL end-to-end — comprovado

A exigência arquitetural é restaurar o **bundle Production real** baixado do storage off-site em destino PostgreSQL/Supabase isolado compatível, nunca Production.

### Implementação

PR #116 passou o workflow mensal para restore real do bundle.

O helper:

- exige destino isolado/loopback;
- valida metadata/checksums;
- usa transação + `ON_ERROR_STOP`;
- aplica `roles.sql` → `schema.sql` → `session_replication_role=replica` → `data.sql`;
- executa smoke tests e revalidação de FKs após o replica-mode;
- destrói somente o destino temporário.

PR #117 tratou a incompatibilidade das roles gerenciadas Supabase sem silenciar erros genericamente. O SQL original continua checksum-authoritativo; a cópia de restore normaliza somente operações classificadas como gerenciadas e falha se encontrar caso não suportado.

PR #119 alinhou o schema gerenciado do destino isolado ao estado real de Production:

- Production estava em `storage.migrations=64`;
- `storage.buckets.versioning_status` é exigida pelo `data.sql` real;
- destino usa `storage-api:v1.70.7`;
- preflight exige migration >=64 e a coluna antes do import;
- CI `isolated-storage-schema` sobe esse target sem Production/R2 secrets e comprova o contrato antes do merge.

### Histórico de falhas que orientou a correção

- `33014974208`: falhou em `roles.sql` ao tentar modificar `supabase_admin`;
- `33018829402`: roles/schema passaram e `data.sql` revelou schema Storage local antigo;
- ambas foram persistidas como `restore_drill=failed` e mantiveram #110 aberta.

### Prova final

Run `33069706382`, em 2026-08-27: **success**.

Comprovou:

- download/verificação do archive Production real;
- restore roles/schema/data;
- Postgres 17 compatível;
- schema Storage gerenciado compatível;
- smoke tests de objetos críticos, dados, RLS e grants;
- revalidação das linhas contra todas as FKs públicas, inclusive ciclos conhecidos de `stock_movements` e `payments`;
- cleanup;
- persistência autoritativa de `restore_drill=succeeded`;
- auto-fechamento da Issue #110.

Evidência autoritativa do run:

- `coverage=postgres`;
- `integrity_verified=true`;
- `valid_copy_at=2026-08-26T19:40:47Z`;
- `size_bytes=53185`;
- 1 Organization relacionada.

Production nunca foi target.

## 11. Storage/anexos: trilha separada obrigatória

`REQ-FIN-008` usa Supabase Storage. O backup SQL inclui metadata de banco, mas **não copia os objetos binários**.

Portanto:

- PostgreSQL pode ser considerado operacional e restaurável;
- a UI deve continuar dizendo que Storage/anexos não estão cobertos até existir evidência real;
- futura trilha deve copiar objetos off-site + inventário/keys/checksums/fingerprints suficientes;
- restore de Storage deve ocorrer em destino isolado usando APIs suportadas;
- não manipular `storage.objects` por SQL para copiar binários;
- `automatic_storage` só pode terminar `succeeded` após integridade suficiente.

A próxima slice deve começar por inventário do código + Production antes de escolher full/incremental, formato ou limites.

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

## Evidências comprovadas

### Backup off-site PostgreSQL

Run `33006253661`:

- `53185` bytes;
- checksums/manifesto válidos;
- upload off-site concluído;
- objetos rebaixados e re-hasheados.

### Persistência

- migration `20260826201252` aplicada;
- RLS/grants testados;
- mutation autenticada bloqueada;
- outsider bloqueado;
- boundary server-side integrada.

### UI

PR #115:

- estados vazio/sucesso/running/falha/RPO testados;
- lint/typecheck/tests/build verdes;
- RLS/hardening preservados.

### Restore real

- PRs #116, #117 e #119 integrados;
- `33069706382` verde;
- latest `restore_drill` autoritativo `succeeded`;
- #110 fechada automaticamente;
- CI pós-merge `33069706327` verde;
- Restore Compatibility CI `33069706452` verde.

## Consequências

### Positivas

- proteção PostgreSQL independe de comportamento humano;
- credenciais máquina-a-máquina;
- provider substituível;
- evidência autoritativa disponível para produto;
- restaurabilidade do bundle Production real comprovada;
- failures intermediários preservados como audit trail;
- limites de cobertura ficam explícitos.

### Limitações ainda abertas

- Supabase Storage/anexos requer trilha própria;
- configurações externas ao dump podem precisar de DR específico;
- exportação manual permanece opcional/posterior;
- #75 só fecha quando a cobertura restante for suficiente.

## Não fazer

- não voltar a Drive/rclone/Gmail;
- não pedir/armazenar secrets em chat/Issue/PR;
- não considerar confirmação humana prova de backup;
- não backfillar run histórico;
- não bloquear operação por atraso sem nova decisão;
- não declarar Storage protegido pelo dump PostgreSQL;
- não armazenar archives reais no Git/GitHub Artifact;
- não restaurar Production para teste;
- não remover o hard cap PostgreSQL sem nova decisão;
- não permitir mutation de `protection_runs` pelo browser;
- não usar cron/GitHub Actions como fonte primária da UI;
- não copiar binários via DML em `storage.*`.

## Próxima slice técnica

**Inventário e desenho da proteção off-site + restore/reconciliação isolada dos objetos Supabase Storage/anexos.**

A implementação só começa depois de confirmar buckets, volume, metadata, autorização e contrato de integridade reais.
