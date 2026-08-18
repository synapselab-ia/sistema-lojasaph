# Next Action — Sistema Lojasaph

## Contexto

Fase 17 — observabilidade, logs estruturados e rastreabilidade de erros — foi encerrada com sucesso.

Estado real:

- PR #44 — merged em `main`;
- Issue #43 — closed/completed;
- merge commit: `5dce4b75b76380b4d668debd399bdca079f6b3dd`;
- SHA final pré-merge `87c9a4e209eeb4a146d96cfaa26696fa8d159ca0` teve `CI` #219, `Inventory Count Integration` #134 e `Business Transactions Integration` #117 verdes;
- preview técnico Vercel `dpl_DCRih5bSXPSY5ykJ4eSUzbmX8xm9` ficou `READY` e o smoke sintético registrou `auth.callback.failed` com correlation ID;
- nenhuma migration, DDL, configuração ou write da Fase 17 foi executado no Supabase remoto;
- nova Issue criada: #45 — `Fase 18 — isolamento de ambientes, previews seguros e separação de dados/segredos`;
- nenhuma branch funcional da Fase 18 foi criada ainda.

## Fazer agora

1. Conferir a Issue #45 e o estado atual da `main` antes de alterar código/configuração.
2. Confirmar que não existe branch ou PR funcional equivalente.
3. Criar a branch `agent/environment-isolation` a partir da `main` atual.
4. Ler antes da implementação:
   - `docs/product/requirements.md`, especialmente `REQ-PLAT-007` e `REQ-SEC-004`;
   - `.env.example`;
   - `docs/modules/supabase-runtime.md`;
   - `ADR-006` e `ADR-007`;
   - documentação operacional relevante;
   - documentação oficial vigente da Vercel e Supabase sobre environments, environment variables, branching e custos.
5. Inventariar **sem revelar valores secretos**:
   - quais variáveis existem/estão direcionadas para Production, Preview e Development na Vercel;
   - quais secrets server-only existem em cada target;
   - `NEXT_PUBLIC_APP_URL`/callbacks por ambiente;
   - projetos e branches Supabase disponíveis;
   - se existe qualquer configuração que possa fazer Preview/Development operar contra identidade/backend de Production.
6. Não inferir compartilhamento somente pelo nome das variáveis. Registrar evidência concreta e, quando não for possível verificar um valor com segurança, tratar como configuração não comprovada e falhar fechado.
7. Definir estratégia compatível com o plano atual antes de criar infraestrutura:
   - Production: projeto hospedado atual;
   - Development: preferencialmente Supabase/PostgreSQL local ou efêmero com fixtures sintéticas;
   - Preview: backend isolado quando houver capacidade aprovada, ou modo deliberadamente sem mutação contra Production enquanto não houver ambiente hospedado separado.
8. **Não** ativar Supabase Pro/Branching, criar recurso com custo ou copiar dados reais sem autorização explícita.
9. Implementar somente a fundação da Issue #45:
   - identificação explícita de ambiente;
   - validação centralizada da configuração;
   - guardrails fail-closed para ambiente/configuração perigosa ou ambígua;
   - bloqueio de secret/admin path em Preview/Development salvo exceção explícita e isolada;
   - callbacks/URLs coerentes com o ambiente;
   - política documentada de seed/fixtures sintéticas.
10. Criar testes para parsing/identificação de ambiente, matriz permitida de configuração, fail-closed e ausência de server-only secrets no client bundle.
11. Validar Preview Vercel somente com dados sintéticos ou ações não mutáveis e provar que não há mutação inadvertida de Production.
12. Rodar lint, typecheck, Vitest, build e todos os workflows PostgreSQL existentes.
13. Atualizar documentação operacional, `CURRENT_STATE.md`, `HANDOFF.md` e este arquivo antes do fechamento do PR/Issue.

## Não fazer agora

- não reimplementar observabilidade da Fase 17;
- não reabrir backup/restore da Fase 16;
- não contratar/ativar Supabase Pro/Branching ou outro recurso pago por inferência;
- não criar/copy snapshot com dados reais em Preview/Development;
- não expor valores de env vars/secrets em GitHub, logs ou docs;
- não usar `SUPABASE_SECRET_KEY` em Preview/Development sem necessidade explícita, isolamento e aprovação;
- não alterar RLS/RPC/transações homologadas para contornar ambiente mal configurado;
- não importar planilhas reais/cutover;
- não responder Q-001 a Q-025 por inferência.

## Critério para encerrar a Fase 18

Development, Preview e Production devem possuir política/configuração reproduzível e versionada, com guardrails fail-closed e validação automatizada. Preview/Development não podem operar inadvertidamente sobre dados ou credenciais privilegiadas de Production, e a evidência deve ser obtida sem expor secrets, copiar dados reais ou contratar infraestrutura sem autorização.