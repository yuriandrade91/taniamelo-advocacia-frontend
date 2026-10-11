# ADR 0001 — Formulário orientado a schema (Strategy por tipo de campo)

- **Status:** aceita e implementada.
- **Data:** proposta em 27/09/2026; implementada em outubro de 2026.
- **Onde vive:** `components/ui/form/schema.ts` (`defineSection`,
  `FIELD_STRATEGIES`), `hooks/useSectionForm.ts`, `components/ui/form/SchemaField.tsx`,
  e os schemas de cliente em `components/clients/form/schemas.ts`.

## Contexto

O cliente tem cerca de 40 campos em seis seções, com máscara, validador e
obrigatoriedade próprios — e duas telas que os desenham: o cadastro
(`/clientes/novo`) e a ficha (`ClientDetailsModal`, leitura e edição). Antes
desta decisão os campos existiam duas vezes:

- a ficha gravava **sem validar nada**, e um CPF que o cadastro barrava passava
  por ela;
- a leitura da resposta da API era uma cascata de `as any` (43 deles) tentando
  três formatos de nome por campo;
- os selects usavam o **índice** da opção como valor — reordenar um enum
  mudava em silêncio o significado de todo formulário aberto.

## Decisão

Um formulário é um **schema por seção**: cada campo declara `kind`, rótulo,
obrigatoriedade, largura na grade e, se precisar, uma regra própria.

```ts
export const personalSchema = defineSection({
  fullName: { kind: "text", label: "Nome completo", required: true, span: 2 },
  cpf:      { kind: "cpf",  label: "CPF", required: true },
  gender:   { kind: "select", label: "Gênero", options: toSelectOptions(GenderOptions) },
  // …
});
```

A Strategy tem **dois eixos**, separados de propósito:

| Eixo | Onde | Muda |
|---|---|---|
| **Por tipo** (`kind`) — controle, máscara, validador de formato | `FIELD_STRATEGIES`, ~18 tipos (`cpf`, `nit`, `cep`, `date`, `amount`…) | raramente; é fechado |
| **Por campo** — obrigatório, regra de negócio | o próprio schema (`required`, `rule`) | sempre; é aberto |

Juntar os dois obrigaria a criar uma Strategy nova a cada regra nova.

A regra de campo recebe **os valores da seção** — `(value, values) => string | null` —
porque as regras reais dependem dos irmãos: a entrevista só cobra conteúdo
se a pessoa começou a preenchê-la; a data de cessação só existe se a
deficiência cessou.

O estado é do `useSectionForm({ schema })` (valores, erros revelados ao mexer
no campo e todos de uma vez no "Salvar"); o desenho é do `SchemaField`, que
aceita `isReadOnly` (a ficha vista) e `isLoading` (o skeleton no lugar do
valor).

**O schema descreve o campo, não a tela.** A seção continua sendo JSX: a ficha
tem senha do INSS auditada, upload, campos que aparecem pela situação. Gerar a
seção inteira por configuração viraria configuração cheia de exceção.

**A serialização é por seção, com destino.** Os campos se dividem entre rotas
diferentes (`POST /clients`; `PUT /clients/{id}`, substituição total; os
sub-recursos de endereço e entrevista). Os conversores ficam ao lado dos
schemas: `payloads.ts` (formulário → API), `fromResponse.ts` (API →
formulário) e `details/clientSheet.ts` (`toUpdateRequest`, que preserva o que a
tela não edita). `lib/formValues.ts` faz as conversões miúdas (texto, número,
reais, rótulo de enum → chave do select).

## Consequências

- Cadastro e ficha **validam igual**, porque é o mesmo schema. Campo novo é uma
  linha no schema, mais o conversor da rota dele.
- O select trabalha com a **chave do enum** (`toSelectOptions`), nunca com a
  posição.
- O `as any` saiu da ficha: a resposta é lida pelos conversores tipados.
- Formulário de **um uso só e poucos campos** não usa schema — compromisso,
  lançamento da Carteira, parcela, perfil: validador puro + `useFieldErrors`.
  O schema paga quando o mesmo conjunto de campos aparece em mais de um
  contexto.
- A Revisão do cadastro (`review.ts`) e o preenchimento por seção da ficha
  (`sectionFill`, em `details/clientSheet.ts`) leem o mesmo schema para saber
  rótulo, obrigatoriedade e como mostrar cada valor (`formatValue`).
