# Plano — tabelas, filtros e formulários orientados a schema (strategy + factory)

> ## 📋 Proposta — 01/10/2026
>
> Ainda **não implementado**. Este documento é a avaliação e o plano; nada do
> código descrito aqui existe ainda. Ao executar uma fase, marque o status dela
> na tabela da seção 6.
>
> **Revisão de 01/10/2026 (fim do dia).** Varredura do `src/` inteiro
> (37.332 linhas) procurando onde mais o padrão se aplica. Resultado: a área
> dos **formulários** repete o mesmo problema das tabelas, em escala maior e
> com uma consequência que as tabelas não têm — **divergência de validação**,
> não só de aparência. Entraram as seções 2.3, 3.2, 4.3 e as fases 7–8. O plano
> original (fases 0–6) não mudou.

## 1. A pergunta

Vale descrever as tabelas e os filtros por **schema** — colunas, campos e
ações como dados —, com **factory** para montar as peças e **strategy** para o
que varia por tipo? E, se valer, até onde?

**Resposta curta:** vale para a **casca** das tabelas, para as **colunas** e
para os **filtros**. Não vale para uma "fábrica de páginas" nem para escolher
renderização de célula por string.

Na revisão do fim do dia a pergunta ganhou uma terceira frente: **os
formulários**. Ali a resposta é mais forte que nas tabelas — vale, e vale
primeiro, porque o que está duplicado não é o estilo, é a **regra**.

## 2. O que existe hoje

| Tela | Tabela | Barra de filtro |
|---|---|---|
| Pagamentos | `components/payments/PaymentsTable.tsx` (249 linhas) | `components/payments/PaymentsFilters.tsx` |
| Carteira | `components/wallet/ExpensesTable.tsx` + `RevenuesTable.tsx` (~170 cada) | `components/wallet/WalletFilters.tsx` + ligação na página |
| Clientes | inline em `app/(private)/clientes/page.tsx` (825 linhas) | inline + `clientes/useClientFilters.ts` (com `DateRangePicker`) |
| Agenda | — | inline em `app/(private)/agenda/page.tsx` |
| Home | inline em `AppointmentsCard.tsx` (compacta) | busca própria |

### 2.1 O que se repete

- **Casca da tabela** — `ScrollContainer`, cabeçalho dourado
  (`h-12 … text-secondary uppercase after:content-none`), corpo de esqueleto,
  estado vazio, coluna de ações. ~60 linhas iguais em 4 lugares. Mudanças
  visuais (texto das linhas em `gray-100`, por exemplo) hoje são feitas
  arquivo a arquivo.
- **Barra de filtro** — fundo `bg-primary`, grade, botão "Limpar", rótulo
  dentro do campo. 4 versões; o rótulo "Status" cortado foi divergência entre
  elas.
- **Debounce da busca** — 6 cópias, com 400 ms e 500 ms.
- **Paginação** — `TablePagination` já existe, mas Clientes e a Home ainda
  montam a sua.
- **Filtro → query** — cada página traduz do seu jeito (`bucketQuery`,
  `listParams` na Carteira, `query` em Pagamentos).

### 2.2 O que de fato difere

- **Células**: selo de status por balde, parcela, CPF copiável, chips de
  situação, botões de contato.
- **Ações por linha**: "registrar recebimento" só em aberto; "excluir" só para
  quem pode (`podeDestruir`); "ver detalhes" sempre primeiro.

É essa diferença que o desenho precisa acomodar sem virar exceção.

### 2.3 Formulários — o mesmo problema, um degrau atrás

A varredura do fim do dia mediu a área de formulários. É maior que a das
tabelas e o prejuízo é de outra natureza.

**O formulário de cliente existe três vezes:**

| Implementação | Linhas | Campos (`Field`/`SelectField`) | `useState` | `as any` | Chamadas a `validate*` |
|---|---|---|---|---|---|
| `app/(private)/clientes/novo/page.tsx` + `components/clients/form/sections/*` | 1.226 | 48 rótulos nas seções | 15 | 0 | **5** |
| `components/ui/modals/DetailsClientModal/DetailsClientModal.tsx` | 1.469 | 29 | 19 | 19 | **0** |
| `components/ui/modals/AddNewClientModal/AddNewClientModal.tsx` | 443 | 22 | 5 | 0 | **0** |

