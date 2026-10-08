# Tânia Melo Advocacia — frontend

Next.js 16 (App Router, `output: "export"`), HeroUI v3, Tailwind v4, React 19.

**Idioma.** Identificadores em inglês — nome de arquivo, função, variável,
tipo, prop, chave interna. Texto de interface e comentário em português:
quem lê a tela e quem lê o porquê de uma decisão são a mesma pessoa, e ela
fala português. O que espelha o backend (chave de enum, valor que a API
devolve) fica como a API escreve, inglês ou não.

## Comandos

- `pnpm lint` · `pnpm typecheck` · `pnpm test` — os três limpos antes de fechar qualquer mudança.
- e2e: ver `docs/E2E_PLAYWRIGHT.md`. O build é estático (`out/`): `next start` não serve export; sirva `out/` com um servidor estático e aponte `E2E_BASE_URL` para ele.

## Padrões

Cada item aponta a peça que já existe. Tela nova nasce nelas; não crie uma variação paralela.

### Formulários
- Campos declarados com `defineSection` (`components/ui/form/schema.ts`): o `kind` traz máscara, validador e controle (`FIELD_STRATEGIES`); regra própria em `rule`.
- Estado com `useSectionForm({ schema })`; desenho com `SchemaField` (aceita `isReadOnly` e `isLoading`).
- Formulário sem schema (financeiro, compromisso, profile): validador puro + `useFieldErrors` — erro aparece ao mexer no campo e todos de uma vez no "Salvar".
- Schemas de cliente em `components/clients/form/schemas.ts`, usados pelo cadastro (`ClientFormPage`) **e** pela ficha (`ClientDetailsModal`). A ficha lê e edita no mesmo desenho: vista, nada se mexe; editando, grava tudo no "Salvar". `PUT /clients/{id}` substitui o recurso inteiro: monte o corpo com `clientSheet.toUpdateRequest`.

### Listas e filtros
- Lista paginada do servidor: `usePagedList` (página presa à consulta, cache por página, `enabled` para carga sob demanda).
- Linhas: `DataList` + `ListColumn<T>`; ações por linha: `RowActions` com `viewAction`/`editAction`/`deleteAction`.
- Filtros: `defineFilters` + `useFilters` + peças de `ui/filters/FilterBar.tsx` (`SearchInput`, `Segmented`, `FilterField`, `FilterChips`, `ClearFilters`). "Filtro ativo" é relativo ao padrão da tela.
- Busca digitada: `useDebouncedValue` (400 ms; limpar é imediato).
- Abas: `SegmentedTabs` (`ui/tabs`; `hideSingle` não desenha barra para uma aba só) ou, com painéis próprios, `TabBar` + `TabItem`; número na aba com `CountBadge`. Seletor sem painel (filtro, alternar vista): `Segmented`.

### Requisições
- Nada de pedir duas vezes a mesma coisa: `createRequestCache` (lista/tela) ou `createSessionCache` (dados da sessão, limpos no logout por `clearSessionCaches`).
- Leituras independentes: `useSettled` + `settledValue` — "carregando" é `null`, derivado, e uma falha não apaga as outras.
- Modal, drawer, gráfico e editor rico entram com `next/dynamic` e só montam quando abrem.
- Mensagem de falha para a tela: `messageOf` (`lib/errorMessage`). Link externo: `openInNewTab`.

### Carregamento
O que carrega ocupa o espaço do que vai aparecer: os rótulos e a moldura aparecem de verdade, e nada salta quando o dado chega. Nunca mostre o estado vazio ("Nenhum…", `0`) enquanto carrega.
- Tabela/lista: 10 linhas inteiras (`RowSkeletons`, `SKELETON_ROW_COUNT`).
- Texto e número em cartão: `Skeleton` na largura do dado, não do rótulo.
- Selo, contagem, dica: `LoadingCircle` (`ProgressCircle` indeterminado) no tamanho do selo.
- Acordeão e drawer: só os valores em skeleton.
- Vazio ou falha no lugar do conteúdo: `Notice` (`ListEmpty` nas listas paginadas).

### Visual
Sem sombras, pouco traço (divisor só entre seções), grupos de ação via `ActionGroup`. Listas sem zebra.
- Modal: `ModalShell` (moldura, animação, cabeçalho com ícone); confirmação: `ConfirmDialog` (aceita conteúdo próprio e `isConfirmDisabled`).
- Painel de registro com detalhe e edição: `RecordDrawer`.
- Cartão que o hover mostra e o clique prende: `useHoverCard`.
- Selo em cápsula ("principal", "a enviar"): `Pill`; status: `StatusBadge`.
- Ícone de traço: `Svg` (`ui/icons/Svg.tsx`) — procure em `actions`, `glyphs` e `agendaIcons` antes de desenhar outro.

### Estudos visuais
As telas com `ViewModelPicker` (ficha do cliente, Carteira…) têm opções em estudo. Não escreva nem altere testes de uma opção antes de ela ser escolhida.
