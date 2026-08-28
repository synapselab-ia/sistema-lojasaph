# Sistema Lojasaph — Design system mínimo

Status: **fundação da terceira slice da Fase 51 / Issue #142**  
Data: **2026-08-28**

## Objetivo

Estabelecer contratos visuais e comportamentais reutilizáveis antes das consolidações de Administração, Cadastros, Estoque, Compras, Financeiro e Caixa.

Esta fundação não é um framework visual completo e não autoriza refatoração massiva. Ela existe para impedir que cada página recrie do zero cabeçalhos, ações, campos, superfícies, estados e overlays.

A arquitetura da informação continua definida por `docs/product/workspace-information-architecture.md` e não é alterada por este documento.

## Localização

Os componentes reutilizáveis ficam em:

- `src/components/ui/`.

O barrel público é:

- `src/components/ui/index.ts`.

Páginas e módulos devem preferir importar desse barrel em vez de acoplar-se a arquivos internos do design system.

## Componentes disponíveis

### `PageHeader`

Usar para cabeçalho de página ou jornada com:

- contexto/eyebrow opcional;
- título principal;
- descrição;
- ações contextuais opcionais.

Não usar múltiplos `PageHeader` como decoração dentro da mesma página. Subseções continuam usando headings semânticos normais.

### `Button`

Variantes suportadas:

- `primary` — ação principal da etapa atual;
- `secondary` — ação alternativa, cancelar, voltar ou ação de menor hierarquia;
- `danger` — confirmação de ação destrutiva/irreversível quando a regra de negócio já justificar;
- `ghost` — ação discreta, normalmente dentro de overlays ou superfícies já delimitadas.

Tamanhos suportados:

- `sm`;
- `md`.

`loading=true`:

- marca `aria-busy`;
- desabilita interação durante o processamento;
- o texto de progresso deve ser explícito no conteúdo quando a ação demorar ou quando o resultado não for óbvio.

Não usar cor diferente para inventar uma nova hierarquia de ação sem antes provar que a intenção não cabe nessas variantes.

### `FormField`

Contrato de campo:

- label visível;
- associação por `htmlFor`/`id`;
- ajuda opcional;
- erro opcional;
- `aria-describedby` e `aria-invalid` derivados de forma consistente;
- marcador visual de obrigatório quando aplicável.

`FormField` recebe o controle por render function para que o vínculo acessível não dependa de convenção manual.

### `Input`, `Select`, `Textarea`

Compartilham:

- borda/radius/densidade;
- estado disabled;
- foco visível;
- largura previsível;
- touch target compatível com a política global quando o dispositivo possui ponteiro coarse.

Não encapsulam regra de validação de negócio. Validação continua pertencendo ao domínio/formulário apropriado.

### `Panel`

Superfície padrão para seção/card operacional.

Tons suportados:

- `neutral`;
- `success`;
- `attention`;
- `danger`;
- `info`.

Padding suportado:

- `none`;
- `sm`;
- `md`.

Elementos semânticos suportados por `as`:

- `div`;
- `section`;
- `article`;
- `aside`.

Não transformar toda informação em card. Usar `Panel` quando a superfície realmente delimitar um bloco de conteúdo, formulário, estado ou conjunto operacional.

### `StatusBadge`

Usar para estado curto e categórico, com os mesmos tons semânticos de `Panel`.

O texto continua obrigatório: cor sozinha nunca comunica estado.

### `FeedbackMessage`

Usar para mensagens persistentes/inline de:

- neutro;
- sucesso;
- atenção;
- erro (`danger`);
- informação.

Erros que exigem atenção imediata devem usar semântica adequada, por exemplo `role="alert"` quando o contexto justificar. Mensagens de sucesso podem usar `role="status"` quando precisam ser anunciadas.

### `EmptyState`

Usar quando a ausência de dados é um estado real da jornada.

Pode conter:

- título;
- explicação;
- ação opcional.

Não usar para esconder erro, falta de permissão ou falha de carregamento; esses estados possuem significado próprio.

### `Drawer`

Overlay lateral controlado por `open`/`onClose`.

Contrato atual:

- fechamento por botão;
- fechamento por backdrop;
- fechamento por `Escape`;
- trap básico de `Tab` dentro do overlay;
- bloqueio de scroll do `body` enquanto aberto;
- restauração do foco anterior ao fechar;
- `role="dialog"` + `aria-modal`.

A navegação mobile do `RuntimeShell` é o primeiro uso real desse componente.