Sobreposição de rótulos: **25 dos 33** rótulos do `DetailsClientModal` também
existem nas seções (CPF, RG, Nome completo, Nome da mãe, Data de nascimento,
E-mail, Celular, Telefone recado, Estado civil, Gênero, Benefício pretendido,
Situação do benefício…). Nenhuma das duas modais importa
`components/clients/form/sections/*`.

**O que isso custa, além de linha repetida.** O `DetailsClientModal` **grava**
— `updateClient`, `updateAddress`, `updateInterview` — e não chama validador
nenhum. Os mesmos CPF, RG, e-mail e datas que `/clientes/novo` barra com
`lib/validators` passam direto quando a pessoa edita pela ficha. A duplicação
de tabela produz divergência de cor; a de formulário produz **divergência de
regra de negócio**, e o banco fica com o resultado.

**O degrau anterior já está construído.** `hooks/useSectionForm.ts` já trata
as regras como dados (`FieldRules<V>` = mapa campo → validador) e já diz, no
próprio comentário, que é o passo antes do schema. Ele é usado pelas **7
seções** de `components/clients/form/sections/*` e por `clientes/novo` — e por
mais nada. As duas modais e o `AppointmentsCard` (25 `useState` num escopo)
continuam com um `useState` por campo.

**A tríade `validate` / `toRequest` / `fromResponse` se repete incompleta.**
`lib/validators/validators.ts` concentra 20 validadores de domínio
(CPF, RG, NIT, CTPS, CEP, UF, data de nascimento, data passada…) — essa parte
está certa. O que varia é quem os usa e quão completo é o arquivo de form:

| Arquivo | Linhas | `validate` | `toRequest` | `fromResponse` |
|---|---|---|---|---|
| `components/home/appointments/appointmentForm.ts` | 289 | ✅ | ✅ | ✅ |
| `components/wallet/entryForms.ts` | 408 | ✅ (2 formas) | ✅ (2) | ❌ |
| `components/payments/benefitPaymentForm.ts` | ~200 | ✅ (2) | ✅ | ❌ |
| `components/profile/profileForm.ts` | ~150 | ✅ (2) | ✅ (2) | ❌ |
| `components/payments/paymentForm.ts` | 196 | ✅ | ❌ | ❌ |
| `components/clients/form/payloads.ts` | — | ❌ | ✅ (6) | ❌ |

Seis arquivos, o mesmo contrato, nenhum igual ao outro. Sem `fromResponse`, a
volta do servidor é remontada à mão no ponto de uso — é daí que vêm os 19
`as any` do `DetailsClientModal`.

### 2.4 Painéis de leitura

`EntryDetailsDrawer` (659), `EntryReceiptView` (404), `EntryEssentialView`
(303) e `RegisterReceiptModal` repetem o par rótulo/valor em marcação solta —
só 4 `<dt>` nos quatro arquivos somados, o resto é `div` com duas `span`.
É o mesmo schema do formulário visto em modo leitura, e cabe no mesmo desenho
(seção 4.3) sem componente novo.

## 3. Avaliação

| Peça | Usar? | Por quê |
|---|---|---|
| Schema de colunas — `ColumnDef<T>[]` | ✅ | Some com a casca repetida; estilo, esqueleto e vazio num lugar. |
| Factory de colunas — `dateColumn`, `currencyColumn`, `statusColumn`… | ✅ | Formatação e alinhamento sempre iguais, com tipo checado sobre o campo. |
| Strategy por **tipo de campo de filtro** (busca, seleção, múltipla, data, intervalo) | ✅ | Encaixe natural: cada tipo tem um componente **e** uma serialização para query. |
| Schema de **ações** por linha | ✅ | Fixa ordem (detalhes primeiro), visibilidade por permissão/estado e os `label` que os e2e procuram. |
| Strategy de célula **por string** (`{ kind: "currency" }`) | ❌ | Perde o tipo e atrapalha célula sob medida. `cell: (row) => ReactNode` + factories faz o mesmo com segurança. |
| **Fábrica de páginas** inteiras | ❌ | Páginas diferem demais (cards de resumo, abas, carga sob demanda, modais); viraria configuração cheia de exceção. |
| Tabela compacta da Home | ❌ | Desenho de cartão, não de tabela; forçar no schema só cria exceção. |

