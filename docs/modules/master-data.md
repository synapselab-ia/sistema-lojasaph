# Módulo — Cadastros base

Status: Fase 4 em implementação

## Objetivo

Fornecer os dados mestres usados posteriormente por estoque, compras, financeiro e caixa.

## Escopo inicial

- visualização da estrutura Organization → Business → Unit → Sector/StockLocation;
- StockItem com categoria, unidade, tipo e flags operacionais;
- Supplier com múltiplos contatos;
- SupplierItem/offer básico com preço observado;
- UI responsiva de demonstração;
- repositories/adapters in-memory.

## Persistência desta fase

A UI usa um workspace em memória no navegador. Alterações não sobrevivem a reload e isso é intencional.

O objetivo é validar fluxo, domínio e separação de camadas antes de adotar banco real. Não usar esta implementação como armazenamento de produção.

## Regras

- dados de demonstração são anonimizados;
- produtos e fornecedores têm IDs estáveis no domínio;
- fornecedor pode ter vários contatos, no máximo um marcado como principal;
- preço negativo é rejeitado;
- edição preserva ID da entidade;
- categorias/unidades atuais são fixtures e serão cadastros persistentes quando a camada de dados real for introduzida.

## Próximo módulo

Após concluir estes cadastros, implementar estoque transacional começando por entrada, retirada e transferência em duas etapas, conforme ADR-002.