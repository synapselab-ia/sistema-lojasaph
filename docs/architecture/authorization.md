# Autorização por escopo — Sistema Lojasaph

Status: Fase 14 — política física implementada no PR #38.

## Objetivo

Tornar efetivos os escopos já existentes em `organization_memberships` sem transformar o projeto em um sistema de ACL arbitrária e sem definir pessoas reais por perfil enquanto Q-022 estiver aberta.

A autorização possui duas dimensões independentes:

1. **papel**: `owner`, `admin`, `manager`, `finance`, `purchases`, `inventory`, `cashier`, `viewer`;
2. **escopo**: Organization, Business, Unit ou Sector.

Um papel válido fora do escopo não autoriza a operação.

## Hierarquia

```text
Organization
└── Business
    └── Unit
        └── Sector
            └── recursos explicitamente vinculados
```

`StockLocation` pertence a uma Unit e pode opcionalmente pertencer a um Sector. `CashRegister` pertence a uma Unit. Pedidos, inventários, transferências e demais registros operacionais derivam seu escopo desses recursos físicos.

## Semântica de `organization_memberships`

### Organization-wide

`business_id`, `unit_id` e `sector_id` nulos.

Preserva o comportamento amplo já existente para aquele papel dentro da Organization.

### Business-scoped

`business_id` informado; `unit_id` e `sector_id` nulos.

Autoriza as Units filhas daquele Business e os recursos operacionais dessas Units.

### Unit-scoped

`unit_id` informado; `sector_id` nulo.

Autoriza a própria Unit, seus Sectors e recursos operacionais da Unit.

### Sector-scoped

`sector_id` informado.

Autoriza o próprio Sector e somente recursos operacionais explicitamente vinculados ao Sector. Um `StockLocation` pertencente à mesma Unit mas com `sector_id = null` não é ampliado para o usuário do Sector.

## Hierarquia consistente

A migration adiciona validação de hierarquia nos memberships:

- Unit informada precisa pertencer à Organization;
- Sector informado precisa pertencer à Organization;
- `business_id + unit_id` precisam representar a relação pai/filho real;
- `unit_id + sector_id` precisam representar a relação pai/filho real;
- `business_id + sector_id` precisam ser compatíveis.

Combinações contraditórias são rejeitadas.

## Múltiplos memberships

Um usuário pode possuir mais de um membership na mesma Organization. Os escopos formam uma **união autorizada**.

Exemplo:

- Inventory em Unit A;
- Inventory em Unit B.

Esse usuário pode operar A e B, mas não Unit C.

A união não converte os memberships em Organization-wide.

## Owner/Admin com escopo

`owner` e `admin` não recebem bypass implícito quando o membership possui escopo explícito.

Um Admin limitado à Unit A continua limitado à Unit A. Para administração Organization-wide deve existir membership Organization-wide apropriado.

Isso evita que o nome do papel silenciosamente anule o escopo cadastrado.

## Leitura de dados organizacionais

### Estrutura física

Leitura de `businesses`, `units`, `sectors` e `stock_locations` considera o escopo real do membership.

Um Sector pode visualizar a metadata de sua Unit pai necessária à navegação, mas não outros Sectors ou locais unit-wide sem vínculo explícito.

### Dados mestres compartilhados

Os seguintes conceitos continuam legíveis no escopo Organization para qualquer membro válido, porque são cadastros canônicos compartilhados usados pelos módulos operacionais:

- categorias;
- unidades de medida;
- itens de estoque;
- aliases;
- fornecedores;
- contatos/termos/itens/preços de fornecedor;
- meios de pagamento e regras de taxa.

A leitura compartilhada não implica permissão de alteração global.

## Mutation de dados mestres globais

Mutation global exige membership Organization-wide com papel autorizado.

Exemplos:

- um `inventory` Unit-scoped pode movimentar estoque de sua Unit, mas não alterar o catálogo global;
- um `purchases` Unit-scoped pode criar pedido no local autorizado, mas não alterar globalmente Fornecedor/SupplierItem;
- um `manager` Unit-scoped pode cadastrar um `CashRegister` da Unit, mas não criar meios de pagamento ou regras de taxa globais.