### 3.1 Restrições técnicas que o desenho precisa respeitar

- **Coleção do React Aria.** A `Table` do HeroUI é uma coleção: o genérico
  precisa manter `Table.Header columns={…}` e `Table.Body items={…}` com
  função-filho. Há um comentário em Clientes sobre o erro "outside a
  collection" — é o que acontece quando isso se perde.
- **Tailwind estático.** Classes vêm de mapas com strings literais
  (`ALIGN_CLASS = { left: "text-left", … }`), nunca de interpolação
  (`` `text-${align}` ``), ou o Tailwind não as gera.
- **Seletores dos e2e.** `label` de ação vira campo **obrigatório**; nomes
  como "Editar despesa", "Ver detalhes da receita" e a aba "Entradas do mês"
  não podem mudar.

### 3.2 Avaliação dos formulários

| Peça | Usar? | Por quê |
|---|---|---|
| Schema de campos — `FieldDef[]` por seção | ✅ | Rótulo, máscara, validador, obrigatoriedade e largura num lugar. É o que faz a modal e a página concordarem sobre o que é um CPF válido. |
| Strategy por **tipo de campo** (texto, select, multiselect, data, switch, moeda) | ✅ | Mesmo encaixe dos filtros: cada tipo tem componente, máscara e validador padrão. Reaproveita `lib/validators` e `lib/masks`, que já existem e estão corretos. |
| `fromResponse` derivado do schema | ✅ | Mata os 19 `as any` do `DetailsClientModal` na raiz: a volta do servidor passa a ser tipada pelo mesmo schema que montou o formulário. |
| **Modo leitura** a partir do mesmo schema | ✅ | Os painéis da seção 2.4 são o schema com `isReadOnly`. Zero componente novo. |
| `toRequest` derivado do schema | ⚠️ | Só o caso simples (campo ↔ campo). Os seis `toRequest` de `clients/form/payloads.ts` montam sub-recursos (endereço, entrevista, período de incapacidade) e continuam escritos à mão. |
| **Gerar o JSX da seção inteira** por configuração | ❌ | Mesmo motivo da "fábrica de páginas": a ficha do cliente tem abas, upload, senha do INSS auditada e campos que aparecem por situação. O schema descreve o **campo**; a seção continua sendo JSX. |
| Unificar as três implementações numa só | ❌ | A modal de criação é enxuta de propósito (4 selects) e a ficha tem modo leitura. O que precisa ser um é o **schema**, não o componente. |

**Ordem importa.** Formulário vem antes de tabela na prioridade, apesar de
este documento ter nascido pelas tabelas: a tabela errada mostra cor errada, o
formulário sem validador grava dado inválido.

## 4. Desenho proposto

### 4.1 Tabela

```ts
// src/components/ui/table/DataTable.tsx
export type ColumnDef<T> = {
  id: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  rowHeader?: boolean;
  className?: string;
};

export type RowAction<T> = {
  id: string;
  label: string;            // nome acessível — os e2e dependem dele
  icon: React.ComponentType;
  tone?: "neutral" | "secondary" | "success" | "danger";
  visible?: (row: T) => boolean;
  onPress: (row: T) => void;
};

<DataTable<T>
  ariaLabel="Despesas do escritório"
  columns={columns}
  actions={actions}
  items={items}
  isLoading={isLoading}
  emptyMessage="Nenhuma despesa com vencimento neste mês."
  minWidth={900}
/>
```

```ts
// src/components/ui/table/columns.tsx — factories
textColumn("description", "Descrição", { rowHeader: true });
dateColumn("dueDate", "Vencimento");          // formatDateBR, centro, nowrap
currencyColumn("amount", "Valor");            // formatBRL, direita, tabular-nums
statusColumn("Status", (row) => bucketOf(row)); // StatusBadge via BUCKET_BADGE
// escape hatch, sempre disponível:
{ id: "cpf", header: "CPF", cell: (c) => <CopyableValue value={c.cpf} /> }
```

### 4.2 Filtros

