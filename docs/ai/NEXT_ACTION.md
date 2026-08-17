# Next Action — Sistema Lojasaph

## Contexto

- Fase 7 / Issue #19 está em andamento.
- PR #20 contém a fundação PostgreSQL/Supabase.
- CI de aplicação e banco está verde.
- Schema, RLS, seed demo e smoke tests já estão versionados.
- A aplicação ainda usa adapters in-memory.
- Nenhum projeto Supabase remoto está conectado ainda.

## Objetivo atual

Integrar a fundação de persistência e ligar a aplicação a um projeto Supabase de forma segura, preservando repositories/adapters e as invariantes do ledger.

## Fazer agora

1. Confirmar CI final do PR #20 após os commits documentais.
2. Integrar PR #20 na `main`.
3. Manter a Issue #19 aberta.
4. Usar uma integração segura do Supabase para criar/conectar o projeto remoto; não pedir ao usuário para colar secret key no chat se houver conector/plugin disponível.
5. Adicionar `@supabase/supabase-js` com lockfile reproduzível.
6. Criar factories cliente/server separadas:
   - cliente com URL + publishable key;
   - servidor confiável com credencial server-only somente quando necessária.
7. Implementar adapters reais começando por leitura/cadastros, sem alterar as interfaces de domínio.
8. Não conceder escrita direta cliente-side no ledger.
9. Implementar operações críticas de estoque por comando server-side/RPC transacional que atualize movimento, lote e saldo atomicamente.
10. Manter adapters in-memory para testes unitários.
11. Aplicar migrations ao projeto remoto pelo fluxo versionado e validar RLS com usuários demo.
12. Não importar dados reais ainda.
13. Rodar CI e atualizar CURRENT_STATE, HANDOFF e NEXT_ACTION.

## Se a conexão Supabase ainda não estiver autorizada

Pare apenas na dependência externa e peça ao usuário para instalar/autorizar a integração Supabase. Não solicitar secrets em texto.

## Não fazer

- Não versionar URL/chaves reais em `.env.example`.
- Não colocar secret key em `NEXT_PUBLIC_*`.
- Não usar secret/service role no navegador.
- Não remover RLS para "fazer funcionar".
- Não chamar tabelas diretamente da UI ignorando repositories.
- Não migrar dados do cliente antes da homologação demo.

## Critério de conclusão da Issue #19

A aplicação deve conseguir usar adapters reais contra o projeto Supabase para cadastros/leitura e executar o primeiro comando transacional de estoque de forma segura, com migrations/RLS reproduzíveis e CI verde.