A UI reflete essa distinção, porém a regra decisiva permanece no banco.

## Estoque

Leitura de:

- movimentos;
- itens de movimento;
- alocações de lote;
- lotes;
- saldos;
- inventários;

é derivada do `StockLocation`/Sector autorizado.

Commands de entrada, retirada e inventário validam o local alvo antes de executar a implementação transacional existente.

## Transferências

### Leitura

Uma transferência pode ser lida se o usuário tiver escopo sobre a origem **ou** o destino.

Isso permite acompanhamento pelas duas pontas sem expor transferências alheias.

### Despacho

Despacho exige autorização nos **dois** extremos.

Um usuário limitado apenas à origem não pode criar uma operação que alterará outra Unit fora do seu escopo.

### Recebimento

Recebimento exige autorização no destino.

O destino não amplia permissão de mutation sobre a origem.

## Compras

`PurchaseOrder` deriva escopo do `stock_location_id` de recebimento.

Criar, emitir, receber e cancelar pedido exige papel adequado e acesso ao local correspondente. Supplier/SupplierItem continuam cadastros compartilhados na leitura.

## Financeiro

`PayableDocument` possui Unit e Sector opcional.

- documento sem Sector: exige escopo Unit/Business/Organization compatível;
- documento com Sector: aceita Sector exato ou escopo pai compatível;
- pagamentos e estornos herdam o escopo do documento através da parcela.

Status/saldo continuam derivados como antes.

## Caixa

`CashRegister` pertence à Unit.

- criar caixa físico: pode ser feito por manager/admin/owner dentro da Unit autorizada;
- abrir/operar/fechar sessão: exige acesso à Unit do caixa;
- criar PaymentMethod ou FeeRule global: exige membership Organization-wide.

## RPCs `SECURITY DEFINER`

Os commands transacionais validados nas fases anteriores foram preservados como implementações internas no schema `private`.

Os nomes públicos originais foram recriados com as mesmas assinaturas como wrappers de autorização:

1. revalidam autenticação;
2. revalidam papel;
3. revalidam escopo do recurso;
4. chamam a implementação privada existente.

Assim idempotência, locks, transações e audit log permanecem nas implementações já testadas, enquanto a nova fronteira pública adiciona escopo sem duplicar lógica de negócio.

`authenticated` não recebe `EXECUTE` direto nas implementações privadas.

Erros:

- role inadequada: `INSUFFICIENT_ROLE`;
- role válida fora do escopo: `INSUFFICIENT_SCOPE`.

## RLS e wrappers

RLS limita leitura. Wrappers limitam mutations `SECURITY DEFINER`.

As duas camadas são necessárias: um wrapper seguro não substitui RLS de leitura, e RLS não substitui a autorização interna de uma função `SECURITY DEFINER`.

## UI

`resolveMembershipContext` preserva:

- todos os roles da Organization;
- subconjunto de roles Organization-wide.

Permissões globais de catálogo/fornecedores/configuração de meios de pagamento usam somente roles Organization-wide. Operações por Unit/Sector continuam usando role funcional, pois as listas de Units/Locations/Caixas já chegam filtradas por RLS.

O frontend evita oferecer ações sabidamente proibidas, mas não é considerado fronteira de segurança.

## Q-022

A fase não define quais pessoas reais serão Owner, Manager, Inventory etc. Isso continua pendente de validação operacional.

A mecânica de escopo é genérica e permite mapear os perfis reais posteriormente sem remodelar o banco.

## Testes

`supabase/tests/scoped_permissions.sql` cobre:

- membership Organization-wide;
- Business-scoped;
- Unit-scoped;
- Sector-scoped;
- múltiplos memberships;
- hierarquia inválida;
- leitura de masters compartilhados;
- bloqueio de mutation global por membership scoped;
- entrada de estoque própria/fora de escopo;
- transferência exigindo os dois extremos;
- leitura de transferência por origem/destino e negação para Unit alheia;
- recebimento por destino;
- Compras por StockLocation;
- Financeiro por Unit;
- Caixa local versus configuração global;
- viewer read-only;
- impossibilidade de executar diretamente as implementações privadas.

As suítes antigas continuam executando primeiro com memberships Organization-wide para provar retrocompatibilidade.
