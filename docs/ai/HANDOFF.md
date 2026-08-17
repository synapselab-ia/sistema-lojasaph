# Handoff — Sistema Lojasaph

Este arquivo registra o contexto necessário para outro chat continuar sem depender desta conversa.

## Estado

A fundação de persistência da Fase 7 está implementada na branch `agent/persistence-foundation`, PR #20, e os jobs de aplicação e banco estão verdes.

A Issue #19 continua aberta porque a aplicação ainda usa adapters in-memory e nenhum projeto Supabase remoto está conectado.

## Não repetir

- não refazer a engenharia reversa;
- não reabrir defaults/ADRs sem evidência concreta;
- não editar saldo diretamente;
- não colocar segredos ou dados reais no GitHub;
- não chamar Supabase diretamente da UI;
- não liberar escrita direta nas tabelas do ledger via Data API;
- não tratar migrations feitas somente no Dashboard como fonte oficial.

## O sistema já possui

- aplicação Next.js/React/TypeScript strict;
- CI de aplicação;
- estrutura multi-negócio/unidade;
- produtos, fornecedores e preços;
- ledger de estoque, custo médio, transferências;
- lotes/validade/FEFO;
- inventário físico com detecção de contagem stale;
- adapters in-memory e UI demo;
- schema PostgreSQL versionado em `supabase/migrations/`;
- seed anonimizado;
- RLS por membership organizacional;
- testes de banco em PostgreSQL efêmero no CI.

## ADR de persistência

`docs/decisions/ADR-006-postgresql-supabase-persistence.md`:

- PostgreSQL é o modelo físico;
- Supabase é o provedor hospedado inicial preferido/revisável;
- repositories/adapters preservam desacoplamento;
- schema/migrations vivem no GitHub;
- RLS protege tabelas expostas;
- secret key é server-only;
- ledger não recebe escrita direta de cliente autenticado.

## Validação já concluída

PR #20 passou:

- npm ci;
- lint;
- typecheck;
- testes;
- build;
- bootstrap PostgreSQL/Auth;
- todas as migrations;
- seed demo;
- smoke tests de constraints e RLS.

## Próximo trabalho dentro da Issue #19

1. integrar PR #20;
2. conectar/criar projeto Supabase usando integração segura, sem copiar secrets para o chat/GitHub;
3. adicionar cliente Supabase na aplicação e variáveis documentadas em `.env.example`;
4. implementar adapters reais de leitura/cadastros;
5. implementar comandos transacionais de estoque server-side/RPC para ledger + saldo + lotes;
6. manter adapters in-memory nos testes;
7. homologar apenas com dados demo;
8. só depois planejar migração real.

## Dependência externa

Conectar o projeto remoto pode exigir instalar/autorizar a integração Supabase do ChatGPT ou outra conexão segura do usuário. Isso é a única dependência externa atual; schema e segurança local já estão versionados.

## Regra de eficiência

Continuar automaticamente enquanto houver trabalho local seguro. Interromper o usuário somente quando autorização/conexão externa for realmente necessária.

## Próxima ação

Executar `docs/ai/NEXT_ACTION.md`.