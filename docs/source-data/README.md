# Dados de origem — Planilhas

A engenharia reversa do Sistema Lojasaph parte dos arquivos operacionais fornecidos pelo cliente.

## Arquivos conhecidos

1. `Controle Retirada Tabatinga.xlsx`
2. `Retirada Cozinha, Quiosque e Empório.xlsx`
3. `Caixa Empório Espeticho Tabatinga.xlsx`
4. `Controle NFs Espeticho.xlsx`
5. `Validades.xlsx`
6. `Fornecedores Tabatinga.xlsx`

## Regra de análise

As planilhas são fontes de evidência dos processos atuais, mas não definem automaticamente a arquitetura final.

A Fase 1 deverá mapear para cada arquivo:

- abas;
- colunas;
- tipos de dados;
- fórmulas;
- validações;
- listas auxiliares;
- relações entre abas;
- duplicações;
- inconsistências;
- regras de negócio implícitas;
- processo operacional representado;
- destino proposto no novo sistema.

## Entregáveis da Fase 1

- `spreadsheets-map.md`;
- catálogo de campos;
- lista de regras de negócio confirmadas;
- lista de dúvidas para validação;
- proposta inicial de entidades e relacionamentos;
- plano de migração preliminar.

## Segurança

Não versionar no repositório planilhas contendo dados sensíveis ou operacionais reais sem decisão explícita. Preferir documentação normalizada e fixtures anonimizadas para desenvolvimento.