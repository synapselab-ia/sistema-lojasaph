# Next Action — Sistema Lojasaph

## Contexto

A Fase 26 / Issue #65 possui código técnico verde na `main`, incluindo a correção para o projeto Supabase Free real.

Estado comprovado:

- PR #66 — merged;
- PR #67 — merged;
- head técnico final: `24bba6ef3e80c6c3897d302ea7182fb368005029`;
- merge corretivo: `e26f5030b1fd7d7a12adfcae38667993b9382052`;
- CI #291 — success;
- nenhum DDL;
- remoto: 1 Organization ativa, 0 Auth users, 0 memberships, 0 owners;
- Issue #65 continua aberta somente para configuração/homologação operacional.

O projeto Supabase está no plano Free e foi criado em 2026-07-06. Como novos projetos Free usando SMTP padrão não podem customizar Auth Email Templates, o fluxo vigente usa o template padrão + redirect `/auth/invite` + handoff implícito protegido. Não voltar a exigir template customizado.

## Fazer agora

1. Confirmar `main`, Issue #65, branch `agent/bootstrap-owner-homologation`, PRs/CI, Supabase remoto e Production Vercel.
2. Ler:
   - `AGENTS.md`;
   - `docs/00-START-HERE.md`;
   - `docs/ai/CURRENT_STATE.md`;
   - `docs/ai/HANDOFF.md`;
   - este arquivo;
   - `docs/ai/WORKFLOW.md`;
   - `docs/operations/bootstrap-owner.md`;
   - `docs/operations/environments.md`.
3. Não reimplementar PR #66/#67. O fluxo técnico final é:
   - `inviteUserByEmail` server-only;
   - redirect `/auth/invite`;
   - fragmento implícito tratado somente no browser;
   - fragmento removido imediatamente da URL;
   - POST same-origin para `/auth/invite/session`;
   - access token + e-mail autorizado revalidados server-side;
   - sessão SSR em cookie;
   - usuário define a própria senha;
   - `bootstrapOwnerAction` cria membership + audit.
4. O operador já forneceu explicitamente o e-mail do primeiro owner na sessão que produziu este handoff, mas o valor não foi persistido no GitHub. Se o valor não estiver no contexto do chat atual, pedir que o operador o repita; nunca inferir de contas conectadas.
5. Ignorar qualquer senha que tenha sido oferecida no chat anterior. O agente não deve usar/conhecer a senha final; ela é definida pelo usuário via convite.
6. Antes de qualquer convite, revalidar read-only:
   - 1 Organization ativa;
   - 0 owner ativo;
   - identidade Auth autorizada ausente/pending/confirmed;
   - hardening/RLS intactos.
7. Os conectores atuais não expõem escrita de Supabase Auth URL/SMTP/Team nem Vercel env vars. Não fingir que foram configurados. O operador precisa executar as configurações abaixo no Dashboard.

## Configuração manual obrigatória antes do deploy

### Supabase

1. Authentication → URL Configuration:
   - confirmar Site URL canônica;
   - adicionar exatamente `https://sistema-lojasaph.vercel.app/auth/invite` à Redirect URL Allow List.
2. Organization Settings → Team:
   - confirmar que o e-mail autorizado é membro da Supabase Organization se for usar SMTP padrão;
   - se não for membro, configurar SMTP próprio antes do convite.
3. Não enviar convite para testar capacidade de entrega; o SMTP padrão tem restrição de destinatário/rate limit e uma tentativa pode criar identidade pending.
4. Não é necessário editar Auth Email Template para o fluxo padrão atual.

### Vercel — target Production somente

Configurar diretamente no Dashboard, sem copiar valores para chat/GitHub:

- `SUPABASE_SECRET_KEY` — secret/admin key server-only;
- `LOJASAPH_BOOTSTRAP_OWNER_EMAIL` — e-mail explicitamente autorizado;
- `LOJASAPH_BOOTSTRAP_INVITE_READY=true` — somente após a configuração Supabase acima estar comprovada.