```ts
// src/components/ui/filters/schema.ts
const walletFilters = defineFilters({
  searchTerm: searchField({ placeholder: "Descrição ou fornecedor" }),
  bucket:     selectField({ label: "Status", options: BUCKET_OPTIONS, placeholder: "Todos" }),
  category:   multiSelectField({ label: "Categoria", options: CATEGORY_OPTIONS }),
  paymentMethod: multiSelectField({ label: "Forma", options: METHOD_OPTIONS }),
});
// O tipo dos valores sai do schema: FilterValues<typeof walletFilters>.

// Strategy por tipo de campo: componente + serialização.
const FIELD_STRATEGIES = {
  search:      { Component: SearchInput,      toQuery: (v) => v.trim() || undefined, debounce: true },
  select:      { Component: SelectField,      toQuery: (v) => v || undefined },
  multiSelect: { Component: MultiSelectField, toQuery: (v) => (v.length ? v : undefined) },
  date:        { Component: DateField,        toQuery: (v) => v || undefined },
  dateRange:   { Component: DateRangeField,   toQuery: (v) => v && { from: …, to: … } },
};

const filters = useFilters(walletFilters);      // estado, debounce, clear, hasActive
<FilterBar schema={walletFilters} state={filters} />
const params = filters.toQuery({
  // transformação sob medida por campo — o balde continua sendo `bucketQuery`
  bucket: (v) => bucketQuery(v, { dueFrom: range.from, dueTo: range.to }, todayIso()),
});
```

### 4.3 Formulários

Mesmo formato dos filtros, de propósito: `FIELD_STRATEGIES` ganha máscara e
validador padrão, e `useSectionForm` passa a receber o schema em vez de
`initial` + `rules` montados à mão.

```ts
// src/components/clients/form/schema/personalData.ts
export const personalDataSchema = defineSection({
  fullName:      textField({ label: "Nome completo", required: true }),
  cpf:           cpfField({ label: "CPF", required: true }),   // máscara + validateCPF
  rg:            rgField({ label: "RG" }),
  birthDate:     dateField({ label: "Data de nascimento", rule: validateBirthDate }),
  email:         emailField({ label: "E-mail" }),
  mobilePhone:   phoneField({ label: "Celular", required: true }),
  maritalStatus: selectField({ label: "Estado civil", options: MARITAL_OPTIONS }),
  gender:        selectField({ label: "Gênero", options: GENDER_OPTIONS }),
});
// Tipos derivados: SectionValues<typeof personalDataSchema>, SectionErrors<…>.
```

```ts
// Strategy por tipo: componente + máscara + validador padrão.
const FIELD_STRATEGIES = {
  text:     { Component: Field,            rule: () => null },
  cpf:      { Component: Field, mask: maskCPF,     rule: validateCPF },
  rg:       { Component: Field, mask: maskRG,      rule: validateRG },
  phone:    { Component: Field, mask: maskCelular, rule: validatePhone },
  email:    { Component: Field, mask: maskEmail,   rule: validateEmail },
  cep:      { Component: Field, mask: maskCEP,     rule: validateCEP },
  date:     { Component: Field,              rule: validateDate },
  currency: { Component: Field,              rule: validateAmount },
  select:   { Component: SelectField,        rule: validateRequiredSelection },
  switch:   { Component: Switch,             rule: validateSwitch },
};
```

`lib/masks` hoje exporta `maskCPF`, `maskRG`, `maskCelular`, `maskTelefone`,
`maskEmail`, `maskCEP`, `maskNIT`, `maskCTPS` — cobre a tabela acima menos
data e moeda, que hoje são formatadas no ponto de uso. Se a 7.1 precisar
delas, entram em `lib/masks` como `maskData` e `maskMoeda`, seguindo o nome
em português dos vizinhos.

Três consumos do mesmo schema:

```tsx
// 1. estado + validação (substitui initial/rules à mão)
const form = useSectionForm(personalDataSchema);

// 2. os campos (a seção continua sendo JSX — só os <Field> saem do schema)
<SectionFields schema={personalDataSchema} form={form} isReadOnly={!isEditing} />

// 3. ida e volta tipadas
const body = toValues(personalDataSchema, form.values);
form.reset(fromResponse(personalDataSchema, response.data));  // mata os `as any`
```

