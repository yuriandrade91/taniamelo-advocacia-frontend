# Arquitetura do frontend

Como a aplicação está organizada e por quê. O checklist do dia a dia — qual
peça usar para cada coisa — está no [`CLAUDE.md`](../CLAUDE.md); aqui fica o
desenho por trás dele.

> Estado de 09/10/2026. Substitui a revisão de arquitetura de setembro, os
> planos de tabelas/filtros/schema e de localizadores e as notas da migração
> para o HeroUI v3, todos já executados. O que foi desenhado e ainda não existe está no
> [`ROADMAP.md`](ROADMAP.md).

---

## 1. Visão geral

| | |
|---|---|
| Framework | Next.js 16 (App Router), `output: "export"` — **site estático**, sem Node em produção |
| UI | React 19, HeroUI v3 (React Aria por baixo), Tailwind v4 (CSS-first, tokens em `globals.css`) |
| Dados | API REST do `taniamelo-advocacia-backend` (Spring Boot), via `axios` |
| Testes | Vitest (funções puras) e Playwright (ponta a ponta, contra o backend de verdade) |
| Deploy | `out/` no S3, servido pelo CloudFront ([`DEPLOY.md`](DEPLOY.md)) |

Toda página é componente de cliente: o HeroUI v3 é *client-only*, e o export
estático não tem servidor para renderizar dado. O HTML pré-gerado é a casca;
o dado chega depois, pela API, com o token da sessão.

Consequências que moldam o código:

- **Não há middleware.** A guarda de rota é o `components/auth/RouteGuard.tsx`,
  no cliente. Sem token, o JavaScript manda para o login; mesmo com o
  JavaScript desligado não há dado a vazar, porque toda leitura passa pela API.
- **`NEXT_PUBLIC_*` é inlinado no build.** Trocar de backend é gerar outro
  build (os `env/*.env` e as variáveis do deploy).
- **Nada de `next start`** — para ver o build, `pnpm preview` serve `out/`.

## 2. Pastas

```
src/
  app/                 rotas (App Router). (public)/login e (private)/* com o RouteGuard
  components/
    <domínio>/         agenda, clients, home, payments, wallet, reports, profile, auth
    site/              o site público do escritório (`/site`)
    charts/            primitivas de gráfico (Chart.js no ChartCard; SVG próprio em svgCharts)
    ui/                o kit da casa — peças sem regra de negócio (seção 7)
  hooks/               estado reutilizável (listas, filtros, formulários, sessão)
  lib/                 funções puras: formatação, datas, validação, cache, sessão
  services/            uma função por rota da API; nenhum componente chama o axios direto
  interfaces/          os DTOs do backend, tipados
  enums/               os enums do backend (chave → rótulo), pela fábrica `createEnum`
  constants/           endpoints, rotas, mensagens, meses, logos
tests/
  unit/                Vitest — espelha src/ (tests/unit/lib/format.test.ts ↔ src/lib/format.ts)
  e2e/                 Playwright — um arquivo por fluxo, e os auxiliares compartilhados
```

Regras de pasta:

- **Domínio primeiro.** O que é de cliente mora em `components/clients/`
  (`list/`, `stage/`, `form/`, `details/`…), mesmo quando aparece em outra
  tela. A rota (`app/`) só monta: nada de lógica dentro da pasta da rota.
- **`ui/` não conhece domínio.** Se uma peça precisa saber o que é um
  cliente, ela não é de `ui/`.
- **Pastas em minúsculas; componente em PascalCase** (`ui/drawer/Drawer.tsx`);
  módulo sem JSX em camelCase (`lib/formValues.ts`).
- **Teste fora de `src/`**, no caminho espelhado em `tests/unit/`.

## 3. Camada de dados

```
tela → hook (usePagedList, useSettled, useRecordDetail…) → service → axiosService → API
```

- **`constants/endpoints/paths.ts`** é o mapa das rotas que o front usa — todo
  caminho já absoluto (`API_BASE_URL` + `/api/v1`). Rota nova entra aqui antes
  de entrar num service.
- **`services/axiosService.ts`** concentra o que vale para toda requisição: o
  `X-Tenant-Id`, o `Authorization` e o refresh do token em 401 (serializado: o
  backend invalida o refresh anterior a cada uso). O que aparece na tela é da
  central de notificações (`services/notificationService.ts`).
