# ADR-0001 (frontend) — Formulário de cliente schema-driven com Factory + Strategy

- **Status:** proposto — plano apresentado, execução **não** iniciada por
  decisão explícita (item 3 do pedido: "deixe por último").
- **Contexto imediato:** a tela `/clientes/novo` acabou de ser reescrita como
  página com 6 accordions e 40 campos, substituindo o `AddNewClientModal`.
  Esta ADR decide o que fazer com a duplicação que **sobrou**.
- **Antecedente:** §4.1 de `REVISAO_ARQUITETURA_2026.md` esboçou o padrão. Esta
  ADR confirma a direção, mas **corrige três pontos do esboço** que só ficaram
  visíveis depois de o formulário existir de verdade.

---

## 1. Veredito: vale, mas não pelo motivo original

O esboço justificava o padrão por `AddNewClientModal` e `DetailsClientModal`
renderizarem os mesmos ~20 campos duas vezes. **Metade dessa premissa morreu
hoje:** o `AddNewClientModal` (429 linhas) ficou órfão e a criação virou a
página nova.

A duplicação que resta é real e é pior:

| Arquivo | Linhas | Papel |
|---|---|---|
| `DetailsClientModal.tsx` | 908 | Ver + editar cliente (43 `as any`) |
| `clientes/novo/page.tsx` + seções | 1.098 | Criar cliente |
| `AddNewClientModal.tsx` | 429 | **Órfão** — nenhum importador |

Os mesmos 40 campos, com as mesmas máscaras e as mesmas regras, existem em dois
lugares. **É o caso do padrão.** Só que agora o alvo da migração é o modal de
detalhes, não o de cadastro.

## 2. O que já está pronto (e por que isso muda o custo)

A implementação de hoje foi feita deliberadamente no formato que antecede o
schema. Não é coincidência — é o degrau:

```ts
// PersonalDataSection.tsx — hoje
export const personalInitial: PersonalValues = { fullName: "", cpf: "", ... };

export const personalRules: FieldRules<PersonalValues> = {
  fullName: (v) => validateRequired(v, "Nome completo"),
  cpf:      (v) => validateRequired(v, "CPF") ?? validateCPF(v),
  ...
};
```

**As regras já são dados.** O `useSectionForm` já roda um mapa campo → validador
em vez de `if`s no submit. O que falta para virar schema é fundir três coisas
que hoje moram lado a lado — `initial`, `rules` e o JSX — numa lista só de
descritores. Isso é transporte, não reescrita.

## 3. As três correções ao esboço da §4.1

### 3.1 O schema precisa de **destino**, não só de campos

O esboço propõe um `clientSchema: FieldSchema[]` plano. Isso não sobrevive ao
backend real: os 40 campos se dividem em **quatro endpoints diferentes**.

| Seção | Vai para | Quando |
|---|---|---|
| Atendimento + Dados pessoais + Dados profissionais | `POST /clients` | fase 1 |
| Dados pessoais | `PUT /clients/{id}/personal-data` | edição |
| Dados profissionais | `PUT /clients/{id}/professional-data` | edição |
| Endereço | `POST /clients/{id}/addresses` | fase 2 |
| Entrevista | `POST /clients/{id}/interviews` | fase 2 |

Um campo como `inssPassword` participa de **dois** payloads (é `@NotBlank` no
create e no professional-data). Uma lista plana de campos não consegue expressar
isso; o schema precisa ser **por seção**, com a seção declarando seu destino:

```ts
type SectionSchema = {
  id: string;
  title: string;
  /** Sub-recurso: exige cliente existente. */
  requiresClient: boolean;
  fields: FieldSchema[];
};
```

Sem isso, a serialização vira `if` no orquestrador e o schema não paga.

### 3.2 Strategy tem **dois eixos**, e o esboço juntou os dois

