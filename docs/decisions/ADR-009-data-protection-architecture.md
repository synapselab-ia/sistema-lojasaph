# ADR-009 — Proteção, backup e recuperação de dados

Status: **aceito e parcialmente implementado; backup PostgreSQL off-site + persistência autoritativa ativos, Storage/UI ainda pendentes**  
Data: 2026-08-26  
Requisito: `REQ-PLAT-005`  
Issue: #75

## Contexto

A estratégia histórica da #75 usava backup lógico do Supabase Production com `supabase db dump`, Google Drive/rclone, Gmail App Password e restore drill mensal. A revisão arquitetural de 2026-08-26 substituiu essas dependências pessoais por uma política de proteção própria para um produto comercial/multi-Organization.

A proteção precisa:

1. manter backup automático real e independente de ação humana;
2. expor no Lojasaph um estado compreensível e autoritativo da proteção;
3. permitir exportação manual complementar sem transformá-la no mecanismo principal de disaster recovery;
4. preservar portabilidade entre provedores de object storage;
5. distinguir claramente PostgreSQL dos objetos binários do Supabase Storage.

## Decisão

### 1. Três camadas complementares

#### A — backup automático de recuperação

Fonte principal de disaster recovery:

- roda sem clique do usuário;
- cobre Production dentro do RPO;
- gera snapshot lógico consistente do PostgreSQL;
- transfere artefatos para storage off-site fora do Supabase Production;
- verifica integridade antes e depois da transferência;
- aplica retenção;
- mantém evidência de execução;
- possui restore drill recorrente isolado.

Confirmação humana não transforma um arquivo em backup válido.

#### B — observabilidade `Proteção dos dados`

Experiência alvo:

- card/link global no `RuntimeShell`;
- página `/workspace/backup`;
- verde/âmbar/vermelho conforme política;
- última cópia válida;
- próxima janela esperada;
- integridade;
- retenção;
- histórico;
- último restore drill.

A UI deve consumir a fonte autoritativa no PostgreSQL, não inferir sucesso pelo horário do cron.

Atraso do backup não bloqueia automaticamente caixa, estoque, compras ou financeiro. Política de bloqueio futuro exige decisão específica.

#### C — exportação manual complementar

Pode ser oferecida a `owner/admin` Organization-wide como cópia adicional sob custódia do cliente.

- não substitui o automático;
- versionada e auditada;
- preserva IDs/relacionamentos necessários;
- inclui manifesto/checksum;
- é conteúdo altamente sensível;
- não entra no RPO automático.

## 2. Destino off-site por contrato S3-compatible

A automação não depende de Google Drive/rclone.

Contrato:

- endpoint HTTPS;
- bucket privado;
- region/prefix configuráveis;
- credencial máquina-a-máquina de menor privilégio;
- upload + existência remota + re-download/rehash;
- provider substituível sem redesenhar a aplicação.

## 3. Provedor inicial: Cloudflare R2

Cloudflare R2 foi escolhido como primeiro provider porque oferece API S3-compatible, lifecycle, Bucket Lock, tokens limitados a bucket e custo adequado ao volume atual.

### Atualização operacional de 2026-08-26

O gate externo originalmente preservado por este ADR foi posteriormente **explicitamente autorizado pelo operador** e concluído:

- R2 habilitado;
- bucket privado `lojasaph-production-backups`;
- prefixo `production/postgres`;
- lifecycle 30 dias;
- Bucket Lock 30 dias;
- token `Object Read & Write` limitado ao bucket;
- GitHub Actions Secrets/Variables provisionados fora do chat;
- `BACKUP_AUTOMATION_ENABLED=true`.

Esta atualização não altera o princípio arquitetural: o código continua provider-neutral e R2 pode ser substituído por outro S3-compatible que cumpra os controles.

## 4. Controles mínimos do bucket

- privado e dedicado a Production;
- nenhum acesso público/CORS de navegador;
- credencial escopada ao bucket;
- prefixo por ambiente, não por usuário;
- retenção 30 dias;
- proteção contra exclusão/overwrite durante a retenção quando suportado;
- lifecycle pelo provider, não deleção ad-hoc do runner;
- secrets somente em GitHub Actions Secrets/secret manager apropriado.

## 5. Hard cap pré-upload

Para limitar risco operacional/custo inesperado, o archive comprimido deve ser medido antes do upload.

Política implementada:

- máximo `300000000` bytes decimais por archive;
- acima disso o workflow falha antes do upload;
- incidente operacional é registrado;
- não enviar bundle parcial.

Esse cap é por archive e não substitui eventual guard futuro de uso agregado do bucket.

## 6. Evidência autoritativa

### Evidência off-site

Cada backup válido possui:

- archive;
- SHA-256 do archive;
- manifesto não sensível;
- SHA-256 do manifesto;
- revalidação pós-upload por re-download/rehash.

O manifesto contém somente metadata necessária à recuperação: `backup_id`, ambiente, timestamp, versão/formato, cobertura, hash, tamanho e referências não secretas de execução.

### Espelho operacional no PostgreSQL — implementado

Migration Production:

`20260826201252 / protection_run_persistence`

A fonte autoritativa usa:

- `public.protection_runs` para tipo, estado, início/fim, cópia válida, integridade, tamanho, provider/destino lógico, cobertura, referência de execução e erro sanitizado;
- `public.protection_run_organizations` para relacionar cada run global às Organizations cobertas.

Tipos suportados:

- `automatic_database`;
- `automatic_storage`;
- `manual_export`;
- `restore_drill`.

Estados suportados:

- `running`;
- `succeeded`;
- `failed`.

O backup PostgreSQL permanece por database/environment, sem duplicação física por Organization.

Leitura segue RLS/escopo de Organization. Usuários comuns não podem forjar sucesso de backup. Mutation ocorre somente pelo boundary server-side privado, com idempotência por `execution_reference`.

No momento da implantação a tabela estava vazia por não haver execução real pós-integração ainda; o run histórico `33006253661` não deve ser backfillado manualmente.

## 7. Alertas

Gmail App Password e rclone não fazem parte da arquitetura alvo.

Falha produz:

- `failure` no GitHub Actions;
- tentativa de persistir `failed` na fonte autoritativa com erro sanitizado;
- incidente operacional persistente/idempotente no GitHub.

Um canal externo adicional pode ser adicionado depois como adapter, se houver necessidade comercial.

## 8. Cobertura PostgreSQL

O exportador segue a sequência oficial Supabase CLI:

- roles;
- schema;
- data;
- checksums.

Migrations continuam fonte de verdade do schema do produto, mas não substituem dados.

Auth utiliza PostgreSQL internamente, porém recuperação completa da plataforma pode exigir reconfiguração de elementos externos ao dump.

## 9. Storage/anexos: trilha separada obrigatória

`REQ-FIN-008` usa Supabase Storage para anexos. O backup de banco não copia os binários.

Portanto:

- backup PostgreSQL pode ser considerado operacional;
- a UI deve declarar cobertura real e não dizer “backup completo” enquanto Storage não estiver coberto;
- implementar cópia off-site dos objetos + inventário/keys/checksums;
- restore de Storage deve ocorrer em destino isolado;
- não manipular `storage.*` diretamente por SQL para copiar objetos.

## 10. Segurança da exportação manual

Threat model mínimo:

- arquivo pode conter praticamente toda a informação operacional de uma Organization;
- somente `owner/admin` Organization-wide;
- autorização revalidada server-side;
- nenhuma exportação cross-Organization;
- geração preferencialmente server-side/streaming;
- evento auditado;
- sem secrets, chaves de API, senhas ou material de autenticação reutilizável.

## Política operacional

- RPO: 24 horas;
- cadência automática: diária ou mais frequente;
- RTO objetivo: até 4 horas em condição operacional normal;
- retenção: 30 dias;
- restore drill: mensal e isolado;
- nenhum novo serviço pago/add-on é ativado sem autorização explícita.

## Evidência de implementação

Primeira prova off-site real concluída em 2026-08-26:

- workflow `Production Database Backup`;
- run `33006253661`;
- archive `53185` bytes;
- checksums/manifesto válidos;
- upload R2 concluído;
- objetos remotos rebaixados e re-hasheados;
- incidente #111 fechado automaticamente após recuperação verde.

Persistência autoritativa concluída em 2026-08-26:

- migration `20260826201252 / protection_run_persistence` aplicada em Production;
- RLS e grants testados em CI;
- validação hospedada em transação + rollback provou leitura autorizada, mutation autenticada bloqueada e outsider bloqueado;
- workflow integrado passa a abrir/finalizar runs pelo boundary server-side;
- nenhum secret é armazenado no espelho operacional.

Warning de restore a preservar: constraints circulares em `stock_movements` e `payments` reportadas pelo `pg_dump`.

## Consequências

### Positivas

- backup automático independente de comportamento humano;
- credenciais máquina-a-máquina;
- provider substituível;
- fonte autoritativa pronta para a UI do produto;
- backup global não é duplicado por Organization;
- limites de cobertura de Storage/Auth ficam explícitos.

### Custos/limitações

- o primeiro run real pós-integração ainda precisa inaugurar o histórico automaticamente;
- UI `Proteção dos dados` ainda precisa ser implementada;
- Storage requer segunda trilha antes de cobertura completa;
- restore real isolado ainda precisa comprovar restaurabilidade end-to-end;
- exportação manual exige slice específica se mantida.

## Não fazer

- não voltar a Drive/rclone/Gmail;
- não pedir/armazenar secrets em chat/Issue/PR;
- não considerar confirmação humana prova de backup;
- não backfillar manualmente o run histórico anterior à persistência;
- não bloquear mutations do negócio por atraso sem nova decisão;
- não declarar Storage protegido pelo dump PostgreSQL;
- não colocar archives reais no Git/GitHub Artifacts;
- não restaurar Production para teste;
- não remover o hard cap de 300 MB sem nova decisão registrada;
- não permitir mutation de `protection_runs` pelo browser.

## Próxima slice técnica

**UI read-only `Proteção dos dados` no `RuntimeShell` + `/workspace/backup`, consumindo exclusivamente a fonte autoritativa sob RLS.**

Storage/anexos e restore real isolado permanecem obrigatórios antes do fechamento da #75.
