# ADR-009 — Proteção, backup e recuperação de dados

Status: **aceito para implementação; provisionamento externo ainda não autorizado**  
Data: 2026-08-26  
Requisito: `REQ-PLAT-005`  
Issue: #75

## Contexto

A implementação histórica da #75 criou uma rotina tecnicamente válida de backup lógico do Supabase Production com `supabase db dump`, checksum, Google Drive via rclone, Gmail App Password para alerta e restore drill mensal. A automação permaneceu fail-closed por `BACKUP_AUTOMATION_ENABLED` e nunca foi armada em Production.

Em 2026-08-26 a decisão operacional foi revista. O objetivo deixa de ser “ativar o workflow atual” e passa a ser uma política completa de proteção dos dados que:

1. mantenha backup automático real e independente da ação humana;
2. exponha dentro do Lojasaph um estado compreensível e autoritativo da proteção;
3. permita exportação manual complementar, sem transformá-la no mecanismo principal de disaster recovery;
4. reduza dependência de integrações pessoais como Drive/Gmail e preserve evolução comercial multi-Organization.

A revisão também precisa considerar que o Supabase separa o banco PostgreSQL dos objetos binários do Storage. Backup de banco preserva metadata de Storage, mas não os arquivos armazenados pela Storage API.

Referências verificadas em 2026-08-26:

- Supabase Database Backups: https://supabase.com/docs/guides/platform/backups
- Supabase backup/restore via CLI: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- Cloudflare R2 S3 API: https://developers.cloudflare.com/r2/api/
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Cloudflare R2 lifecycle: https://developers.cloudflare.com/r2/buckets/object-lifecycles/
- Cloudflare R2 bucket locks: https://developers.cloudflare.com/r2/buckets/bucket-locks/

## Decisão

### 1. Separar três responsabilidades

A proteção de dados terá três camadas complementares.

#### A — backup automático de recuperação

É a fonte principal de disaster recovery.

- roda sem clique do usuário;
- cobre Production dentro do RPO aprovado;
- gera snapshot lógico consistente do PostgreSQL;
- transfere artefatos para armazenamento off-site fora do Supabase Production;
- verifica integridade antes e depois da transferência;
- aplica retenção;
- mantém evidência de execução;
- possui restore drill recorrente isolado.

Nenhuma confirmação humana transforma um arquivo em backup válido.

#### B — observabilidade “Proteção dos dados” no produto

O Lojasaph passa a mostrar estado de proteção por Organization, sem depender de conhecimento de GitHub Actions, `pg_dump` ou do provedor de storage.

Experiência alvo:

- card global no `RuntimeShell`;
- página `/workspace/backup`;
- verde: proteção dentro da política;
- âmbar: aproximação do RPO ou degradação relevante;
- vermelho: RPO violado ou falha;
- última cópia válida;
- próxima janela esperada;
- integridade;
- retenção;
- histórico recente;
- último restore drill.

Atraso do backup **não bloqueia automaticamente a operação transacional**. Caixa, estoque, compras e financeiro não devem ficar indisponíveis apenas porque a proteção passou do RPO. Qualquer política de bloqueio futuro exige decisão específica de continuidade.

#### C — exportação manual complementar

Uma exportação por Organization pode ser oferecida a `owner/admin` Organization-wide como cópia adicional sob custódia do cliente.

Ela:

- não substitui o automático;
- deve ser versionada e auditada;
- preserva IDs/relacionamentos necessários;
- inclui manifesto e checksums/fingerprint;
- é tratada como conteúdo altamente sensível;
- não é exigida diariamente.

O formato final será decidido depois do inventário de cobertura e de uma prova de reconstrução/reconciliação. Não fixar antecipadamente `JSON` único versus `ZIP`/JSONL.

### 2. Destino off-site: interface S3-compatible, não Drive-specific

A automação será desacoplada de Google Drive/rclone e passará a trabalhar contra uma interface de **object storage compatível com S3**.

Motivos:

- credenciais máquina-a-máquina mais simples que OAuth de conta pessoal;
- melhor aderência a um produto comercial/multiempresa;
- bucket privado e políticas de retenção no próprio storage;
- troca futura de provedor sem reescrever a estratégia de backup;
- elimina Gmail/Drive como requisito estrutural do produto.

