# Revisão de arquitetura e clean code — frontend

> Levantamento sobre `src/` (9.365 linhas, 0 testes). Os itens estão ordenados
> por impacto: quanto mais alto, maior o custo de deixar como está.

---

## 1. Panorama

| Métrica | Valor | Leitura |
|---|---|---|
| Linhas em `src/` | 9.365 | — |
| Maior arquivo | `AppointmentsCard.tsx` — **1.811** | 19% do projeto num arquivo |
| 2º maior | `DetailsClientModal.tsx` — **958** | com **43** `as any` |
| `useState` num só componente | **25** (`AppointmentsCard`) | — |
| Arquivos de teste | **0** | — |
| Enums com boilerplate idêntico | **8** | ~35 linhas repetidas cada |
| Enums vazios (0 bytes) | 2 | `retirementType`, `intendedBenefit` |

O que está **bom** e deve ser preservado: a camada de dados (`services/` +
`interfaces/` + `constants/endpoints/paths.ts`) está coesa, tipada e alinhada
ao backend; o `axiosService` concentra tenant, refresh e erro num lugar só; o
`notificationService` é um bom exemplo de responsabilidade única.

O problema não é a camada de dados — é a **camada de apresentação**.

---

## 2. Os três problemas estruturais

### 2.1 `AppointmentsCard.tsx` — componente-Deus (1.811 linhas, 25 `useState`)

Um único componente hoje acumula:

- 3 caches independentes (`yearSummaryCache`, `appointmentsCache`, `modalPagesCache`)
- 3 conjuntos de estado de carregamento (`summaryLoading`, `loadingMonths: Set`, `modalLoadingKeys: Set`)
- o formulário completo (`formValues`, `formBaseline`, `isSubmitting`)
- o fluxo de descarte (`isDiscardConfirmOpen`)
- as ações de linha (`rowAction`, `cancelJustification`, `completingId`, …)
- busca com debounce, paginação por status, filtro por ano
- 8 componentes de ícone declarados inline

Sintoma objetivo: **25 `useState` no mesmo escopo**. Toda vez que qualquer um
muda, a função inteira reexecuta. Não há como testar a paginação sem montar o
drawer, nem alterar o formulário sem risco de mexer no cache.

**Decomposição sugerida** (sem mudar comportamento):

```
appointments/
  AppointmentsCard.tsx        // orquestra, ~150 linhas
  useAppointmentsData.ts      // summary + lista + cache + loading
  useAppointmentForm.ts       // form, baseline, dirty, submit
  useAppointmentActions.ts    // cancel / complete / delete / reschedule
  AppointmentList.tsx         // apresentação
  AppointmentsModal.tsx       // "ver todos" paginado
  icons.tsx                   // 8 ícones
```

Os três hooks são testáveis isoladamente e o componente vira montagem.

### 2.2 `DetailsClientModal.tsx` — 43 `as any` (tipagem existe, mas é contornada)

```ts
// DetailsClientModal.tsx:240-242
(payload as any)?.maritalStatus ??
  (payload as any)?.marital_status_name ??
  (payload as any)?.marital_status_id,
```

Esse padrão se repete para `situation`, `benefit`, `full_name`, `birth_date`,
`mother_name`, `mobile_phone`… São **defesas contra três formatos possíveis**
(camelCase, snake_case, `_id`) escritas na mão, campo a campo.

Isso é herança da época em que o backend era instável. Hoje o contrato está
fechado e tipado em `interfaces/client/Client.interface.ts` — as defesas viraram
ruído que **desliga o TypeScript exatamente onde ele seria mais útil**. Se o
backend renomear um campo, nada quebra em tempo de compilação; a tela
simplesmente mostra vazio.

**Correção:** um único adaptador tipado na fronteira (`toClientViewModel`),
com o `as any` isolado em uma função de ~20 linhas em vez de espalhado por 43
pontos. Se ainda houver dúvida sobre o formato real, o lugar de resolver é
uma chamada ao endpoint — não `??` em cascata.

### 2.3 Duplicação entre telas

