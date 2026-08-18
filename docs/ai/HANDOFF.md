# Handoff — Sistema Lojasaph

## Estado

Fase 15 — staging de importação, dry run e reconciliação rastreável — **concluída e integrada**.

- PR #40 — merged;
- Issue #39 — closed/completed;
- merge commit: `88be9da74b9c3611f533e388c5387ac0f9906d23`;
- SHA final pré-merge: `3ef9e595249885d0e1f0b1567874037377e01aab`;
- próxima Issue: #41 — Fase 16 — backup automático, restauração testada e recuperação operacional;
- ainda não existe branch funcional da Fase 16.

## Fase 15 — não repetir

- `import_batches` e `import_rows` criados e protegidos por RLS;
- dry run sem command de aplicação nas tabelas operacionais;
- rastreabilidade por fonte/hash/aba/linha/payload;
- idempotência determinística;
- relatório com aceitos, duplicados, warnings, rejeitados e mapeamentos pendentes;
- matching apenas por nome canônico exato/alias explícito;
- questões abertas permanecem pendentes, sem inferência;
- testes Vitest/PostgreSQL e CI integrados;
- migrations aplicadas no remoto;
- homologação remota sintética aprovada;
- zero resíduos após rollback;
- advisors executados e dois novos avisos de FK sem índice corrigidos;
- documentação atualizada.

Não reaplicar migrations da Fase 15.

## CI final da Fase 15

No SHA `3ef9e595249885d0e1f0b1567874037377e01aab`:

- `CI` #192 — success;
- `Inventory Count Integration` #115 — success;
- `Business Transactions Integration` #98 — success.

## Supabase remoto

Já aplicado — **não reaplicar**:

- `20260818180723 / import_staging`;
- `20260818180738 / import_staging_finalize_fix`;
- `20260818181051 / import_staging_indexes`.

Resultado da homologação: `import staging tests passed`.

Nenhum dado real foi importado e nenhum cutover foi executado.

## Próxima frente — Issue #41

`REQ-PLAT-005 — Backup e restauração` é MUST antes de produção e permanece incompleto. A Issue #41 foi criada somente depois do fechamento da Fase 15.

### Limites da Fase 16

- verificar documentação/capacidades atuais do Supabase antes de escolher mecanismo;
- não executar restore destrutivo no projeto remoto ativo;
- provar recuperação com fixtures sintéticos em ambiente seguro/efêmero;
- não confundir replay de migrations com backup de dados;
- não versionar dump real, credenciais ou secrets;
- não inventar RPO/RTO de negócio;
- documentar dependências do plano/provedor quando não puderem ser testadas automaticamente;
- manter `REQ-PLAT-006` observabilidade fora desta entrega para evitar mistura de escopo.

## Próxima ação exata

1. confirmar estado da Issue #41 e `main`;
2. criar branch `agent/backup-restore` a partir da `main` atual;
3. ler `requirements.md`, documentação de persistência/operação e ADRs relacionados;
4. verificar a documentação oficial vigente do Supabase e as capacidades reais do projeto/plano para backup, PITR e restore;
5. inspecionar CI, migrations, seed e testes PostgreSQL existentes;
6. definir estratégia em camadas: migrations/schema, backup de dados, retenção/recuperação gerenciada quando disponível e restore de contingência;
7. criar runbook versionado de backup/restauração sem secrets;
8. criar prova automatizada de dump/restore PostgreSQL em ambiente efêmero usando dados sintéticos e checks de integridade/RLS;
9. não restaurar por cima do Supabase remoto ativo;
10. rodar lint/typecheck/test/build e suítes PostgreSQL afetadas;
11. usar apenas homologações remotas não destrutivas, se necessárias e suportadas;
12. atualizar documentação/continuidade antes do PR/merge.

## Regras que permanecem

- GitHub é fonte de verdade;
- migrations são forward-only e versionadas;
- service role nunca no browser;
- dados reais/planilhas reais continuam fora do GitHub;
- Q-001 a Q-025 não são respondidas por inferência;
- nenhuma operação destrutiva remota sem necessidade e proteção explícita.