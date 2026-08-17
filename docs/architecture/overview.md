# Arquitetura Inicial — Sistema Lojasaph

## Direção atual

O sistema será desenvolvido inicialmente como um monólito modular web.

Stack proposta para a fundação técnica:

- Next.js;
- React;
- TypeScript;
- Tailwind CSS;
- banco relacional;
- PostgreSQL como direção provável;
- Supabase a ser avaliado depois da modelagem do domínio.

## Camadas

```text
Interface / App
      ↓
Use cases / Services
      ↓
Domain rules
      ↓
Repositories
      ↓
Data provider
      ↓
PostgreSQL / Supabase ou equivalente
```

## Objetivos arquiteturais

- baixo acoplamento ao provedor de banco;
- regras de negócio testáveis;
- módulos organizados por domínio;
- rastreabilidade de estoque e financeiro;
- segurança no servidor;
- suporte a múltiplas unidades;
- responsividade;
- capacidade de migração dos dados existentes.

## Módulos de domínio previstos

- organization;
- products;
- suppliers;
- purchasing;
- inventory;
- expirations;
- finance;
- cash;
- users;
- reporting;
- audit.

Os nomes finais de pastas e limites dos módulos serão definidos antes do primeiro código funcional.

## Estoque

Direção arquitetural: tratar estoque como histórico de movimentações rastreáveis, não como simples edição manual de uma coluna de saldo.

Movimentações relevantes deverão carregar contexto como origem, destino, tipo, responsável, data e itens.

A decisão final sobre cálculo/materialização de saldo deverá ser registrada em ADR específico após modelagem.

## Financeiro

Registros financeiros relevantes devem suportar histórico, status consistente, pagamentos e anexos. Exclusões físicas devem ser evitadas quando comprometerem rastreabilidade.

## Segurança

Permissões não podem existir apenas na interface. Regras de autorização deverão ser aplicadas no servidor e, caso Supabase seja adotado, RLS será avaliado como camada adicional.

## Dados e migrations

Quando o banco for adotado, toda alteração de schema deverá ser versionada no repositório por migrations. Mudanças manuais não documentadas no banco de produção serão proibidas.

## Ambientes

A direção para produção é separar:

- development;
- preview/staging;
- production.

## Decisões ainda abertas

- adoção definitiva do Supabase;
- estratégia final de autenticação;
- biblioteca de componentes;
- estratégia de testes E2E;
- hospedagem;
- observabilidade;
- mecanismo de arquivos/anexos;
- estratégia de saldo de estoque.

Esses pontos não devem ser tratados como decididos até existir ADR ou documentação correspondente.