O esboço propõe uma `FieldStrategy` com `parse`/`serialize`/`validate`. Os dois
primeiros são por **kind** (como uma data vira ISO); o terceiro é por **campo**
(`fullName` é obrigatório, `rg` não). São populações de tamanho e volatilidade
muito diferentes:

- **kinds:** ~6, estáveis (`text`, `masked`, `date`, `enum`, `switch`, `textarea`)
- **regras de campo:** ~40, mudam toda semana

Juntar os dois força a criar uma Strategy nova a cada regra nova. A separação
correta:

```ts
/** Por kind — como o campo lê, escreve e desenha. Fechado, raro mudar. */
interface KindStrategy<T> {
  Renderer: FieldRenderer;
  parse(raw: unknown): T;        // API -> formulário
  serialize(value: T): unknown;  // formulário -> API
}

/** Por campo — declarado no schema, ao lado do campo. Aberto, muda sempre. */
type FieldSchema = {
  name: string;
  label: string;
  kind: FieldKind;
  rules?: FieldRule[];   // reaproveita src/lib/validators como está
};
```

### 3.3 Regras cruzadas não cabem em `validate(value, schema)`

Três casos reais do formulário de hoje já não cabem na assinatura do esboço:

1. **Entrevista** — `content` só é obrigatório se o usuário mexeu na seção
   (`hasInterviewInput`). Depende dos irmãos, não do próprio valor.
2. **`inssPassword`** — obrigatório no create, opcional depois.
3. **UF × cidade** — validação futura de consistência.

A regra precisa receber os valores da seção, que é exatamente o que o
`FieldRule<V>` de hoje já faz: `(value: string, values: V) => string | null`.
**Manter essa assinatura no schema** e não trocá-la pela do esboço.

## 4. Plano de migração — quatro etapas, cada uma entregável

| # | Etapa | Esforço | Risco | Entrega isolada? |
|---|---|---|---|---|
| 1 | `FieldSchema` + `KindStrategy` + `resolveFieldRenderer`, com **uma** seção migrada (`ServiceSection`, 4 campos) | 4 h | Baixo | Sim — as outras 5 seções continuam em JSX |
| 2 | Migrar `PersonalData` (17), `Address` (9), `Professional` (7), `Interview` (3) | 1 dia | Baixo | Sim |
| 3 | Serialização declarada por seção (`toRequest` sai da página e vira dado) | 4 h | Médio | Sim |
| 4 | `DetailsClientModal` passa a consumir o mesmo schema, em modo leitura/edição | 2 dias | **Alto** | Não — é o que mata os 43 `as any` |

A etapa 1 é o teste de fogo barato: se o padrão não ficar mais legível que o
`ServiceSection.tsx` atual (84 linhas), **pare aí**. O custo afundado é meio dia.

A etapa 4 é onde está o retorno de verdade e também todo o risco. Só depois de
1–3 estarem em produção e estáveis.

## 5. Quando *não* fazer

- **Se a tela de detalhes for reescrita como página** (o caminho natural depois
  de hoje), faça a reescrita **primeiro** e o schema depois. Migrar para schema
  um modal que vai morrer é trabalho jogado fora.
- **Formulário de compromisso** continua fora: 10 campos, um uso só — o schema é
  overhead, como a §4.1 já dizia.
- **Se o objetivo for só reduzir linhas**, não faça. As 1.098 linhas de hoje
  virariam ~600 de schema + ~400 de infraestrutura. O ganho é **um lugar só para
  mudar**, não volume.

## 6. Dívida vizinha que o schema resolve de graça

O `toSelectOptions` introduzido hoje faz o `id` do select ser a **chave do
enum**, não o índice posicional — item 2 do `REVISAO_ARQUITETURA_2026`, corrigido
por construção nas seções novas. Com o schema declarando `source: GenderOptions`,
essa correção passa a valer para todo select por definição, e o bug não tem mais
onde renascer.

**Pendência não resolvida:** `DetailsClientModal` ainda usa `id` posicional.
Enquanto ele existir, o bug existe.