| Duplicado | Onde |
|---|---|
| `buildPageList()` | `clientes/page.tsx:62` **e** `AppointmentsCard.tsx:120` |
| `SKELETON_ROWS` | `clientes/page.tsx:83` **e** `AppointmentsCard.tsx:97` |
| Ícones (calendário, vídeo, lixeira…) | redeclarados em 4 arquivos |
| `useEffect` de fetch + loading + error + cache | 5 telas, cada uma à sua maneira |

Os dois primeiros são cópias literais. Devem ir para `lib/pagination.ts` e
`components/ui/table/skeleton.tsx`.

O quarto é o mais caro: **nenhuma tela busca dados do mesmo jeito**. Um
`useApiResource` (ou TanStack Query, que resolve cache/revalidação/dedupe de
graça) eliminaria as três variações de cache manual que existem hoje.

---

## 3. Clean code — achados pontuais

**Acoplamento posicional em selects.** Em `AddNewClientModal.tsx:342`:

```ts
options={SituationOptions.map((o, i) => ({ id: String(i + 1), label: o.label }))}
// ...
situation: labelAt(SituationOptions, Number(form.situacaoBeneficio))
```

O valor no formulário é o **índice** (`"1"`, `"2"`…), convertido de volta na
submissão. Funciona, mas amarra o formato de dado à **ordem do array**.
Reordenar `SITUATION_ENTRIES` — algo que ninguém imagina ser perigoso — muda
silenciosamente o significado de todo formulário aberto. O `id` deveria ser a
chave do enum (`o.value`), que já existe.

**`as never` para calar o compilador.** `clientes/page.tsx:405,410`:

```ts
const handleBenefitChange = ((keys: unknown) => { ... }) as never;
```

Resolve o tipo variável de `onSelectionChange` do React Aria, mas apaga toda a
checagem. Um `Selection` tipado (`Set<Key> | "all"`) daria o mesmo resultado
sem o `never`.

**Dois enums vazios.** `retirementType/RetirementType.ts` e
`intendedBenefit/IntendedBenefit.ts` têm 0 bytes. Ou implementam ou saem.

**`RetirementTypeOptions` mora em `Situation.ts`.** Comentado como
"Compatibility" — é dívida explícita esperando alguém. Um alias vivendo no
arquivo errado sobrevive por anos.

**Zero testes.** Com 9.365 linhas e uma migração de major version recente, a
única rede de proteção hoje é o `tsc`. As funções puras que já extraímos
(`appointmentForm.ts`, `buildPageList`) são o ponto de entrada barato: testam
regra de negócio sem montar componente.

---

## 3.5 Estrutura e implementação dos componentes

### 3.5.1 `"use client"` em 23 de 23 componentes — o RSC está desligado

Só `app/layout.tsx` e `app/(private)/layout.tsx` são Server Components. **Todo o
resto da árvore é cliente.** Num projeto Next.js 16 App Router, isso descarta o
principal ganho da versão: o JavaScript de cada componente vai inteiro para o
browser, mesmo o que nunca reage a nada.

Parte disso é inevitável — o HeroUI v3 é client-only, então quem o importa
precisa ser cliente. Mas **8 componentes não importam HeroUI**:

```
ui/Navbar/Navbar.tsx          home/StatCard.tsx
home/ContributorPipeline.tsx  home/PendingForms.tsx
home/UpcomingRevenues.tsx     home/MonthlyBalance.tsx
home/PendingDocuments.tsx     home/ui.tsx
```

Desses, `ContributorPipeline` (Swapy), `MonthlyBalance` (Chart.js) e `Navbar`
(`usePathname`) precisam ser cliente de fato. Mas **`ui.tsx`, `StatCard`,
`PendingForms`, `UpcomingRevenues` e `PendingDocuments` são funções puras de
props → JSX**. Marcá-los como cliente é custo sem contrapartida.

O `"use client"` foi aplicado por reflexo, arquivo a arquivo, em vez de na
fronteira. A regra correta é: **marque o componente mais alto que precisa de
interatividade** — os filhos herdam.

### 3.5.2 Não existe regra de quem busca dados

| Buscam os próprios dados (5) | Recebem por props (12) |
|---|---|
| `Navbar` (logout) | `Drawer`, `Field`, `NotBillableSwitch` |
| `DetailsClientModal` | `DeleteClientModal`, `SituationChips` |
| `AddNewClientModal` | `ContributorPipeline`, `UpcomingRevenues` |
| `AppointmentsCard` | `PendingDocuments`, `StatCard`, `PendingForms` |
| **`AppointmentFormFields`** | `MonthlyBalance`, `ui.tsx` |

