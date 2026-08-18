# Next Action — Sistema Lojasaph

## Contexto

Fase 15 — staging de importação, dry run e reconciliação rastreável — foi encerrada com sucesso.

Estado real:

- PR #40 — merged em `main`;
- Issue #39 — closed/completed;
- merge commit: `88be9da74b9c3611f533e388c5387ac0f9906d23`;
- SHA final pré-merge `3ef9e595249885d0e1f0b1567874037377e01aab` teve `CI` #192, `Inventory Count Integration` #115 e `Business Transactions Integration` #98 verdes;
- migrations remotas da Fase 15 já aplicadas e homologadas;
- homologação `import staging tests passed`, com zero resíduos após rollback;
- nenhuma planilha real foi importada e nenhum cutover foi executado;
- nova Issue criada: #41 — `Fase 16 — backup automático, restauração testada e recuperação operacional`;
- nenhuma branch funcional da Fase 16 foi criada ainda.

## Fazer agora

1. Conferir a Issue #41 e o estado atual da `main` antes de alterar código.
2. Criar a branch `agent/backup-restore` a partir da `main` atual.
3. Ler antes da implementação:
   - `docs/product/requirements.md`, especialmente `REQ-PLAT-005`;
   - documentação de persistência/Supabase e operação;
   - ADRs relacionados;
   - CI, migrations, seed e testes PostgreSQL atuais.
4. Verificar a documentação oficial vigente do Supabase e as capacidades reais do projeto/plano para backups automáticos, PITR e restauração. Não assumir disponibilidade por memória.
5. Definir uma estratégia reproduzível em camadas:
   - migrations versionadas como fonte do schema;
   - backup de dados separado do replay de migrations;
   - retenção/recuperação gerenciada pelo provedor quando disponível;
   - restore de contingência verificável.
6. Criar runbook versionado de backup/restauração sem dados reais, credenciais ou secrets.
7. Criar prova automatizada de recuperação PostgreSQL em ambiente efêmero usando somente fixtures sintéticos:
   - gerar backup temporário;
   - restaurar em banco limpo;
   - validar schema/dados esperados;
   - validar constraints/RLS/checks essenciais;
   - destruir artefatos temporários ao final.
8. Não executar restore destrutivo sobre o Supabase remoto ativo.
9. Não inventar RPO/RTO de negócio. Se não estiverem documentados, manter explicitamente pendentes.
10. Rodar lint, typecheck, Vitest, build e suítes PostgreSQL relevantes; manter workflows existentes verdes.
11. Se houver verificação remota, limitar a ações não destrutivas e suportadas pelo ambiente atual.
12. Atualizar documentação operacional, `CURRENT_STATE.md`, `HANDOFF.md` e este arquivo antes do fechamento do PR/Issue.

## Não fazer agora

- não reaplicar `scoped_permissions` nem migrations da Fase 15;
- não importar as seis planilhas reais;
- não executar cutover;
- não restaurar por cima do projeto Supabase remoto ativo;
- não versionar dumps reais, secrets ou credenciais;
- não resolver Q-001 a Q-025 por inferência;
- não misturar observabilidade completa (`REQ-PLAT-006`) nesta mesma fase;
- não tratar migration replay como substituto de backup de dados.

## Critério para encerrar a Fase 16

O projeto deve possuir estratégia e runbook de backup/restauração documentados, uma prova automatizada de recuperação com dados sintéticos em ambiente seguro, checks de integridade pós-restore e clareza sobre as capacidades/limitações do Supabase atual, sem executar operação destrutiva no ambiente remoto ativo.