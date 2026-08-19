# Next Action — Sistema Lojasaph

## Contexto

A Fase 25 / Issue #63 está concluída e mergeada na `main` pelo PR #64.

Estado funcional final comprovado:

- head validado: `7040d7ec7faf356504ce3dd10f2dd4628ea69ca0`;
- `CI` #281 — success;
- `Inventory Count Integration` #167 — success;
- `Business Transactions Integration` #150 — success;
- merge commit funcional: `e345401fa80e98c6c3433fc98843c44c146a74fb`.

Supabase remoto:

- projeto `fhbvwyttikrbeaanatlr`, PostgreSQL 17;
- nenhuma migration/DDL na Fase 25;
- período gerencial validado read-only com boundaries inclusivos nos 2 lotes reais;
- `security_hardening.sql` permanece verde;
- auditoria RLS recente: 45/45 tabelas public com RLS, sem leak para authenticated sem membership.

A próxima lacuna objetiva é o acesso inicial ao Workspace persistente, registrada na Issue #65 — `Fase 26 — convite seguro do primeiro owner para homologação persistente`.

Estado remoto de acesso:

- 1 Organization ativa;
- 0 usuários Supabase Auth reais;
- 0 memberships ativos;
- 0 owners ativos.

O código já possui login, recuperação e bootstrap owner, mas o bootstrap exige uma conta Auth já existente e autenticada.

## Fazer agora

1. Confirmar estado real da Issue #65, `main`, branch `agent/bootstrap-owner-invite` (se já existir), PRs, CI e deployment Vercel atual.
2. Se a branch ainda não existir, criá-la a partir da `main` atual; não reutilizar branch do Dashboard.
3. Ler antes de editar:
   - `AGENTS.md`;
   - `docs/00-START-HERE.md`;
   - `docs/ai/CURRENT_STATE.md`;
   - `docs/ai/HANDOFF.md`;
   - este `NEXT_ACTION.md`;
   - `docs/ai/WORKFLOW.md`;
   - `docs/product/requirements.md` — `REQ-SEC-001` e `REQ-SEC-002` apenas para preservar os limites atuais;
   - `docs/modules/supabase-runtime.md`;
   - `docs/operations/environments.md`;
   - `.env.example`;
   - `src/app/login/page.tsx`;
   - `src/app/bootstrap/page.tsx`;
   - `src/lib/auth/actions.ts`;
   - `src/lib/auth/bootstrap.ts`;
   - callback/update-password Auth existentes;
   - `src/lib/supabase/server.ts` e runtime environment guardrails.
4. Consultar a documentação oficial atual do Supabase antes do patch, especialmente:
   - Auth Admin `inviteUserByEmail` ou mecanismo oficial equivalente;
   - comportamento de convite quando usuário já existe;
   - redirect/callback e estabelecimento de senha/sessão;
   - requisitos server-only da secret key.
5. Confirmar a lacuna antes de implementar:
   - `/login` não possui signup público;
   - `/bootstrap` depende de `LOJASAPH_BOOTSTRAP_OWNER_EMAIL` e sessão autenticada correspondente;
   - `bootstrapOwnerAction` cria membership/audit, mas não identidade Auth;
   - remoto ainda possui 0 Auth users/owners.
6. Implementar o menor fluxo seguro para criar a primeira identidade Auth por convite:
   - ação exclusivamente server-side;
   - destinatário lido somente de `LOJASAPH_BOOTSTRAP_OWNER_EMAIL`;
   - nenhum campo de e-mail arbitrário vindo do browser;
   - usar `createServerAdminSupabaseClient()` e API oficial Auth Admin;
   - não fazer SQL direto em `auth.users`;
   - não gerar/expor senha padrão.
7. Antes de enviar/reenviar convite, validar fail-closed:
   - backend/admin access permitido pelo runtime;
   - e-mail autorizado configurado;
   - Organization alvo resolvida com as mesmas regras existentes;
   - nenhum owner ativo já encerrou o bootstrap;
   - usuário já existente/convite repetido tratado de forma segura e compreensível.