E o modo leitura da seção 2.4 é o mesmo schema sem `form`:

```tsx
<SectionReadout schema={entrySchema} value={entry} />  // rótulo/valor, "—" no vazio
```

## 5. Plano por fases

Cada fase é **um PR**, **sem mudança de comportamento**, e termina com unit
tests verdes, e2e verdes e prints iguais aos da Fase 0.

### Fase 0 — rede de segurança
- Prints de referência de Pagamentos, Carteira (as duas abas + painel de
  detalhes) e Clientes, com **API mockada** via `context.route` no Playwright
  — o mesmo método usado para validar o painel de detalhes, que não depende do
  backend estar no ar.
- Lista dos seletores dos e2e que dependem de rótulo (`carteira-crud`,
  `pagamentos-crud`, `financeiro-restrito`).

### Fase 1 — peças pequenas
- `src/hooks/useDebouncedValue.ts`; trocar as 6 cópias e padronizar em 400 ms.
- Clientes passa a usar `TablePagination`.

### Fase 2 — `DataTable` + factory de colunas + ações
- `DataTable.tsx`, `columns.tsx`, tipo `RowAction`.
- Migrar, nesta ordem: **Despesas** (piloto) → Receitas → Pagamentos.
- `ExpensesTable` etc. continuam existindo como casca fina sobre o
  `DataTable`: as páginas não mudam nesta fase.
- Unit tests das factories (formatação, alinhamento, "—" no vazio) e da
  visibilidade das ações.

### Fase 3 — Clientes
- Extrair a tabela da página usando `cell` sob medida (CPF copiável, chips,
  contato). Reduz a página de 825 linhas.

### Fase 4 — filtros por schema + strategy
- `defineFilters`, factories de campo, `FIELD_STRATEGIES`, `useFilters`,
  `FilterBar`.
- Migrar: Carteira → Pagamentos → Agenda → Clientes (por último, por causa
  do intervalo de datas).
- O rótulo dentro do campo (`labelInside`) vira o padrão da barra.

### Fase 5 — `useResourceList` (opcional)
- Juntar filtros → params, página presa à consulta (`listKey`) e
  `useCachedList` num hook. Carteira usa duas vezes (uma por aba, com carga
  sob demanda), Pagamentos e Clientes uma.
- Só fazer se, depois das fases 2–4, as páginas ainda repetirem essa ligação.

### Fase 6 — limpeza e registro
- Remover código morto; registrar o padrão aqui e no `CLAUDE.md`, para tabela
  nova nascer no schema.

### Fase 7 — schema de campo (a frente dos formulários)

Pode correr em paralelo às fases 2–4: compartilha o vocabulário
(`FIELD_STRATEGIES`), não o código.

- **7.0 — tapar o buraco primeiro, sem schema.** Ligar os validadores que já
  existem ao `DetailsClientModal`. É a divergência da seção 2.3 e não deve
  esperar refatoração nenhuma: PR curto, só `lib/validators` no `handleSave`.
- **7.1 — `defineSection` + `FIELD_STRATEGIES` + `SectionFields`.**
  `useSectionForm` passa a aceitar schema; a assinatura atual
  (`initial` + `rules`) continua válida, para migrar seção a seção.
- **7.2 — piloto: `PersonalDataSection`** (13 campos, já usa
  `useSectionForm`). Menor risco: o estado não muda, só a origem das regras.
- **7.3 — resto das seções de cliente** (profissional, endereço, serviço,
  entrevista, endereços).
- **7.4 — `fromResponse` derivado** e remoção dos 19 `as any` do
  `DetailsClientModal`.
- **7.5 — as duas modais passam a consumir os mesmos schemas.** Aqui a
  duplicação de 25 rótulos acaba, e é o PR que de fato reduz linha.
- **7.6 — `AppointmentsCard`**: 25 `useState` → um `useSectionForm` com
  schema. Fica para o fim por ser o arquivo maior do projeto (1.985 linhas).

Cada sub-fase termina com `pnpm typecheck` limpo e os e2e de cadastro e
edição de cliente verdes.

### Fase 8 — `SectionReadout` (painéis de leitura)
- `EntryDetailsDrawer`, `EntryReceiptView`, `EntryEssentialView`,
  `RegisterReceiptModal` passam a desenhar rótulo/valor pelo schema.