### `Dialog` / `ConfirmDialog`

Fundação para confirmações e ações contextuais futuras.

`ConfirmDialog` oferece:

- cancelar;
- confirmar;
- confirmação normal ou destrutiva;
- estado loading.

O componente não decide se uma operação precisa confirmação, motivo, estorno ou autorização. Essas decisões permanecem na jornada/regra existente de cada módulo.

## Tokens e regras mínimas

### Tipografia

- título principal: `text-3xl`, semibold, tracking tight;
- títulos de seção: normalmente `text-lg`/`text-xl`, semibold;
- corpo operacional: `text-sm`, `leading-6` quando houver explicação;
- texto auxiliar: `text-xs`/`text-sm` em neutro reduzido.

### Espaçamento

- páginas operacionais mantêm largura máxima adequada ao conteúdo e espaçamento vertical deliberado;
- `Panel` usa `p-5` como densidade padrão;
- ações relacionadas usam gap curto e devem quebrar linha quando necessário.

### Superfícies

- superfície padrão: fundo branco, borda neutra, radius `2xl`;
- controles: radius `lg`;
- sombra é discreta e não substitui hierarquia semântica.

### Estados semânticos

- sucesso: emerald;
- atenção: amber;
- erro/destrutivo: red;
- informação: sky;
- neutro: neutral.

A semântica deve ser acompanhada de texto. Não criar regras de negócio a partir da cor.

### Foco e teclado

`globals.css` define foco visível global e os componentes interativos mantêm outline/ring próprio quando necessário.

Overlays devem:

- fechar com `Escape`;
- manter a navegação por `Tab` dentro da camada;
- devolver foco ao elemento anterior ao fechar.

### Touch target

A política global preserva altura mínima de 44px para controles principais em dispositivos de ponteiro coarse. `Button` já usa `min-h-11` independentemente do ponteiro.

## Padrões de estado

### Loading

- desabilitar a ação que está sendo processada;
- usar `aria-busy` quando aplicável;
- manter texto que explique o processamento quando necessário;
- não permitir duplo envio por ausência de feedback.

### Empty

- usar `EmptyState` somente quando não existem dados válidos para exibir;
- oferecer próxima ação apenas quando o usuário realmente puder executá-la.

### Error

- erro de campo fica junto do campo via `FormField`;
- erro geral da jornada usa `FeedbackMessage` ou padrão específico posterior;
- não substituir erro por empty state.

### Success

- sucesso inline pode usar `FeedbackMessage tone="success"`;
- feedback efêmero global/Toast ainda não faz parte desta fundação.

## Pontos de prova desta slice

A fundação é aplicada somente onde o risco é baixo e a API pode ser provada sem redesenhar jornadas:

- `RuntimeShell` — `Drawer` e `Button`;
- Login — `Panel`, `FeedbackMessage`, `FormField`, `Input` e `Button`;
- Proteção dos dados — `PageHeader`, `Panel`, `StatusBadge` e `EmptyState`.

As regras de autenticação, membership, proteção, queries e RLS não mudam com essa migração visual.

## O que ainda NÃO faz parte do design system

Deliberadamente fora desta primeira fundação:

- `DataTable` genérica;
- lista responsiva genérica;
- `Tabs`;
- `Toast` global;
- `SearchField`/filtros genéricos;
- paginação genérica;
- date picker;
- combobox/autocomplete;
- menu de ações genérico;
- gráficos/dashboard primitives;
- editor/upload abstractions;
- componentes específicos de estoque, compras, financeiro ou caixa.

Esses contratos só devem ser adicionados quando uma jornada real fornecer requisitos suficientes para evitar abstração prematura.

## Regra para as próximas slices

Antes de criar novo componente visual:

1. verificar se a intenção já cabe em `src/components/ui`;
2. se não couber, identificar repetição/jornada real que justifique novo contrato;
3. não colocar regra de autorização, estoque, financeiro ou auditoria dentro do componente visual;
4. documentar nova convenção relevante quando ela alterar o contrato compartilhado.

A migração das páginas existentes deve acontecer junto da consolidação funcional de cada área, e não como refatoração cosmética massiva separada.

## Validação

Esta slice exige:

- lint;
- typecheck;
- unit tests;
- production build;
- CI/banco aplicável.

A existência desses gates não equivale a homologação visual. Se browser real continuar indisponível sem deploy proibido, essa limitação deve permanecer registrada no handoff.
