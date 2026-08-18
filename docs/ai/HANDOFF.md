# Handoff — Sistema Lojasaph

## Estado

Fase 17 — observabilidade, logs estruturados e rastreabilidade de erros — **concluída e integrada**.

- PR #44 — merged;
- Issue #43 — closed/completed;
- merge commit: `5dce4b75b76380b4d668debd399bdca079f6b3dd`;
- SHA final pré-merge: `87c9a4e209eeb4a146d96cfaa26696fa8d159ca0`;
- próxima Issue: #45 — Fase 18 — isolamento de ambientes, previews seguros e separação de dados/segredos;
- ainda não existe branch funcional da Fase 18.

## Fase 17 — não repetir

- logger estruturado vendor-neutral em `src/lib/observability/`;
- correlation ID via `x-correlation-id` no Proxy/response;
- redaction explícita de secrets/tokens/PII comum;
- `Instrumentation.onRequestError` para erros server-side do Next;
- query string removida de path logado;
- `error.tsx` e `global-error.tsx` seguros;
- `toPublicError()` esconde detalhes de persistência/internals;
- workspace não mostra mais `Error.message` bruto;
- falhas relevantes de Auth emitem event codes sem logar credenciais;
- testes Vitest de observabilidade;
- ADR-007 e runbook operacional;
- nenhuma migration/DDL/write remoto na Fase 17.

## CI final da Fase 17

No SHA `87c9a4e209eeb4a146d96cfaa26696fa8d159ca0`:

- `CI` #219 — success;
- `Inventory Count Integration` #134 — success;
- `Business Transactions Integration` #117 — success.

O CI passou lint, typecheck, Vitest, build e todas as suítes PostgreSQL, incluindo backup/restore.

## Homologação Vercel

Preview técnico `dpl_DCRih5bSXPSY5ykJ4eSUzbmX8xm9` — `READY`.

Smoke sintético `/auth/callback` sem parâmetros reais confirmou:

- mensagem segura na UI;
- `x-correlation-id` na response;
- evento `auth.callback.failed` em Runtime Logs;
- nenhum token/e-mail/cookie/secret/dado real usado.

## Supabase remoto

Fase 17 somente read-only:

- projeto saudável;
- PostgreSQL 17;
- organização no plano Free;
- nenhuma migration/DDL/config/write;
- uma única instância de projeto conectada;
- zero Supabase branches no estado pós-Fase 17.

## Próxima frente — Issue #45

`REQ-PLAT-007 — Ambientes separados` é MUST e ainda não está demonstrado.

Fatos atuais:

- Vercel possui ambientes Preview e Production;
- o Preview funcional da Fase 17 possui configuração suficiente para inicializar o cliente Supabase;
- existe somente um projeto Supabase conectado e nenhuma branch;
- a organização está no plano Free;
- Supabase Branching/preview environments exige plano pago compatível na documentação vigente;
- não há política/runbook versionado de isolamento de env vars/dados/segredos.

Não afirmar que Preview já usa Production sem provar o valor efetivo das variáveis. A lacuna é a **ausência de isolamento comprovado/fail-closed**.

### Limites da Fase 18

- auditar nomes/targets/escopos de variáveis sem revelar valores;
- não copiar secrets para docs/issues/logs;
- não ativar recurso pago ou criar branch Supabase com custo sem autorização explícita;
- não copiar dados reais para Preview/Development;
- Production pode continuar usando o projeto hospedado atual;
- Development deve preferir ambiente local/efêmero com fixtures sintéticas;
- Preview deve usar backend isolado ou permanecer sem capacidade mutável contra Production até decisão de infraestrutura;
- guardrails devem falhar fechado quando o ambiente/configuração forem ambíguos;
- `SUPABASE_SECRET_KEY` não deve existir em Preview/Development sem rotina administrativa explicitamente isolada e aprovada;
- callbacks/App URL devem refletir o ambiente correto;
- não mexer em regras transacionais/RLS/RPC para compensar configuração de ambiente.

## Próxima ação exata

1. confirmar Issue #45 e o head atual da `main`;
2. confirmar que não existe branch/PR funcional equivalente antes de criar trabalho novo;
3. criar `agent/environment-isolation` a partir da `main` atual;
4. ler `AGENTS.md`, `START-HERE`, `CURRENT_STATE`, este `HANDOFF`, `NEXT_ACTION`, `requirements.md`, `.env.example`, runtime Supabase, ADR-006/ADR-007 e docs de Vercel/Supabase atuais;
5. inventariar a configuração real sem revelar valores:
   - targets Production/Preview/Development das variáveis Vercel relevantes;
   - presença/ausência de server-only secrets por ambiente;
   - projetos/branches Supabase disponíveis;
   - callbacks/domínios por ambiente;
6. documentar a matriz de ambientes e escolher estratégia reversível compatível com o plano atual antes de alterar configuração;
7. implementar identificação explícita de ambiente e guardrails fail-closed para configuração perigosa/ambígua;
8. garantir que Preview/Development não usem secret/admin path de Production;
9. criar testes para parsing de ambiente, validação de configuração, fail-closed e ausência de secret no client bundle;
10. validar Preview Vercel usando somente dados sintéticos ou operação não mutável, sem tocar em dados reais;
11. manter lint, typecheck, Vitest, build, backup/restore e workflows PostgreSQL verdes;
12. atualizar documentação operacional e continuidade antes do PR/merge.

## Regras que permanecem

- GitHub é fonte de verdade;
- secrets nunca no browser/Git/log;
- service role continua server-only;
- migrations continuam forward-only;
- nenhuma questão de negócio é resolvida por inferência;
- dados reais/planilhas reais continuam fora do GitHub e de Preview/Development;
- nenhuma operação destrutiva remota ou contratação sem necessidade/autorização explícita.