- Só depois da 7.1: sem schema não há o que ler.

## 6. Status

| Fase | Status | PR |
|---|---|---|
| 0 — rede de segurança | ⏳ pendente | — |
| 1 — peças pequenas | ⏳ pendente | — |
| 2 — `DataTable` + colunas + ações | ⏳ pendente | — |
| 3 — Clientes | ⏳ pendente | — |
| 4 — filtros por schema | ⏳ pendente | — |
| 5 — `useResourceList` | ⏳ opcional | — |
| 6 — limpeza | ⏳ pendente | — |
| **7.0 — validadores no `DetailsClientModal`** | ⏳ **pendente — prioridade** | — |
| 7.1 — `defineSection` + strategies | ⏳ pendente | — |
| 7.2 — piloto `PersonalDataSection` | ⏳ pendente | — |
| 7.3 — demais seções de cliente | ⏳ pendente | — |
| 7.4 — `fromResponse` derivado | ⏳ pendente | — |
| 7.5 — modais consomem os schemas | ⏳ pendente | — |
| 7.6 — `AppointmentsCard` | ⏳ pendente | — |
| 8 — `SectionReadout` | ⏳ pendente | — |

### 6.1 Ordem recomendada

**7.0 → 1 → 7.1 → 7.2 → 2 → 3 → 7.3…7.5 → 4 → 8 → 7.6 → 5 → 6.**

A 7.0 vem primeiro porque é correção, não refatoração: hoje a ficha do cliente
grava CPF inválido. A 1 vem logo depois por ser barata. O resto alterna
tabela e formulário para nenhum PR ficar grande demais.

## 7. Ganho esperado e riscos

**Tabelas e filtros (estimativa, não medida):** as três tabelas financeiras
para algo perto de um terço do tamanho; Clientes perde boa parte das 825
linhas; mudanças visuais de tabela e filtro passam a ser uma linha. A Fase 2 dá
o número real.

**Formulários (estimativa, não medida):** os três caminhos de cliente somam
**3.138 linhas** com 25 rótulos repetidos; a 7.5 deve tirar algo na casa do
milhar. Mas o ganho que importa não é linha: é a ficha e o cadastro passarem a
validar igual, e os 19 `as any` saírem por construção em vez de um a um.

| Risco | Mitigação |
|---|---|
| Abstrair demais | `cell` sob medida sempre disponível; nada de página por configuração. |
| Quebrar a coleção do React Aria | Prints da Fase 0 + e2e a cada PR. |
| Perder nomes que os e2e procuram | `label` obrigatório em `RowAction`. |
| Classes do Tailwind não geradas | Mapas com strings literais, sem interpolação. |
| 7.0 revelar dados inválidos já gravados | O validador é de formulário, não de carga: campo inválido que veio do servidor mostra erro, não impede abrir a ficha. Vale conferir o CPF dos registros existentes antes de exigir no `handleSave`. |
| Schema de campo virar gerador de tela | A seção continua JSX; o schema só descreve campos. Quem precisar de layout fora do padrão escreve o `<Field>` à mão, como hoje. |
| 7.6 em arquivo de 1.985 linhas | Última sub-fase, depois de o desenho estar provado em 7 seções. |



Despesas 12 e Entradas 4.
São dois summary a mais porque os cards somam o que foi pago no mês, e o badge conta o que vence no mês, que é o mesmo recorte da tabela. Com parâmetros de data diferentes, não dá para reaproveitar uma consulta na outra.
Os badges não batem exatamente com o total da tabela. Antes, com o número vindo da lista, eles mostravam 13 e 5; agora mostram 12 e 4. O summary deixa de fora os lançamentos cancelados, como os cards, e a lista inclui os cancelados. No banco local há 1 despesa cancelada, o que explica pelo menos essa diferença. Então a aba diz "12" e a paginação embaixo diz "1 a 10 de 13". O badge também ignora os filtros da tabela: ele conta o mês inteiro, e o total filtrado aparece na paginação.
Se preferir que o badge bata com a tabela, há duas saídas:


podemos otimizar isso no backend para fazermos menos chamadas?