### 3. Provedor inicial preferido: Cloudflare R2, sem provisionamento nesta decisão

Cloudflare R2 é o provedor inicial preferido para a primeira implementação porque, na documentação atual:

- expõe API S3-compatible;
- possui free tier de 10 GB-month em Standard e egress gratuito;
- oferece lifecycle de objetos;
- oferece bucket locks que impedem exclusão/overwrite durante a retenção;
- permite token limitado a bucket.

A seleção técnica **não autoriza criar conta, habilitar billing/purchase, criar bucket ou gerar secrets**. A documentação atual da Cloudflare informa que é necessário habilitar/comprar R2 antes de gerar credenciais. Qualquer ativação que envolva cadastro financeiro permanece gate explícito do operador.

Se R2 não for aprovado no momento da ativação, Backblaze B2, AWS S3 ou outro destino S3-compatible que atenda os mesmos controles pode substituir o provedor sem alterar o contrato de aplicação.

### 4. Controles mínimos do bucket

Para o primeiro destino aprovado:

- bucket privado e dedicado ao backup de Production;
- nenhum acesso público/CORS de navegador;
- credencial de automação escopada ao bucket;
- prefixo por ambiente, nunca por usuário;
- checksum SHA-256 do archive;
- verificação pós-upload;
- retenção operacional de 30 dias;
- proteção contra exclusão/overwrite durante a janela de retenção quando o provedor oferecer lock/WORM;
- lifecycle configurado pelo bucket, não por deleção ad-hoc do runner, sempre que possível;
- segredos somente em GitHub Actions Secrets/secret manager apropriado.

Para R2, usar bucket lock compatível com a janela de retenção e lifecycle de expiração posterior. Lock e lifecycle precisam ser configurados de modo coerente; o lock prevalece enquanto estiver ativo.

### 5. Modelo de evidência autoritativa

A UI não deve inferir sucesso pelo horário do cron nem por declaração humana.

A arquitetura terá dois planos de evidência.

#### Evidência off-site

Cada backup válido possui artefato e manifesto/checksum armazenados junto ao archive. Essa é a evidência independente necessária para recuperação quando o banco principal estiver indisponível.

O manifesto deve conter apenas metadata não sensível necessária à recuperação, como:

- `backup_id`;
- ambiente;
- timestamp UTC;
- versão/formato;
- cobertura declarada (`postgres`, e futuramente `storage`);
- SHA-256;
- tamanho;
- versão do exportador;
- referências de execução não secretas.

#### Espelho operacional no PostgreSQL

Para a UI, o Lojasaph terá registros de execução sanitizados no banco operacional. O modelo físico será implementado em migration própria e deverá suportar no mínimo:

- run global de proteção;
- tipo (`automatic_database`, `automatic_storage`, `manual_export`, `restore_drill`);
- estado (`running`, `succeeded`, `failed`);
- início/fim;
- integridade verificada;
- provider/destino lógico sem segredo;
- tamanho e timestamps seguros;
- erro sanitizado;
- relação entre o run e as Organizations cobertas.

Um backup completo do PostgreSQL é feito por database/environment, não duplicado por Organization. A UI por Organization deriva o estado a partir da relação “Organization incluída no run X”. Exportações manuais continuam específicas de uma Organization.

Leitura segue RLS/escopo existente. Mutation desse estado não é concedida a usuários comuns; somente o processo de backup/server-side e actions administrativas explicitamente autorizadas podem registrar eventos.

### 6. Alertas: remover Gmail como dependência obrigatória

`BACKUP_ALERT_GMAIL_APP_PASSWORD` deixa de fazer parte da arquitetura alvo.

No primeiro estágio, falha deve produzir simultaneamente:

- conclusão `failure` no GitHub Actions;
- evidência/estado crítico consultável pelo produto quando o banco estiver disponível;
- issue/registro operacional persistente no GitHub sem conteúdo sensível, evitando spam por duplicação.

Um canal externo adicional (e-mail transacional, webhook, Slack etc.) pode ser adicionado depois como adapter de notificação quando houver necessidade comercial/operacional e provedor aprovado.

