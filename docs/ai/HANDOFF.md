# Handoff — Sistema Lojasaph

Este arquivo registra contexto operacional para o próximo chat. `CURRENT_STATE.md` descreve o estado; `NEXT_ACTION.md` determina o trabalho imediato.

## Estado do handoff

Fase 1 concluída. Validação P0 convertida em defaults profissionais/revisáveis para liberar a Fase 2.

## Contexto que não pode ser perdido

As seis planilhas já foram analisadas. Não reiniciar a engenharia reversa do zero salvo se surgirem novos arquivos ou houver necessidade específica de verificação.

O usuário autorizou adotar a interpretação mais provável quando a solução puder permanecer configurável e reversível. Não transformar essas interpretações em afirmações jurídicas/fiscais sobre o cliente; tratá-las como defaults de projeto.

## Decisão organizacional atual

Consultar `docs/decisions/ADR-001-organizational-and-p0-defaults.md`.

Hierarquia adotada:

```text
Organization / Grupo
  └── Business / Negócio ou marca
      └── Unit / Unidade
          ├── Sector / Setor
          └── StockLocation / Local de estoque
```

Tabatinga, Capricórnio e Barba Negra entram inicialmente como unidades/operações do mesmo grupo. A associação a marcas/negócios e entidades jurídicas deve permanecer configurável.

## Outros defaults P0

- Cozinha/Quiosque/Empório: setores operacionais por default;
- checkbox legado desconhecido: não usar em regra central; preservar origem se possível;
- `em haver`: indicador de conciliação interna separado do estoque físico;
- transferência e empréstimo: processos distintos;
- catálogo de venda e item de estoque: conceitos separados;
- MVP do caixa: totais consolidados, integração com PDV/POS futura;
- custeio gerencial: custo médio ponderado, preservando custo de compra/lote.

## Próxima fase

Issue #8 — Fase 2 — Modelo de domínio, dados e ADRs fundamentais.

A Fase 2 deve produzir o modelo lógico/ERD e invariantes antes de qualquer escolha definitiva de Supabase ou implementação de banco.

## Segurança

Os arquivos Excel reais não foram adicionados ao repositório. A documentação registra estruturas, regras e problemas sem publicar os dados operacionais completos.

## Regra de eficiência

Não bloquear o projeto por perguntas que possam ser resolvidas com defaults configuráveis. Pedir validação do usuário apenas quando a escolha tiver potencial de retrabalho estrutural relevante.

## Próxima ação

Executar `docs/ai/NEXT_ACTION.md`.