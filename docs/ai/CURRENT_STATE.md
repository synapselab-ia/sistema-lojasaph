# Current State — Sistema Lojasaph

Última atualização: 2026-08-20

## Estado atual

Fase 37 — auditoria de `REQ-SEC-004 — Segredos` — **atendido no escopo auditável; nenhum segredo real versionado ou vazamento browser/log reproduzível encontrado**.

- Repositório: `synapselab-ia/sistema-lojasaph`
- baseline da fase: `main` em `2ff5a421624c0f6dbf199ae16f77f9ab7f510626`
- branch: `agent/secrets-audit`
- Issue funcional nova: nenhuma
- evidência: `docs/qa/secrets-audit.md`
- Issue #75 de backup continua aberta e bloqueada por decisões operacionais
- nenhuma migration/DDL/DML foi executada nesta fase
- nenhum valor de secret/key/connection string foi solicitado ou registrado
- nenhum deployment Vercel foi criado

## Fase 36 integrada

A Fase 36 / Issue #83 / PR #84 foi squash-mergeada em `main` no commit:

- `2ff5a421624c0f6dbf199ae16f77f9ab7f510626`

A Issue #83 está fechada como concluída. A migration `20260820192526 / critical_config_audit` continua registrada no Supabase e **não deve ser reaplicada**.

Validação final da Fase 36 no head do PR #84:

- CI #334 — success;
- Business Transactions Integration #165 — success;
- Inventory Count Integration #181 — success.

## REQ-SEC-004 — resultado

### Arquivos rastreados

A árvore recursiva completa da `main` (`truncated=false`) foi auditada.

- único `.env*` rastreado: `.env.example`;
- `.env.example` contém placeholders vazios, não valores reais;
- nenhum `.env` local/Production rastreado;
- nenhum PEM/certificado/chave privada ou contêiner de chave rastreado;
- nenhum dump/backup real rastreado;
- nenhuma planilha real `.xlsx/.xls/.csv` rastreada.

`.gitignore` continua excluindo `.env*` salvo `.env.example`, `/backups/` e `*.pem`.

### Histórico observável

O histórico disponível foi inspecionado por buscas de commits relacionadas a `.env`, `secret`, `credential`, `password` e à introdução do Supabase.

- commit inicial continha apenas README;
- a Fase 7 já introduziu `.env.example` com URL/publishable/secret vazios;
- helpers históricos referenciavam apenas nomes de `process.env`, não valores literais;
- hardening posterior adicionou `server-only` e testes de fronteira;
- nenhuma evidência de remoção/rotação por vazamento foi encontrada.

Limitação explícita: o conector atual não expõe GitHub Secret Scanning nem `git grep` arbitrário sobre todos os blobs históricos. Portanto não alegar uma varredura exaustiva de todo o DAG; registrar apenas que **nenhuma exposição concreta foi encontrada no histórico observável**.

### Browser/server

- `SUPABASE_SECRET_KEY` é lida somente por runtime server-only;
- `src/lib/supabase/env.ts` e `src/lib/supabase/server.ts` são server-only;
- admin client recebe a secret somente no servidor e depende da policy de ambiente;
- browser usa somente URL + publishable key + refs públicas;
- `client-boundary.test.ts` bloqueia regressão para secret/import de facade server/process.env não público;
- workspace envia ao client somente `SupabasePublicConfig`.

### Senhas, logs e erros públicos

- Server Actions não colocam senha em log/URL/resposta;
- logger redige campos sensíveis recursivamente;
- texto livre redige Bearer/JWT, chaves Supabase, credentialed URLs e parâmetros token/secret/password;
- `instrumentation.ts` remove query string e não copia headers;
- `toPublicError()` converte falhas internas em mensagem genérica;
- error boundaries exibem apenas mensagem genérica + digest/referência.

### `/health` e Vercel

O deployment Production atual permanece no commit `046c4a3392f85e2361c6ddeac0ae3ee1817145c5` por política de deploy manual. O blob de `src/app/health/route.ts` é exatamente o mesmo nesse commit e na `main`: `76220c627485d9b70b3281a23b426c7ed9ab246d`.

Fetch read-only de `/health` em 2026-08-20 retornou somente status/service/environment/supabase access reason/admin access, sem URL/ref/key/secret.

A conexão Vercel disponível nesta sessão **não possui ação de listagem de environment variables**. Não inferir target scoping nem valores. Nenhum deploy foi criado.

### Workflows e backup scripts

- workflows não ecoam credenciais nem publicam env/backup artifacts;
- `postgres/postgres` nos jobs é credencial descartável do Postgres efêmero de CI, não Production;
- `export-supabase-backup.sh` exige DB URL via ambiente, não imprime o valor, recusa output dentro do repo e usa `umask 077`;
- `verify-backup-restore.sh` usa diretório temporário, dump `chmod 600` e cleanup automático.

## Supabase

Revalidação read-only confirmou `20260820192526 / critical_config_audit` no histórico remoto.

Nesta Fase 37:

- nenhuma migration reaplicada;
- nenhuma DDL/DML executada;
- nenhuma key/secret/connection string solicitada.

## REQ-PLAT-005 / Issue #75

Continua bloqueada. A #75 permanece sem comentários/decisões novas sobre RPO, RTO, destino off-site, retenção, proteção/encriptação, owner/alerta e drill hospedado.

Não inventar cron/storage e não fechar #75 sem automação real aprovada.

## Próxima ação

Após integrar a Fase 37, auditar `REQ-SEC-005 — Cancelamento/estorno`: registros críticos não devem ser simplesmente excluídos sem trilha de auditoria.

Reutilizar os fluxos já existentes de cancelamento/estorno e o hardening que remove DELETE direto. A auditoria deve provar cobertura por domínio e só abrir Issue se houver delete destrutivo ou lifecycle crítico sem trilha concreta.

## Não repetir

- não reabrir REQ-SEC-003 ou REQ-SEC-004 sem regressão/exposição concreta;
- não rotacionar credenciais por precaução sem evidência de comprometimento;
- não solicitar ou publicar valores de env hospedado;
- não reaplicar `critical_config_audit`;
- não fechar #75 sem decisões e backup automático real;
- não importar dados reais/cutover;
- não criar deployment Vercel rotineiro;
- não inferir Q-001..Q-025.
