# ADR-010 — Composição modular do produto

Data: 2026-09-04  
Status: **aceito como direção arquitetural, implementação incremental**

## Contexto

O operador quer que o Sistema Lojasaph possa ser adaptado a operações diferentes por uma área estrutural, inicialmente acessível apenas a `owner` Organization-wide, na qual capacidades de negócio possam ser habilitadas/desabilitadas como peças de um quebra-cabeças.

O código já possui separação física relevante em `src/modules/*`, mas a navegação atual é declarada de forma fixa e não existe ainda um registry de capabilities, grafo de dependências ou estado persistido de composição por Organization.

Uma implementação ingênua baseada apenas em esconder itens de menu produziria estado incoerente: rotas/actions continuariam acessíveis, dashboards poderiam depender de fontes desativadas e módulos dependentes poderiam ficar quebrados.

## Decisão

### 1. Separar definição estrutural de configuração da Organization

A definição de capacidades/módulos será versionada no código por um **Module/Capability Registry**.

Cada capability deve poder declarar, conforme necessário:

- `id` estável;
- nome e descrição de produto;
- categoria;
- se é `core/locked` ou configurável;
- dependências;
- capacidades dependentes;
- rotas e entradas de navegação;
- cards/indicadores derivados;
- gates de aplicação/backend;
- permissões necessárias;
- opções configuráveis aprovadas.

O banco deve persistir somente a configuração da Organization — por exemplo enabled/disabled/opções — e não copiar a definição estrutural inteira do código.

### 2. Desabilitar não é apagar

Desabilitar uma capacidade de negócio:

- impede novas operações quando aplicável;
- remove/oculta superfícies operacionais coerentemente;
- preserva tabelas, migrations, ledger, audit trail e histórico;
- não executa `DROP TABLE` ou limpeza destrutiva;
- permite reativação posterior com histórico intacto.

A composição é configuração de produto, não mecanismo de migração destrutiva de schema.

### 3. Frontend não é boundary de segurança

Esconder menu não é suficiente.

Rotas, server actions, gateways/RPCs e outros boundaries autoritativos devem respeitar o estado da capability quando a operação puder ser desabilitada.

RLS/autorização continuam sendo boundary de acesso a dados. Module gating complementa autorização; não a substitui.

### 4. Core não removível

Capacidades estruturais de segurança/integridade não podem ser desligadas como módulos de negócio:

- contexto de Organization;
- autenticação;
- autorização/RLS;
- auditoria;
- integridade transacional/idempotência;
- configuração necessária ao próprio compositor.

Proteção/backup segue governança própria e não pode ser enfraquecida por um toggle visual.

### 5. Dependências explícitas

O registry deve impedir estados inválidos.

Exemplos iniciais:

- Empréstimos → Estoque;
- FEFO/Validades → Estoque + camadas/lotes;
- Fichas técnicas → Catálogo comercial + itens/insumos;
- Margem de pratos → Catálogo comercial + ficha técnica + custo;
- Consumo de funcionários → Funcionários + fonte de venda/consumo;
- Relatórios de vendas → fonte de vendas/importação;
- Dashboard → somente indicadores cujas fontes estejam habilitadas.

Ao tentar desligar uma capacidade necessária por outra, o sistema deve explicar o impacto e exigir resolução explícita. Nunca deixar dependente ativo em estado quebrado silenciosamente.

### 6. Autorização da composição

Primeiro rollout: apenas `owner` Organization-wide pode alterar a composição.

Não hardcode pessoa, e-mail ou UUID. Q-022 mapeará usuários/cargos reais às capacidades técnicas.

Toda mudança deve registrar, no mínimo:

- Organization;
- ator;
- timestamp;
- configuração anterior;
- configuração nova;
- motivo/contexto quando necessário.

### 7. UX

A interface deve ser uma ferramenta de configuração de produto, não um painel de feature flags de engenharia.

Direção:

- `Administração → Módulos` ou `Administração → Montar sistema`;
- biblioteca visual de capacidades;
- estados em linguagem de negócio: `Ativo`, `Desativado`, `Obrigatório`, `Requer ...`;
- explicação de dependências e impacto antes de aplicar;
- preview da navegação resultante;
- confirmação para alterações relevantes;
- reordenação somente onde não prejudicar o modelo mental/IA;
- teclado/mobile funcionais; drag-and-drop não obrigatório;
- sem UUID, nome de tabela ou flag técnica na UI.

Presets futuros (`Restaurante`, `Loja`, `Completo` etc.) podem existir como atalhos, mas não substituem configuração explícita nem apagam dados.

### 8. Rollout incremental

Não tornar todas as áreas configuráveis de uma vez.

Sequência recomendada:

1. mapear dependências reais;
2. criar registry estático + resolver;
3. aplicar a 1–2 capabilities de baixo risco;
4. validar navegação + backend gating + reativação + audit trail;
5. expandir gradualmente.

## Consequências

- o Lojasaph pode atender operações diferentes sem forks de código por cliente;
- módulos opcionais como fichas técnicas, empréstimos e integração PDV podem ser adicionados sem obrigar toda Organization a utilizá-los;
- desativação segura preserva histórico e reduz risco operacional;
- dashboards/navegação podem se adaptar à composição real;
- haverá custo arquitetural adicional para dependency graph, gates e testes de combinações;
- features futuras devem declarar dependências no registry quando entrarem no modelo modular.

## Não fazer

- não implementar como `if (hidden) hide menu` apenas no cliente;
- não remover tabelas/dados quando capability for desligada;
- não misturar role/permissão com enabled/disabled de módulo;
- não permitir que módulo opcional desative autenticação/RLS/auditoria;
- não expor flags internas ao operador;
- não criar dezenas de toggles antes de provar o registry/gating com poucos módulos.

Refs: `REQ-PLAT-008`, `BR-SYS-005`, Issue #190.
