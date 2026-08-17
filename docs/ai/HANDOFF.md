# Handoff — Sistema Lojasaph

## Estado

PR #27 conclui a Issue #24 e a Fase 9. O núcleo de estoque deixa de depender da demonstração in-memory para entrada, retirada, transferência e inventário.

Próxima frente: Issue #28 — Fase 10 — Compras, pedidos e recebimento operacional.

## Não repetir

- engenharia reversa/modelagem já consolidada;
- Auth SSR/membership;
- fundação Supabase/RLS;
- entrada, retirada, transferência ou inventário já persistidos;
- edição direta de saldo;
- write direto do cliente no ledger;
- criação de lote/validade desconhecidos.

## Inventário — regras que devem permanecer

- snapshot captura quantidade + custo médio;
- todas as linhas devem estar contadas;
- stale aborta tudo;
- diferença zero não gera movimento;
- ajuste negativo rastreado consome FEFO;
- positivo rastreado sem lote explícito é bloqueado;
- positivo sem custo-base exige custo;
- confirmed é imutável;
- cancelled não cria ajuste e libera o local;
- commands são idempotentes e auditados.

## Validação

CI e homologação remota com rollback cobrem os fluxos críticos. Advisors mantêm apenas warnings intencionais dos command RPCs `SECURITY DEFINER` e INFO de performance já conhecido.

## Próximo trabalho

Ler Issue #28, `docs/modules/inventory.md`, fornecedores/catálogo e ADRs relevantes. Compras deve reutilizar o estoque real no recebimento; não duplicar Supplier/SupplierItem nem editar saldo diretamente.
