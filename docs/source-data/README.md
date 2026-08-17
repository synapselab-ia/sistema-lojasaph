# Dados de origem — Planilhas

A engenharia reversa do Sistema Lojasaph parte dos arquivos operacionais fornecidos pelo cliente.

## Arquivos analisados

1. `Controle Retirada Tabatinga.xlsx`
2. `Retirada Cozinha, Quiosque e Empório.xlsx`
3. `Caixa Empório Espeticho Tabatinga.xlsx`
4. `Controle NFs Espeticho.xlsx`
5. `Validades.xlsx`
6. `Fornecedores Tabatinga.xlsx`

## Regra de análise

As planilhas são fontes de evidência dos processos atuais, mas não definem automaticamente a arquitetura final.

A análise mapeou:

- abas;
- colunas;
- tipos/conceitos de dados;
- fórmulas relevantes;
- relações entre abas;
- duplicações e estruturas repetidas;
- inconsistências;
- regras de negócio implícitas;
- processo operacional representado;
- destino conceitual proposto no novo sistema.

## Entregáveis da Fase 1

- `spreadsheets-map.md` — mapa consolidado dos seis arquivos;
- `field-catalog.md` — campos de origem e conceitos candidatos de destino;
- `migration-plan.md` — estratégia preliminar de migração;
- `../product/business-rules.md` — regras observadas e nível de confiança;
- `../product/open-questions.md` — dúvidas que não podem ser respondidas por suposição;
- `../product/requirements.md` — requisitos iniciais;
- `../architecture/preliminary-domain-model.md` — entidades e relações preliminares.

## Estado

A engenharia reversa documental está concluída. O próximo passo é validar as questões críticas P0 antes do modelo definitivo.

## Segurança

Os arquivos Excel reais não foram versionados no repositório. Preferir documentação normalizada e fixtures anonimizadas para desenvolvimento. A migração futura deve preservar rastreabilidade por batch/arquivo/aba/linha sem publicar as fontes operacionais no GitHub.