- **Toda gravação tem retorno.** POST, PUT, PATCH e DELETE bem-sucedidos viram
  toast com a mensagem que o serviço declara — `feedback("Cliente atualizado.",
  options)`, de `services/requestFeedback.ts`. Quem chama troca a mensagem
  (`successMessage`) ou cala o sucesso (`silent`): o fluxo de várias
  requisições avisa uma vez no fim ("Ficha atualizada.", "Cliente
  cadastrado."), e a ação com janela de desfazer já avisou no clique. Erro não
  se cala por aí; `skipErrorToast` é da tela que mostra o erro no próprio
  campo. Leitura não tem toast de sucesso.
- **Arquivo** vem pelo axios como blob (`downloadClientFile`), com o token;
  quem o entrega ao navegador — aba ou "salvar como" — é `lib/blobFile.ts`. O
  `downloadUrl` da listagem é caminho da API, não link.
- **Envelope** `ApiEnvelope<T>`: `data`, `pagination` (1-based,
  `totalRecords`), `errors`. `pageFromEnvelope` (`lib/pagination`) vira a
  página de lista que o `usePagedList` consome.
- **Integração em pausa** (`services/pendingIntegration.ts`): a instância que
  ainda não tem uma rota lista o grupo em `NEXT_PUBLIC_PENDING_INTEGRATIONS`;
  a tela diz "não está no ar neste ambiente" em vez de errar a cada carga.

### Nada de pedir duas vezes

| Peça | Para |
|---|---|
| `createRequestCache` | resposta por chave, LRU, a mesma promessa para o mesmo pedido no ar |
| `createSessionCache` | o mesmo, vivendo a sessão inteira; limpo no logout (`clearSessionCaches`) |
| `createInFlight` | dedupe sem memória — o detalhe de um registro, que precisa reler ao reabrir |
| `usePagedList` | lista paginada do servidor: página presa à consulta, cache por página, carga sob demanda (`enabled`), totais estáveis enquanto a próxima página chega, cache externo opcional |
| `useSettled` + `settledValue` | leituras independentes; "carregando" é `null`, e uma falha não apaga as outras |
| `useRecordDetail` | o painel de um registro, com a trava contra resposta atrasada |
| `usePendingAction` | excluir/concluir/cancelar com janela de desfazer: a tela muda na hora, a requisição sai depois |

## 4. Sessão e permissões

- O **access token** fica num cookie legível pelo JavaScript (`token`), com a
  validade que o login devolve; o **refresh token** é cookie `httpOnly` do
  backend (`withCredentials`). `lib/session.ts` grava, limpa e encerra a
  sessão; o fim por 401 leva ao login com o motivo na URL.
- O usuário (nome, e-mail, papel, escritório) fica no `localStorage`
  (`lib/sessionUser.ts`) e chega às telas por `useSessionUser`/`usePermissions`.
- **Permissão na tela não autoriza nada.** O backend recusa com 403
  (`@RequerAdmin`, `@RequerAdvogado`). `lib/permissions.ts` só evita oferecer
  um botão que vai ser recusado: `canDestroy` (ADMIN/SUPPORT), `canSeeFinance`
  (só ADMIN), `canSeeInssPassword`, `canListUsers`.
- `LAWYER` e `SUPPORT` são o mesmo papel (a V19 do backend renomeou); os dois
  valem até nenhuma instância devolver o nome antigo.

## 5. Formulários

Um formulário é um **schema** (`defineSection`, `components/ui/form/schema.ts`):
cada campo declara `kind`, rótulo, obrigatoriedade e regra própria. O `kind`
traz máscara, validador e controle (`FIELD_STRATEGIES`); `useSectionForm`
guarda o estado e valida; `SchemaField` desenha (com `isReadOnly` e
`isLoading`). A decisão está na [ADR 0001](adr/0001-schema-driven-forms.md).

- Os schemas de cliente (`components/clients/form/schemas.ts`) servem ao
  cadastro **e** à ficha: os dois validam igual porque é o mesmo schema.
- Ida e volta com a API: `lib/formValues.ts` (texto, número, valor em reais,
  rótulo de enum → chave do select, e o vazio que some do JSON).
- Validadores de domínio (CPF, RG, NIT, CTPS, CEP, datas, justificativa) em
  `lib/validators`; máscaras em `lib/masks`.
- Formulário sem schema (compromisso, lançamento, perfil): validador puro +
  `useFieldErrors` — o erro aparece ao mexer no campo e todos de uma vez no
  "Salvar".
- Campos na `FieldGrid` (`columns` 1, 2 ou 4): é a grade que põe o rótulo
  dentro da moldura (`formFields.css`).

## 6. Listas e filtros

- **Linhas:** `DataList` + `ListColumn<T>` — a mesma grade no cabeçalho e em
  cada linha, sem zebra; vazio e falha com `ListEmpty` (com `action` e
  `tone="danger"`).
- **Ações por linha:** `RowActions` com `viewAction`/`editAction`/
  `deleteAction` — ícone de traço, rótulo acessível (é o que os e2e
  procuram), visibilidade por regra.
- **Filtros:** `defineFilters` + `useFilters` + as peças de
  `ui/filters/FilterBar.tsx`. A busca digitada passa por `useDebouncedValue`
  (400 ms; limpar é imediato). A lista de Clientes tem o seu
  `useClientFilters`, porque o período e as listas múltiplas viram query de um
  jeito próprio.
- **Paginação:** `TablePagination`, que some com uma página só.

## 7. O kit (`components/ui/`)

| Pasta | Peças |
|---|---|
| `actions/` | `ActionGroup`/`ActionButton`/`ChipButton` (barras de ação em cápsula), `IconButton` (só ícone, com dica), `ContactAction` |
| `drawer/` | `Drawer` (ação rápida, painel lateral), `RecordDrawer` (detalhe e edição de um registro) |
| `feedback/` | `Notice`, `LoadingCircle`/`RowSkeletons`, `Pill`/`StatusBadge`/`DeltaBadge`, `UndoCountdown`, `NoFinanceAccess`, a rampa das etapas (`stageRamp`) |
| `filters/` | `FilterBar` (busca, segmentado, campo, chips, limpar), `DateRangeField`, `MonthPicker`, a definição de filtros |
| `form/` | `Field` e variações, `SchemaField`, `FieldGrid`, `AmountField`, `ClientSearchField`, `RichTextField`, o schema |
| `icons/` | `Svg` (a moldura) e os ícones de traço: `actions`, `glyphs`, mais os de contato e status |
| `layout/` | `Card`/`SectionTitle`, `PageHeader` |
| `list/` | `DataList`, `ListEmpty` |
| `modals/` | `ModalShell` (moldura de toda modal), `ConfirmDialog`, `FormModal` |
| `navbar/` | o menu, a busca, a central de notificações e o menu do usuário |
| `table/` | `RowActions`, `TablePagination`, `CopyableValue` |
| `tabs/` | `SegmentedTabs`, `TabBar`/`TabItem`, `CountBadge` |

**Drawer × modal:** drawer é o aparte — ação curta com a página atrás ainda
útil (agendar a partir do cartão da Home). Formulário que é a tarefa vai em
`FormModal`. Os dois têm a mesma API; trocar é mudar o import.

## 8. Convenções visuais

- **Sem sombras.** Separação por filete fino (`ring-1 ring-black/5`) e só
  entre seções; hover de cartão com `ring-secondary/40`.
- **Cor só por token** (`--color-*` em `globals.css`, `@theme`): `primary`,
  `secondary` (dourado), `success`/`success-strong`, `danger`, `previsto`,
  `page`, `floral`… Nada de hexadecimal em classe.
- **Ícone de traço sempre pela `Svg`** (`ui/icons/Svg.tsx`): `currentColor`,
  pontas redondas, `aria-hidden`. Antes de desenhar um, procure em
  `ui/icons/glyphs`, `ui/icons/actions` e `agenda/agendaIcons`.
- **Carregando ocupa o lugar do que vai aparecer** — linhas inteiras numa lista,
  `Skeleton` na largura do dado, `LoadingCircle` no tamanho do selo. Nunca o
  estado vazio enquanto carrega.
- **Modal, drawer, gráfico e editor rico entram com `next/dynamic`** e só
  montam quando abrem.

## 9. HeroUI v3 — o que já custou tempo

- `@heroui/react` é *client-only*: todo arquivo que o importa precisa de
  `"use client"`. O `app/layout.tsx` continua Server Component porque o
  provider mora em `app/providers.tsx`.
- **Tabela:** a coleção do React Aria nasce no `Table.Content`, não no
  `Table`. Sem ele, o erro em runtime é "cannot be rendered outside a
  collection". Cada coluna precisa de `id`, uma delas de `isRowHeader`, e cada
  linha de `id` (o `key` do React não basta).
- **Tooltip:** o gatilho precisa ser o `Button` do HeroUI (quem consome o
  contexto do `TooltipTrigger`), e o `Tooltip.Content` vem **antes** dele.
  Com `<button>` puro a dica nunca abre.
- **Select múltiplo** não existe: é `Popover` + `ListBox selectionMode="multiple"`
  (`MultiSelectField`).
- **O `<select>` espelho** que o `Select` renderiza escondido tem como
  "rótulo" a soma das opções — por isso os e2e localizam por papel, não por
  `getByLabel` ([`TESTING.md`](TESTING.md)).
- **CSS do HeroUI mora na camada `components`.** Para vencer sem
  `!important`, o override fica fora de `@layer` (ver `formFields.css`).
- **Popover não modal fecha quando a página rola** (e quando o foco sai dele) —
  é do React Aria, sem opção para desligar. O `useHoverCard` deixa isso valer
  só para o cartão solto: o preso fica, senão rolar até o botão do fim do
  cartão jogaria fora a etapa escolhida. O Esc do cartão é do `useDismiss`
  (`isKeyboardDismissDisabled`): o do React Aria para a propagação e chegaria
  como mais um pedido de fechar, sem dizer que foi a tecla.

## 10. Decisões registradas

- [ADR 0001 — Formulário orientado a schema](adr/0001-schema-driven-forms.md)
- [ADR 0002 — Layout do cadastro de cliente: abas, Revisão e modos de preenchimento](adr/0002-client-form-layout.md)
- [Especificação financeira](FINANCE_SPEC.md) — competência × caixa, baldes disjuntos, por que Pagamentos não é receita.