8. Preservar `bootstrapOwnerAction` como única criação do membership owner + audit. Não duplicar role/membership dentro da ação de convite.
9. O callback deve levar o usuário ao fluxo seguro já existente para estabelecer sessão/senha e depois permitir concluir `/bootstrap`. Não criar callback alternativo inseguro.
10. Adicionar testes para guardrails extraídos/pure helpers, cobrindo pelo menos:
    - sem env => convite indisponível;
    - e-mail nunca vem do form;
    - owner existente => bootstrap encerrado;
    - resolução de Organization permanece fail-closed;
    - retry/usuário existente não cria membership prematuro;
    - redirect interno/callback seguro.
11. Atualizar documentação/runbook explicando:
    - configuração temporária das envs server-only;
    - convite do primeiro owner;
    - autenticação e conclusão do bootstrap;
    - verificação do audit/membership;
    - remoção/desabilitação das variáveis de bootstrap após conclusão;
    - nunca registrar senha/secret.
12. Preferir zero DDL. Não criar migration/RLS/policy/grant para esta fase salvo lacuna física real comprovada.
13. Rodar lint, typecheck, Vitest, production build e os três workflows aplicáveis.
14. Antes de qualquer convite real, homologar somente leitura no Supabase e confirmar 0 owner/0 membership e hardening intacto.
15. **Não enviar convite real enquanto o operador não tiver fornecido explicitamente o e-mail que deve ser autorizado.** Não inferir e-mail de GitHub/Vercel/conta conectada.
16. Após código/CI verde e e-mail explícito disponível, configurar somente as variáveis necessárias no target Production de forma server-only e executar um único convite controlado.
17. Deployment Vercel não é parte do loop de desenvolvimento. O último Production observado está no commit `a0ab92bbc6cff25527e684a0e37a87450aa265ca`; se a homologação real exigir o código da Fase 26, fazer deployment intencional somente no ponto final, sem reativar deploy por commit.
18. Confirmar no fim:
    - identidade Auth criada pelo fluxo oficial;
    - sessão pertence ao e-mail autorizado;
    - membership owner criado apenas pelo bootstrap existente;
    - audit `membership.bootstrap_owner` presente;
    - RLS efetivo no Workspace;
    - nenhuma credencial/secret exposta;
    - bootstrap desabilitado/removido após inicialização.
19. Abrir/atualizar PR, mergear quando os gates técnicos estiverem verdes e atualizar continuidade. Se a etapa de convite real depender do e-mail ainda não fornecido, não falsificar conclusão operacional: registrar claramente a pendência.

## Política de segurança

- signup público continua ausente/desabilitado;
- secret/admin client continua `server-only`;
- convite só pode usar o e-mail autorizado em env server-only;
- não aceitar e-mail do request/form como destino do primeiro-owner invite;
- não criar senha automática conhecida pelo operador/agente;
- não inserir diretamente em `auth.users`;
- não ampliar RLS/grants;
- `supabase/tests/security_hardening.sql` continua gate permanente;
- depois do primeiro owner, bootstrap deve ficar indisponível.

## Política de Vercel

- `vercel.json` mantém `git.deploymentEnabled=false`;
- CI é o gate principal;
- não fazer deployment rotineiro;
- não copiar valores de env/secrets para chat, logs ou GitHub;
- deployment Production somente quando necessário para homologar o fluxo completo.

## Não fazer

- não reabrir Fase 25/Issue #63 ou Fase 24/Issue #61;
- não alterar Dashboard como parte desta fase;
- não habilitar signup público;
- não criar usuário por SQL em `auth.users`;
- não inventar o e-mail do owner a partir de GitHub, Vercel ou metadados conectados;
- não pedir/guardar senha de produção no repositório;
- não colocar `SUPABASE_SECRET_KEY` no browser/NEXT_PUBLIC;
- não criar gestão geral de usuários/roles;
- não redefinir Q-022;
- não importar dados reais;
- não fazer sweep de advisors antigos sem causalidade;
- não reativar auto-deploy Vercel.

## Critério de conclusão da próxima fase

O sistema possui um caminho seguro, restrito e documentado para o primeiro e-mail explicitamente autorizado receber um convite oficial Supabase, estabelecer sua própria sessão/credencial e então concluir o `bootstrapOwnerAction` existente. Nenhum usuário arbitrário consegue acionar o fluxo, nenhum segredo/senha é exposto, membership/audit continuam centralizados no bootstrap, RLS permanece intacto e a rotina pode ser desabilitada após a inicialização.