`LOJASAPH_BOOTSTRAP_ORGANIZATION_ID` não é necessária no estado atual, pois existe exatamente uma Organization ativa.

Não configurar a flag antiga `LOJASAPH_BOOTSTRAP_INVITE_TEMPLATE_READY` em instalações novas.

## Depois que o operador disser que a configuração está pronta

1. Revalidar Supabase remoto antes da primeira escrita.
2. Confirmar Production Vercel ainda antigo; o último observado antes deste handoff era `dpl_Dx5wwzHUuc4hNG9D5sTGh6mqWSjB`, commit `a0ab92bbc6cff25527e684a0e37a87450aa265ca`.
3. Fazer **um único deployment Production intencional** da `main` atual. Não reativar Git auto-deploy.
4. Verificar `https://sistema-lojasaph.vercel.app/health`:
   - `environment=production`;
   - `supabaseAccess=allowed`;
   - `adminAccess=allowed`.
5. Abrir `/bootstrap` e confirmar `ready` sem expor o e-mail na UI.
6. Enviar exatamente um convite.
7. O destinatário deve abrir o e-mail e definir a própria senha. Não pedir a senha ao usuário.
8. Após a etapa humana, concluir `Criar vínculo owner inicial` em `/bootstrap`.
9. Verificar remotamente:
   - exatamente 1 owner esperado e ativo;
   - nenhum membership duplicado;
   - audit `membership.bootstrap_owner` correspondente;
   - RLS efetivo no Workspace.
10. Confirmar login normal sem registrar credenciais.
11. Remover/desabilitar no Vercel as variáveis temporárias de bootstrap e o secret administrativo se nenhuma outra rotina aprovada depender dele.
12. Como environment variables de um deployment já criado podem permanecer no runtime até novo deployment, avaliar a forma menos custosa de invalidar a credencial após o bootstrap. Prioridade: não deixar secret administrativo válido desnecessariamente. Registrar exatamente a ação tomada sem expor valor.
13. Confirmar `/bootstrap` encerrado/fail-closed e fechar Issue #65 somente depois de membership + audit + RLS + desativação operacional.
14. Depois de fechar #65, auditar requirements/MUST restantes e criar a próxima Issue objetiva; não inventar nova fase antes disso.

## Segurança obrigatória

- signup público continua ausente;
- e-mail autorizado nunca vem do browser;
- nenhum INSERT/UPDATE direto em `auth.users`;
- nenhuma senha padrão/temporária conhecida pelo agente;
- admin key somente server-side;
- `bootstrapOwnerAction` é a única criação de membership owner + audit;
- não ampliar RLS/grants;
- não versionar PII/secret/token/senha;
- `supabase/tests/security_hardening.sql` continua gate permanente.

## CI

CI #291 é o gate técnico final do PR #67. Os workflows Inventory Count e Business Transactions não se aplicam ao diff de Auth por seus `paths`; não dispará-los artificialmente.

## Vercel

- `vercel.json` continua `git.deploymentEnabled=false`;
- nenhum deploy foi feito nesta homologação até agora;
- não fazer deploy antes de redirect + entrega + envs estarem prontos;
- não gastar quota com tentativas intermediárias.

## Não fazer

- não refazer PR #66/#67;
- não voltar a exigir template customizado no Supabase Free atual;
- não usar a senha oferecida anteriormente;
- não persistir o e-mail autorizado em GitHub;
- não enviar convite antes de configurar redirect/env/entrega;
- não habilitar signup público;
- não criar usuário Auth por SQL;
- não expor secret/token;
- não reativar auto-deploy;
- não importar dados reais;
- não inferir Q-001..Q-025.

## Critério de conclusão

A Issue #65 só termina quando o e-mail explicitamente autorizado recebeu o convite oficial Supabase, definiu sua própria credencial, concluiu o `bootstrapOwnerAction`, possui membership/audit corretos, acessa o Workspace sob RLS e o bootstrap/admin secret temporário foi desativado de forma comprovada.