O modelo está partido ao meio, e o caso mais problemático é o último:

```ts
// AppointmentFormFields.tsx:23 — um componente de CAMPOS de formulário
import { clients as fetchClients } from "@/services/clientService";
```

Um componente cuja responsabilidade é renderizar inputs abriu uma conexão HTTP.
Isso o torna impossível de renderizar em Storybook, impossível de testar sem
mock de rede, e acopla o formulário de compromisso ao serviço de clientes.

A busca de cliente deveria ser um `useClientSearch()` no pai, passando
`suggestions` e `onSearch` como props — o campo continua burro.

### 3.5.3 `home/ui.tsx` é um saco de gatos

Um arquivo chamado `ui.tsx` exporta 8 coisas sem relação entre si: um ícone
(`CalendarIcon`), primitivos de layout (`Card`, `SectionTitle`), selos
(`DeltaBadge`, `StatusBadge`), um controle (`MonthPill`) e um link
(`SeeAllLink`).

Nomes genéricos como `ui`, `utils` e `helpers` são onde código vai morar quando
ninguém decidiu onde ele mora. O arquivo cresce, vira dependência de todo mundo
e nunca é dividido. Separar em `ui/feedback/` (badges), `ui/layout/` (Card,
SectionTitle) e `ui/icons/` custa 20 minutos agora e evita o arquivo de 600
linhas daqui a seis meses.

### 3.5.4 Convenções inconsistentes

**Pastas** misturam PascalCase e lowercase sem critério:

```
components/ui/Drawer/          components/ui/form/
components/ui/Navbar/          components/ui/modals/
components/ui/NotBillableSwitch/
```

**Exports** misturam os dois estilos: 13 arquivos com `export default function`,
3 com `export function` nomeado (`Field.tsx`, `ui.tsx`, `SituationChips.tsx`).

**Barrels**: existe exatamente um `index.ts` (`lib/validators/`). Ou é padrão do
projeto, ou não é — hoje é acidente.

Nada disso quebra nada. Mas cada inconsistência é uma microdecisão que todo
mundo que entra no projeto precisa tomar de novo.

### 3.5.5 Memoização invertida

```
AppointmentsCard.tsx  15 usos de useMemo/useCallback
MonthlyBalance.tsx     4
ContributorPipeline    4
demais componentes     0
```

O componente que mais memoiza é justamente o que precisa ser **quebrado**, não
otimizado — 15 `useMemo` são um sintoma de que há trabalho demais num escopo só.

E a memoização que existe nos filhos é anulada pelo pai. Em
`home/page.tsx`, quatro componentes recebem **arrays literais inline**:

```tsx
<PendingForms stats={[ ... ]} />      // linha 80
<UpcomingRevenues items={[ ... ]} />  // linha 108
<MonthlyBalance slices={[ ... ]} />   // linha 125
<PendingDocuments items={[ ... ]} />  // linha 136
```

Cada render da página cria arrays novos, então qualquer `React.memo` nesses
componentes falharia na comparação por referência. (Hoje é inofensivo porque
são dados mockados — os 4 `TODO(backend)` da página. Passa a importar quando
virarem estado real.)

---

## 4. Onde cabe *schema-driven* + Strategy/Factory

Três lugares, do mais óbvio ao mais sutil.

### 4.1 Formulários de cliente — **o caso mais forte**

`AddNewClientModal` e `DetailsClientModal` renderizam **os mesmos ~20 campos**,
cada um com sua máscara, obrigatoriedade e serialização — escritos duas vezes,
lado a lado, com pequenas divergências. É exatamente o cenário do padrão.

**Schema** (dado, não código):

```ts
// schemas/clientSchema.ts
export const clientSchema: FieldSchema[] = [
  { name: "fullName",  label: "Nome completo", kind: "text",   required: true, minLength: 3 },
  { name: "birthDate", label: "Data de nascimento", kind: "date", required: true },
  { name: "cpf",       label: "CPF",  kind: "masked", mask: "cpf", required: true },
  { name: "gender",    label: "Gênero", kind: "enum", source: GenderOptions },
  { name: "situation", label: "Situação", kind: "enum", source: SituationOptions, required: true },
  // ...
];
```

