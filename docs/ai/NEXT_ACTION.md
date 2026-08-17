# Next Action — Sistema Lojasaph

## Contexto

- Fase 2 concluída na branch `agent/domain-model`.
- Próxima Issue: #10 — Fase 3 — Fundação técnica da aplicação.

## Objetivo atual

Após integrar a Fase 2, criar a fundação executável do Sistema Lojasaph sem acoplar o projeto a Supabase ou outro banco definitivo.

## Fazer agora

1. Integrar a branch/PR da Fase 2 na `main` e encerrar a Issue #8.
2. Criar branch dedicada à Issue #10 a partir da `main` atualizada.
3. Ler `domain-model.md`, `data-model.md`, `erd.md` e ADR-001 a ADR-005.
4. Inicializar Next.js + React + TypeScript estrito com uma versão estável atual e registrar as versões escolhidas.
5. Configurar Tailwind e uma estrutura responsiva mínima.
6. Criar arquitetura modular em `src/` separando app, domain, services/use-cases, repositories/adapters, components e lib.
7. Criar contratos/interfaces iniciais de repositories e adapters in-memory/fixtures; não criar banco real ainda.
8. Configurar validação, tratamento de erros e convenções de IDs/datas/dinheiro.
9. Configurar lint, typecheck, testes e build.
10. Configurar GitHub Actions para executar as validações em PRs.
11. Criar `.env.example` sem segredos e atualizar README com comandos de desenvolvimento.
12. Criar shell inicial da aplicação/health-dev status apenas para provar a fundação; não implementar módulos completos.
13. Executar todas as validações e atualizar `CURRENT_STATE.md`, `HANDOFF.md` e este arquivo.

## Não fazer ainda

- Não criar Supabase.
- Não criar migrations de produção.
- Não implementar autenticação real.
- Não migrar dados reais.
- Não implementar PDV completo.
- Não desenvolver vários módulos ao mesmo tempo.

## Critério de conclusão

A Fase 3 termina quando existir uma aplicação executável, tipada, testável e validada por CI, com arquitetura modular e persistência desacoplada, pronta para receber o primeiro fluxo vertical funcional.

## Regra de eficiência

Não bloquear o projeto por decisões facilmente reversíveis. Registrar decisões técnicas relevantes no repositório e preferir a solução mais simples que preserve as invariantes do domínio.