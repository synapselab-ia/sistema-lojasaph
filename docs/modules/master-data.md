# Módulo — Cadastros base

Status: núcleo cadastral persistente; funcionários operacionais pendentes na Fase 19.

## Objetivo

Fornecer os dados mestres usados por estoque, compras, financeiro, caixa e administração.

## Escopo já implementado

- estrutura Organization → Business → Unit → Sector/StockLocation;
- StockItem com categoria, unidade, tipo e flags operacionais;
- Supplier com múltiplos contatos;
- SupplierItem/offer e histórico de preço observado;
- persistência PostgreSQL/Supabase protegida por RLS;
- autenticação e memberships por Organization/escopo;
- UI integrada ao workspace;
- adapters in-memory preservados onde úteis para testes isolados.

## Persistência

Migrations versionadas no GitHub são a fonte de verdade do schema. Operações do workspace persistente usam adapters Supabase/PostgreSQL e respeitam RLS; credenciais privilegiadas permanecem server-only.

## Regras consolidadas

- IDs de domínio são estáveis;
- fornecedor pode ter múltiplos contatos;
- catálogo e fornecedores são compartilhados conforme autorização da Organization;
- escopos Business/Unit/Sector são aplicados conforme a política homologada na Fase 14;
- dados de demonstração/teste devem ser sintéticos;
- correções críticas preservam rastreabilidade em vez de apagar histórico material.

## Lacuna atual — Employee

`REQ-ORG-004` exige separar funcionário operacional de usuário autenticado. O modelo lógico prevê `employees`, mas o schema físico atual usa `auth.users` + `organization_memberships` e ainda não materializa o cadastro de funcionários.

A Issue #49 / Fase 19 deve adicionar:

- Employee persistente separado de autenticação;
- vínculo opcional e explícito com usuário;
- status e escopo operacional padrão mínimo;
- RLS e UI administrativa básica;
- sem RH/folha/dados pessoais não requeridos.

Cadastrar Employee não deve conceder acesso ao sistema; autorização continua pertencendo a `organization_memberships`.
