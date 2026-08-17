# Next Action — Sistema Lojasaph

## Contexto

- Fase 1 concluída e integrada.
- Validação P0 resolvida para fins de arquitetura por defaults profissionais/revisáveis em `docs/decisions/ADR-001-organizational-and-p0-defaults.md`.
- Issue seguinte: #8 — Fase 2 — Modelo de domínio, dados e ADRs fundamentais.

## Objetivo atual

Executar a Fase 2 e transformar a documentação das planilhas em um modelo de domínio e dados lógico consolidado, ainda independente de Supabase.

## Fazer agora

1. Criar uma branch dedicada para a Issue #8 a partir da `main` atualizada.
2. Ler `ADR-001`, `business-rules.md`, `requirements.md` e `preliminary-domain-model.md`.
3. Formalizar a hierarquia `Organization → Business → Unit → Sector/StockLocation`.
4. Consolidar entidades, relações, cardinalidades, estados e invariantes dos módulos de catálogo, estoque, fornecedores, financeiro e caixa.
5. Criar um ERD/modelo lógico documentado.
6. Registrar ADRs adicionais para saldo de estoque, custeio e demais decisões estruturais.
7. Tratar Q-001 a Q-008 como defaults revisáveis: só reabrir se surgir evidência concreta do cliente que contradiga o ADR.
8. Atualizar `CURRENT_STATE.md`, `HANDOFF.md` e este arquivo ao concluir a etapa.

## Não fazer ainda

- Não criar Supabase.
- Não criar migrations de produção.
- Não implementar telas funcionais.
- Não migrar dados reais.
- Não implementar PDV completo.

## Regra de eficiência

Quando uma dúvida puder ser resolvida com default profissional, configurável e reversível, não bloquear o projeto. Pedir validação ao usuário apenas quando uma escolha errada puder provocar retrabalho estrutural relevante.

## Critério de conclusão

A Fase 2 termina quando existir um modelo lógico coerente e rastreável, suficiente para iniciar a fundação técnica da aplicação e avaliar o banco sem usar as planilhas como especificação direta.