# Current State — Sistema Lojasaph

Última atualização: 2026-08-17

## Fase atual

Fase 3 — fundação técnica da aplicação: implementada na branch `agent/technical-foundation` e validada por CI. PR #12 está em fechamento para integração.

## Estado do GitHub

- Repositório: `synapselab-ia/sistema-lojasaph`
- Branch principal: `main`
- Issue atual: #10 — Fase 3 — Fundação técnica da aplicação
- Branch atual: `agent/technical-foundation`
- PR atual: #12 — Fase 3 — fundação técnica da aplicação
- Próxima Issue já criada: #13 — Fase 4 — Cadastros base e primeiro fluxo funcional
- Supabase ainda não foi escolhido nem configurado.

## Histórico concluído

### Fase 0 — governança

Criados `AGENTS.md`, `START-HERE`, workflow, handoff, current state e NEXT_ACTION.

### Fase 1 — engenharia reversa

As seis planilhas foram analisadas e transformadas em documentação de campos, regras, requisitos, dúvidas e migração sem versionar os arquivos reais.

### Fase 2 — modelo lógico

Domínio, modelo lógico, ERD e ADR-001 a ADR-005 foram consolidados e integrados à `main` pelo PR #11.

### Fase 3 — fundação técnica

Implementado:

- Next.js 16.2.12 + React 19.2.8;
- TypeScript strict;
- Tailwind CSS 4;
- ESLint 9;
- Vitest;
- `package-lock.json` versionado;
- GitHub Actions com instalação reprodutível por `npm ci`;
- shell inicial responsivo;
- endpoint `GET /health`;
- `DomainError`, `EntityId` e `Money`;
- primeiro `StockItem`;
- contrato `StockItemRepository`;
- adapter `InMemoryStockItemRepository`;
- testes unitários iniciais;
- `.env.example` sem segredos;
- documentação da fundação e Definition of Done.

## Validação da Fase 3

O GitHub Actions validou com sucesso:

1. instalação de dependências;
2. lint;
3. typecheck;
4. testes unitários;
5. build de produção.

Após gerar e versionar o lockfile, o CI foi ajustado para `npm ci`, garantindo instalação reprodutível.

## Decisões estruturais vigentes

1. GitHub é a fonte oficial de verdade.
2. O sistema é multi-negócio e multi-unidade.
3. Setor e local de estoque são conceitos distintos.
4. `StockItem` e `SalesItem` são conceitos distintos.
5. Saldo de estoque é derivado do ledger de movimentos confirmados.
6. Movimento confirmado é corrigido por reversão, não exclusão silenciosa.
7. Transferência possui despacho e recebimento separados.
8. Empréstimo controla quantidade pendente de retorno.
9. Custeio gerencial padrão é custo médio ponderado móvel, preservando snapshots/lotes.
10. Financeiro separa PayableDocument → Installment → Payment e suporta múltiplos pagamentos por parcela.
11. Caixa usa `CashSession` e totais por forma de pagamento.
12. Domínio não depende de Next.js nem de banco específico.
13. Persistência é acessada por repositories/adapters; adapters in-memory são o default de desenvolvimento atual.
14. Operações críticas devem ser idempotentes, transacionais e auditáveis.
15. Supabase permanece decisão futura.

## Próxima ação

Após integrar o PR #12 e encerrar a Issue #10, iniciar a Issue #13 — Cadastros base e primeiro fluxo funcional — em branch própria criada a partir da `main` atualizada.

Consulte `docs/ai/NEXT_ACTION.md`.

## Regra para o próximo chat

Ler `AGENTS.md`, `docs/00-START-HERE.md`, este arquivo, `HANDOFF.md`, `NEXT_ACTION.md`, `WORKFLOW.md`, os ADRs e conferir Issue/branch/PR reais antes de agir.