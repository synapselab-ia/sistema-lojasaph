# Fundação Técnica — Fase 3

Data: 2026-08-17

## Stack inicial

- Next.js 16.2.12
- React 19.2.8
- TypeScript 5.x em modo strict
- Tailwind CSS 4.x
- ESLint 9.x + eslint-config-next 16.2.12
- Vitest 4.1.10
- npm
- Node.js 22 no CI; mínimo do projeto 20.9

A escolha segue o template/recomendações atuais do Next.js, evitando adotar versões fora da faixa usada pelo próprio framework apenas por serem numericamente mais novas.

## Estrutura inicial

```text
src/
├── app/                    # rotas e composição Next.js
├── domain/common/          # value objects e erros transversais
├── modules/
│   └── catalog/
│       ├── domain/
│       ├── repositories/
│       └── adapters/
└── ...                     # novos módulos seguem o mesmo padrão quando necessário
```

## Regra de dependência

- domínio não importa Next.js;
- repositories são contratos;
- adapters implementam contratos e podem ser substituídos;
- UI/rotas dependem de serviços/casos de uso, não de banco diretamente;
- quando Supabase ou outro banco entrar, será um adapter de persistência.

## Dinheiro

No domínio JavaScript/TypeScript, valores monetários simples usam centavos inteiros seguros (`Money`) para evitar float binário. A persistência física futura usará decimal exato e fará conversão explícita.

## IDs

O domínio trabalha com `EntityId` opaco. O gerador inicial usa `crypto.randomUUID()`, mas repositories não dependem do formato físico do ID.

## Testes

Vitest inicialmente cobre regras puras e adapters in-memory. Componentes/fluxos de UI ganham testes quando houver funcionalidade real. E2E entra antes de produção nos fluxos críticos.

## CI

Toda PR executa:

1. instalação das dependências;
2. lint;
3. typecheck;
4. testes unitários;
5. build de produção.

## Persistência

Nenhum banco foi configurado nesta fase. Isso é intencional.

O primeiro fluxo vertical deve funcionar contra repositories/adapters in-memory ou fixtures, permitindo estabilizar domínio e UX antes de decidir a persistência real.