**Factory** — resolve *qual componente* renderiza cada campo:

```ts
// A troca do switch por mapa é o ponto: adicionar um tipo de campo
// não reabre esta função.
const FIELD_RENDERERS: Record<FieldKind, FieldRenderer> = {
  text:   TextFieldRenderer,
  date:   DateFieldRenderer,
  masked: MaskedFieldRenderer,
  enum:   SelectFieldRenderer,
  switch: SwitchFieldRenderer,
};

export const resolveFieldRenderer = (kind: FieldKind): FieldRenderer =>
  FIELD_RENDERERS[kind] ?? TextFieldRenderer;
```

**Strategy** — cada `kind` sabe validar e serializar a si mesmo:

```ts
interface FieldStrategy<T> {
  parse(raw: unknown): T;              // API  -> formulário
  serialize(value: T): unknown;        // formulário -> API
  validate(value: T, schema: FieldSchema): string | undefined;
}
```

E o formulário inteiro vira:

```tsx
{clientSchema.map((field) => {
  const Renderer = resolveFieldRenderer(field.kind);
  return <Renderer key={field.name} schema={field} value={form[field.name]} onChange={set} />;
})}
```

**O que isso resolve concretamente aqui:** o modal de edição e o de cadastro
passam a ser o mesmo componente com schemas diferentes (`clientSchema` vs
`clientSchema.filter(f => f.editable)`); adicionar um campo vira **uma linha
no schema**, não duas alterações em dois arquivos de 400+ e 950+ linhas; e a
validação deixa de ser `showError("nome", "...")` espalhado para virar regra
declarada ao lado do campo.

**Quando *não* vale:** para o formulário de compromisso (`AppointmentFormFields`,
10 campos, um só lugar de uso) o schema é overhead. O padrão paga quando há
**repetição do mesmo conjunto de campos em contextos diferentes** — que é o
caso do cliente, não do compromisso.

### 4.2 Ações de linha do compromisso — Strategy por status

Hoje as ações (editar, concluir, cancelar, excluir, remarcar) convivem no
componente com condicionais implícitas. Mas quais são válidas **depende do
status**: um compromisso `CANCELADO` não se conclui; um `CONCLUIDO` não se
cancela.

```ts
const ACTIONS_BY_STATUS: Record<AppointmentStatusKey, AppointmentAction[]> = {
  AGENDADO:  [edit, complete, reschedule, cancel, remove],
  CONCLUIDO: [edit, remove],
  CANCELADO: [remove],
};
```

Ganho: a regra fica **num lugar só e legível**, em vez de espalhada em
`{status !== "Cancelado" && ...}` pela árvore JSX. E quando o backend
adicionar um status, o TypeScript aponta o `Record` incompleto — hoje ele não
apontaria nada.

### 4.3 Fábrica de enums — elimina 8 cópias do mesmo boilerplate

> **Implementado.** `src/lib/enumFactory.ts` + os 9 arquivos migrados.
> A forma final difere da proposta original — ver nota no fim da seção.

Os arquivos de enum repetiam a mesma estrutura: `ENTRIES`, `…Key`, `…Label`,
`…Input`, `…Options`, `…LabelByKey`, `get…KeyByLabel`, `get…LabelByKey`. São
~35 linhas idênticas a menos dos dados.

```ts
// src/lib/enumFactory.ts
export function createEnum<const E extends EnumEntries>(entries: E) {
  type Key = E[number][0];
  type Label = E[number][1];
  // ...
  return {
    entries,
    options,        // { value, label }
    optionsWithId,  // { id, value, label } — id posicional, compatibilidade
    labelByKey,
    keyByLabel,
    getKeyByLabel,
    getLabelByKey,
  } as const;
}
```

Com `const` type parameters (TS 5+) os tipos literais se preservam — `Key` e
`Label` continuam uniões de string literal, não `string`.

**Como cada arquivo consome a fábrica:**

