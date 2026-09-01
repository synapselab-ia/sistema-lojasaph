# Current State — Sistema Lojasaph

Última atualização: 2026-09-01

## Regra de baseline

**Não usar este arquivo como fonte do SHA corrente de `main`.** Toda execução deve consultar GitHub para HEAD, PRs, Issues, branches e CI reais. SHAs/runs abaixo são âncoras de evidência.

## Estado do produto

A consolidação de produto/UX da **Fase 51 / #142** atingiu o gate de aceite previsto:

- arquitetura de informação, design system e áreas principais integrados;
- superfícies públicas verificadas;
- live autenticado em desktop e mobile;
- `/workspace/administracao/acessos` revalidada após a correção do drift de migrations;
- profundidade representativa confirmada normal pelo operador em Produtos, Compras/Pedidos, Financeiro/Contas, Caixa/Sessões e fluxo mobile;
- tablet explicitamente deferido pelo operador, não homologado live;
- nenhum P0/P1 conhecido permanece sem tratamento.

A **Fase 52 / Issue #180** executa a reconciliação funcional final requisito por requisito. O resultado versionado em `docs/qa/final-functional-reconciliation.md` é:

> **nenhum gap funcional P0/P1 novo e inequívoco encontrado no núcleo do produto.**

Assim, o núcleo pode ser tratado como **funcionalmente concluído dentro das limitações declaradas**, sem chamar o sistema de 100% concluído.

A próxima frente é **Fase 53 / Issue #181 — decisões de negócio e perfis reais para conclusão**.

## O que já está integrado e não deve ser refeito

Fase 51 e fechamentos relacionados: #145, #147, #149, #151, #153, #155, #157, #159, #161, #163, #165, #167, #168, #169, #170, #171, #172, #173, #174, #175, #176, #177, #178 e #179.

Não reabrir essas slices sem regressão/gap concreto.

## Runtime hospedado de aplicação

Último deployment automático de aplicação observado:

- `dpl_J6qwwqUihCKqfTMhmbjSxcLSA3gr`;
- READY, production, source Git;
- runtime `githubCommitSha=64e1c0d242c3abfb7ee374ebc43850156d75089b` (#171);
- alias `sistema-lojasaph.vercel.app`.

Os PRs posteriores são documentais/operacionais e não justificam deploy manual. Nenhum deploy Vercel manual deve ser feito apenas para alinhar SHA documental/runtime.

## Supabase / migrations

O incidente UX-51-004 foi fechado pelo PR #175. Production recebeu, via `supabase db push` version-preserving:

- `20260828130500 administration_access_management`;
- `20260828132500 administration_employee_identity`.

Checagem read-only posterior confirmou Git e Production alinhados até `20260828132500`. Não repetir #175 sem novo drift comprovado.

## Conclusão funcional — classificação final

`docs/qa/final-functional-reconciliation.md` contém a matriz completa dos 70 requisitos.

### Núcleo utilizável

Organização/Cadastros, Estoque, Lotes/Validades, Fornecedores/Compras, Financeiro, Caixa, Dashboard, Segurança e requisitos transversais do produto possuem cobertura operacional coerente no escopo aprovado.

### PENDING negócio — não inferir

- `REQ-ITEM-004` — produto de venda/POS;
- `REQ-ITEM-005` — ficha técnica/receita;
- `REQ-STK-007` — empréstimo;
- `REQ-STK-010` — custeio final;
- `REQ-EXP-004` — FEFO como regra empresarial aprovada;
- `REQ-FIN-004` — semântica final de pagamento parcial/múltiplo;
- `REQ-CASH-007` — consumo de funcionários;
- `REQ-CASH-008` — integração com vendas/POS.

Q-022 também permanece aberta para mapear pessoas/cargos reais às capacidades técnicas existentes.

### Migração/cutover

Aliases, importadores específicos, fontes congeladas, dry-run real, correção de inconsistências, importação definitiva, reconciliação de saldos e corte das planilhas pertencem ao marco de migração/cutover. A fundação de staging/dry-run já existe; não fabricar dados Production para antecipar essa etapa.

### Production-readiness

`REQ-PLAT-005`, #75 e #121 continuam **TOTALMENTE ON HOLD** até a etapa final ou nova decisão explícita do operador.

## Limitação de tablet

Tablet live autenticado não foi homologado. O operador declarou que nem ele nem Asaph dispõem do dispositivo e aceitou explicitamente deferir esse teste por enquanto.

- não marcar como testado;
- não pedir novamente por inércia;
- reabrir se tablet se tornar necessidade real antes do corte/production-readiness.

## NEXT_ACTION

**Executar a Fase 53 / #181: decidir ou formalmente adiar somente os PENDINGs necessários para a operação escolhida, mapear Q-022 para perfis/pessoas reais e triar `open-questions.md` sem inventar respostas.**

Se uma decisão revelar comportamento novo obrigatório, abrir a menor Issue funcional correspondente. Depois, avançar para homologação com dados representativos e migração/cutover.