O sistema não deve depender de senha de aplicativo de uma conta Gmail pessoal para cumprir `REQ-PLAT-005`.

### 7. Cobertura do PostgreSQL

O exportador atual segue a sequência oficial do Supabase CLI:

- roles;
- schema;
- data;
- checksum.

As migrations continuam fonte de verdade do schema do produto, mas não substituem dados.

Auth utiliza PostgreSQL internamente, porém recuperação de um projeto Supabase completo ainda exige reconfiguração de itens externos. O runbook deve distinguir “dados de Auth presentes no banco/restauração” de “configurações Auth/API keys/provedores externos”.

### 8. Storage/anexos são trilha separada e obrigatória antes de declarar cobertura completa

`REQ-FIN-008` permite anexos no Supabase Storage. O backup de banco não copia os binários.

Portanto:

- a primeira reconciliação da automação pode continuar protegendo PostgreSQL;
- a UI deve declarar cobertura real sem dizer “backup completo” enquanto Storage não estiver coberto;
- antes de anexos reais serem tratados como recuperáveis, implementar cópia off-site dos objetos do(s) bucket(s) usados pelo Lojasaph + inventário/checksum que permita reconciliar metadata e objeto;
- restore drill de Storage deve ocorrer em destino isolado, nunca sobrescrevendo Production.

### 9. Segurança da exportação manual

Threat model mínimo:

- arquivo pode conter praticamente toda a informação operacional de uma Organization;
- somente `owner/admin` Organization-wide pode gerar;
- autorização precisa ser revalidada server-side;
- nenhuma exportação cross-Organization;
- geração preferencialmente server-side/streaming, sem persistência pública;
- nomes de arquivo não carregam dados sensíveis;
- evento é auditado;
- não incluir secrets, chaves de API, senhas ou material de autenticação reutilizável;
- mecanismos de download devem evitar URLs públicas permanentes e cache indevido.

## Política operacional preservada

- RPO: 24 horas;
- cadência automática: diária ou mais frequente;
- RTO objetivo: até 4 horas em condição operacional normal;
- retenção: 30 dias;
- restore drill: mensal e isolado;
- nenhum plano/add-on/provider pago é ativado sem autorização explícita.

## Consequências

### Positivas

- backup continua automático e independente de comportamento humano;
- reduz credenciais pessoais/OAuth na operação;
- storage de backup passa a ter contrato apropriado para automação;
- arquitetura pode migrar entre provedores S3-compatible;
- status de proteção vira funcionalidade observável dentro do produto;
- backup global não é duplicado por Organization;
- exportação manual fica disponível como camada adicional, sem degradar disaster recovery;
- limites de cobertura de Storage/Auth ficam explícitos.

### Custos/limitações

- a automação antiga de rclone/Gmail precisa ser reconciliada, não apenas ativada;
- será necessária migration para persistir evidência operacional da proteção;
- um destino S3-compatible real ainda precisa ser aprovado/provisionado antes do primeiro run;
- Storage requer uma segunda trilha de backup antes de cobertura completa;
- a exportação manual exige inventário e prova de restauração antes de fixar formato.

## Não fazer

- não armar `BACKUP_AUTOMATION_ENABLED` no workflow Drive/rclone atual;
- não provisionar OAuth/rclone ou Gmail App Password por inércia;
- não contratar/ativar R2 ou outro serviço pago sem autorização;
- não considerar “download + confirmei” prova de backup;
- não bloquear mutations do negócio por atraso de backup sem nova decisão;
- não declarar Storage protegido por causa do dump PostgreSQL;
- não colocar archives reais no Git/GitHub Artifacts;
- não restaurar sobre Production para testar.

## Próxima slice técnica

Após este ADR ser integrado, a menor slice executável da #75 é **reconciliar a automação existente para um contrato S3-compatible provider-neutral e remover Gmail/rclone da dependência obrigatória**, mantendo `BACKUP_AUTOMATION_ENABLED=false` e sem provisionar infraestrutura externa.

A persistência de status, UI e exportação manual vêm em slices posteriores, conforme a ordem da Issue #75.