```ts
// enums/situation/Situation.ts
const situation = createEnum(SITUATION_ENTRIES);

export const SituationOptions = situation.options;
export const SituationLabelByKey = situation.labelByKey;
export const getSituationKeyByLabel = situation.getKeyByLabel;
export const getSituationLabelByKey = situation.getLabelByKey;
```

**Desvio da proposta original.** A versão esboçada aqui era
`export const Situation = createEnum(SITUATION_ENTRIES)` — um objeto só. Isso
obrigaria a reescrever **todos os call sites** (`SituationOptions` viraria
`Situation.options`, e assim por diante em ~10 arquivos) sem ganho nenhum: o
boilerplate morto está *dentro* do arquivo de enum, não nos imports. Manter os
mesmos nomes exportados reduz a mesma quantidade de linhas com **zero
mudanças fora de `src/enums/`**, o que torna a migração verificável por
equivalência: os módulos compilados antes e depois produzem saída idêntica.

**Duas assimetrias foram preservadas de propósito**, não uniformizadas:

- `options` × `optionsWithId` — 7 enums expõem `{ id, value, label }` e 4
  expõem `{ value, label }`. O `id` posicional é a dívida do item **2** do
  plano; unificar aqui misturaria duas mudanças de risco diferente.
- Superfície de exportação desigual — `Payment` não expõe `get…KeyByLabel`,
  `AppointmentType`/`Modality` não expõem `get…LabelByKey`. A fábrica gera
  todos, mas cada arquivo continua exportando só o que já exportava.

**Números reais** (a estimativa de "~280 viram ~40" nesta seção estava
errada — contava só o corpo repetido, ignorando tipos e JSDoc, que
permanecem):

| | linhas |
|---|---|
| 9 arquivos de enum, antes | 472 |
| 9 arquivos de enum, depois | 348 |
| `lib/enumFactory.ts` (novo) | 61 |
| **saldo em código de produção** | **−63** |
| `lib/enumFactory.test.ts` (novo, teste) | 97 |

Ou seja: a economia de linhas é modesta. **O ganho real não é volume** — é
que a regra do contrato `@JsonValue`/`@JsonCreator` passa a existir em um
lugar só, com um teste em cima, em vez de 9 reimplementações que precisavam
ser lidas uma a uma para conferir se concordavam.

**Fora do escopo:** `role/Role.ts` é um `enum` numérico do TypeScript, sem par
chave/label — não passa pela fábrica. `retirementType/RetirementType.ts` e
`intendedBenefit/IntendedBenefit.ts` continuam com 0 bytes.

---

## 5. Plano priorizado

| # | Ação | Esforço | Retorno |
|---|---|---|---|
| 1 | Extrair `buildPageList` e `SKELETON_ROWS` para `lib/` | 30 min | Alto |
| 2 | Corrigir `id` posicional nos selects (`o.value`) | 1 h | **Alto — evita bug silencioso** |
| 3 | Quebrar `AppointmentsCard` em 3 hooks + 3 componentes | 1 dia | Alto |
| 4 | ~~`createEnum` e migrar os 8 enums~~ **feito** | 3 h | Médio |
| 5 | Adaptador tipado no `DetailsClientModal` (mata os 43 `as any`) | 4 h | Alto |
| 6 | Schema-driven nos formulários de cliente (4.1) | 2 dias | Alto |
| 7 | Testes em `appointmentForm.ts` e `buildPageList` | 3 h | Médio |
| 8 | `useApiResource` ou TanStack Query | 1 dia | Médio |
| 9 | Strategy de ações por status (4.2) | 3 h | Médio |
| 10 | Tirar o `fetchClients` de `AppointmentFormFields` | 1 h | **Alto — desacopla o formulário** |
| 11 | Remover `"use client"` dos 5 componentes puros | 1 h | Médio |
| 12 | Quebrar `home/ui.tsx` por responsabilidade | 30 min | Médio |
| 13 | Padronizar pastas, exports e barrels | 1 h | Baixo (mas composto) |

Os itens 1, 2, 10 e 12 cabem numa tarde e são de risco quase zero — é por onde
eu começaria. O 3 é o que mais muda a vida de quem mantém. O 6 é o de maior
retorno por linha, mas só depois que o 3 tiver estabilizado o padrão de
composição.

