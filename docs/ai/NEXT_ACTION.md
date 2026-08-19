# Next Action — Sistema Lojasaph

## Contexto

A implementação técnica da Fase 26 / Issue #65 foi concluída no PR #66 e mergeada na `main`.

Estado técnico comprovado:

- head validado: `516562485dc1a2561add033cf5db1be4cac14ce5`;
- merge commit: `677daa83b9e312199d06de4d85f46a3d6a3eb32c`;
- CI #286 — success, incluindo lint, typecheck, Vitest, build, migrations, backup/restore, RLS/hardening e suítes PostgreSQL;
- nenhum DDL na Fase 26;
- nenhum convite real ou usuário real criado;
- Supabase remoto: 1 Organization ativa, 0 Auth users, 0 memberships, 0 owners;
- Issue #65 permanece aberta somente para homologação operacional.

O fluxo técnico está documentado em `docs/operations/bootstrap-owner.md`. Não refazer a implementação do convite.

## Fazer agora

1. Confirmar estado real de `main`, Issue #65, branch ativa, PRs, CI, Supabase e deployment Vercel.
2. Ler antes de agir:
   - `AGENTS.md`;
   - `docs/00-START-HERE.md`;
   - `docs/ai/CURRENT_STATE.md`;
   - `docs/ai/HANDOFF.md`;
   - este `NEXT_ACTION.md`;
   - `docs/ai/WORKFLOW.md`;
   - `docs/operations/bootstrap-owner.md`;
   - `docs/operations/environments.md`;
   - `.env.example`;
   - `src/lib/auth/bootstrap.ts`;
   - `src/app/bootstrap/page.tsx`;
   - `/auth/callback` e atualização de senha.
3. Confirmar que o código técnico do PR #66 já está na `main`; não reimplementar helpers, action, callback ou runbook salvo regressão concreta.
4. Verificar se o operador **forneceu explicitamente no chat o e-mail que deve ser o primeiro owner**.
5. Se o e-mail NÃO foi fornecido explicitamente:
   - não inferir endereço de GitHub, Vercel, conta conectada, commits ou metadados;
   - não criar Auth user;
   - não enviar convite;
   - não alterar envs de Production;
   - não fazer deployment somente para avançar artificialmente;
   - manter Issue #65 aberta e registrar que a próxima ação depende do e-mail explícito.
6. Se o e-mail FOI fornecido explicitamente, revalidar remotamente antes de qualquer mutação:
   - Organization alvo ativa;
   - ausência de owner ativo;
   - estado da identidade Auth para o e-mail autorizado;
   - hardening/isolamento intactos.
7. Descobrir e usar os conectores disponíveis antes de afirmar que alguma configuração precisa ser manual. Para Supabase Auth/Vercel, verificar as ações expostas pelo plugin conectado.
8. Preparar a configuração temporária de Production conforme o runbook:
   - `LOJASAPH_BOOTSTRAP_OWNER_EMAIL` = e-mail explícito;
   - `LOJASAPH_BOOTSTRAP_ORGANIZATION_ID` somente se necessário;
   - `SUPABASE_SECRET_KEY` exclusivamente server-only e somente se ainda necessária no target;
   - callback canônico `/auth/callback` na Redirect URL Allow List;
   - template hospedado `Invite user` com `TokenHash`, `type=invite` e continuação segura para `/auth/atualizar-senha?next=/bootstrap`;
   - confirmar capacidade de entrega do e-mail;
   - definir `LOJASAPH_BOOTSTRAP_INVITE_TEMPLATE_READY=true` somente depois das verificações anteriores.
9. Verificar o deployment Production da Vercel. O último observado antes deste handoff estava no commit `a0ab92bbc6cff25527e684a0e37a87450aa265ca`, portanto possivelmente não contém a Fase 26.
10. Se o Production ainda estiver antigo e todas as pré-condições do passo 8 estiverem prontas, fazer **um único deployment Production intencional**. Não reativar Git auto-deploy e não fazer deploys intermediários.
11. Abrir `/bootstrap` no Production da Fase 26 e confirmar o estado `ready` sem expor o e-mail na UI.
12. Enviar exatamente um convite controlado. Não criar usuário por SQL nem usar senha padrão.
13. O destinatário deve abrir o convite e definir a própria senha. Não pedir nem conhecer essa senha.
14. Após a etapa humana do convite, confirmar sessão do e-mail autorizado e concluir `bootstrapOwnerAction`.
15. Verificar no Supabase:
   - exatamente o membership owner esperado e ativo;
   - audit `membership.bootstrap_owner` correspondente;
   - nenhum membership duplicado;
   - RLS efetivo no Workspace.
16. Confirmar login normal no Workspace com a credencial definida pelo próprio usuário, sem registrar senha/token.
17. Encerrar o bootstrap removendo/desabilitando as configurações temporárias conforme o runbook, incluindo e-mail/readiness e secret administrativo se não houver outra necessidade aprovada.
18. Confirmar `/bootstrap` encerrado/fail-closed e ausência de segredo exposto.
19. Somente após tudo acima, fechar Issue #65 e atualizar CURRENT_STATE/HANDOFF/NEXT_ACTION para a próxima lacuna objetiva.

## Segurança obrigatória

- signup público continua ausente;
- destinatário do primeiro convite nunca vem do browser;
- e-mail só pode ser o fornecido explicitamente pelo operador;
- nenhuma senha padrão/temporária conhecida pelo agente;
- nenhum INSERT/UPDATE direto em `auth.users`;
- admin key somente server-side;
- `bootstrapOwnerAction` continua única criação do membership owner + audit;
- não ampliar RLS/grants;
- `supabase/tests/security_hardening.sql` continua gate permanente.

## CI

O job de banco do CI foi estabilizado no PR #66 após um bloqueio reproduzível do mirror Azure. Não desfazer a correção que limita o update ao PGDG com retries/timeouts sem evidência concreta.

`Inventory Count Integration` e `Business Transactions Integration` possuem filtros `paths`; não dispará-los artificialmente quando o diff não toca seus escopos.

## Vercel

- `git.deploymentEnabled=false` permanece vigente;
- não fazer deploy rotineiro;
- Production deploy apenas uma vez, no ponto de homologação real, depois de e-mail/configuração prontos.

## Não fazer

- não refazer PR #66;
- não fechar #65 antes de convite + membership + audit + RLS + desativação do bootstrap;
- não inferir o e-mail do owner;
- não usar o e-mail de conta GitHub/Vercel como autorização implícita;
- não habilitar signup público;
- não criar usuário Auth por SQL;
- não expor secrets/tokens/senhas;
- não reativar auto-deploy Vercel;
- não importar dados reais;
- não inferir Q-001..Q-025.

## Critério de conclusão

A Issue #65 só está concluída quando um e-mail explicitamente autorizado recebeu o convite oficial Supabase, definiu sua própria credencial, concluiu o `bootstrapOwnerAction`, possui membership/audit corretos, acessa o Workspace sob RLS e as configurações temporárias de bootstrap foram desabilitadas.
