# Handoff — Sistema Lojasaph

## Estado

Fase 16 — backup automático, restauração testada e recuperação operacional — **concluída e integrada**.

- PR #42 — merged;
- Issue #41 — closed/completed;
- merge commit: `c1bd48e99f74687622c24a856f193bf47aa35d39`;
- SHA final pré-merge: `efb4b2ca55bf650fa303c57025979f5f5c4d13f8`;
- próxima Issue: #43 — Fase 17 — observabilidade, logs estruturados e rastreabilidade de erros;
- ainda não existe branch funcional da Fase 17.

## Fase 16 — não repetir

- estratégia/runbook em `docs/operations/backup-restore.md`;
- helper de exportação lógica `scripts/export-supabase-backup.sh`;
- helper impede gravação de dump dentro do Git repository;
- checksum SHA-256 e permissões restritas;
- `/backups/` ignorado;
- drill automatizado `scripts/verify-backup-restore.sh`;
- checks em `supabase/tests/backup_restore.sql`;
- PostgreSQL 17 + cliente 17 PGDG no CI;
- restore apenas em banco efêmero isolado;
- RLS/grants/Organization isolation comprovados após restore;
- nenhum DDL/migration/restore remoto na Fase 16;
- RPO/RTO, retenção e destino off-site continuam pendentes.

Não criar outro mecanismo de backup sem requisito novo e não executar restore sobre o Supabase ativo.

## CI final da Fase 16

No SHA `efb4b2ca55bf650fa303c57025979f5f5c4d13f8`:

- `CI` #206 — success;
- `Inventory Count Integration` #125 — success;
- `Business Transactions Integration` #108 — success.

O `CI` passou inclusive por `Verify logical backup and isolated restore` e por todas as suítes PostgreSQL existentes.

## Supabase remoto

Nenhuma alteração estrutural ocorreu na Fase 16.

Estado verificado durante a fase:

- projeto saudável;
- PostgreSQL 17;
- organização no plano Free;
- nenhuma development branch Supabase;
- histórico remoto ainda termina nas três migrations de importação da Fase 15.

No plano Free atual, recuperação de contingência depende de exportação lógica periódica/off-site; backup diário gerenciado/PITR exigem plano/configuração compatíveis.

## Próxima frente — Issue #43

`REQ-PLAT-006 — Logs e erros` é MUST antes de produção e permanece incompleto.

A Issue #43 foi criada somente depois do fechamento da Fase 16 porque:

- não havia outra Issue aberta;
- busca no repositório não encontrou Sentry/OpenTelemetry/logger estruturado/error tracking/correlation ID;
- Vercel e Supabase já compõem o runtime real e devem ser verificados antes de escolher mecanismo/fornecedor.

### Limites da Fase 17

- verificar documentação/capacidades atuais de Vercel e Supabase antes de implementar;
- não contratar/adotar vendor pago por inferência;
- começar por contrato de logging estruturado independente do destino;
- não registrar tokens, passwords, connection strings, payloads financeiros completos ou PII desnecessária;
- separar mensagem segura para usuário de detalhe técnico server-side;
- usar correlation/request IDs onde viável;
- criar redaction explícita e testes;
- cobrir os principais boundaries do Next.js/runtime sem alterar regras transacionais;
- validar somente com dados sintéticos/não sensíveis;
- não prometer SLA/SLO, retenção ou on-call sem decisão/capacidade confirmada.

## Próxima ação exata

1. confirmar Issue #43 e o head atual da `main`;
2. criar branch `agent/observability` a partir da `main` atual;
3. ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, este `HANDOFF`, `NEXT_ACTION`, `requirements.md`, documentação de runtime/Supabase/Vercel e ADRs relacionados;
4. verificar documentação oficial vigente e capacidades reais dos projetos/planos Vercel e Supabase para logs, retenção, runtime errors e integração;
5. inspecionar error handling atual, server actions/route boundaries, adapters/gateways e UI fallbacks antes de definir contrato;
6. implementar somente a fundação da Issue #43:
   - logger estruturado server-side;
   - níveis/event codes;
   - correlation/request ID;
   - redaction de campos sensíveis;
   - mapeamento seguro de erros para UI;
   - error boundary/fallback apropriado;
   - instrumentação dos boundaries prioritários;
7. adicionar testes de estrutura, redaction, correlation e mensagens seguras;
8. validar logs no runtime Vercel apenas com dados sintéticos/não sensíveis e usar Supabase somente em consultas/log checks read-only quando necessário;
9. rodar lint, typecheck, Vitest, build e workflows PostgreSQL existentes;
10. atualizar documentação operacional e continuidade antes do PR/merge.

## Regras que permanecem

- GitHub é fonte de verdade;
- secrets nunca no browser/Git/log;
- service role continua server-only;
- nenhuma questão de negócio é resolvida por inferência;
- dados reais/planilhas reais continuam fora do GitHub;
- nenhuma operação destrutiva remota sem necessidade e proteção explícita;
- migrations continuam forward-only quando houver mudança estrutural.
