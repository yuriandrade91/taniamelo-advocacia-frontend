/**
 * Fábrica dos enums espelhados do backend.
 *
 * Todos os enums do projeto seguem o mesmo contrato (`@JsonValue` /
 * `@JsonCreator` no backend): a API **devolve o label** PT-BR e **aceita o
 * nome da constante OU o label**. Daí a estrutura repetida em cada arquivo —
 * `ENTRIES`, `…Key`, `…Label`, `…Input`, `…Options`, `…LabelByKey`,
 * `get…KeyByLabel`, `get…LabelByKey`.
 *
 * `createEnum` concentra a parte de runtime dessa estrutura. Cada arquivo de
 * enum continua exportando os mesmos nomes de antes — a fábrica é detalhe
 * interno, nenhum import da aplicação muda.
 *
 * O parâmetro `const E` (TS 5+) preserva os tipos literais das entradas, então
 * `Key` e `Label` continuam sendo uniões de string literal, não `string`.
 */

/** Pares `[chave, label]` — a chave é o nome da constante no backend. */
export type EnumEntries = readonly (readonly [string, string])[];

export function createEnum<const E extends EnumEntries>(entries: E) {
  type Key = E[number][0];
  type Label = E[number][1];

  const labelByKey = Object.fromEntries(
    Array.from(entries).map(([key, label]) => [key, label]),
  ) as Record<Key, Label>;

  const keyByLabel = Object.fromEntries(
    Array.from(entries).map(([key, label]) => [label, key]),
  ) as Record<string, Key>;

  /** `{ value, label }` — formato preferido em código novo. */
  const options = Array.from(entries).map(([value, label]) => ({
    value,
    label,
  })) as { value: Key; label: Label }[];

  /**
   * `{ id, value, label }` — o `id` é posicional (1-based) e existe só por
   * compatibilidade com as telas que ainda usam `id` como chave de select.
   * Não é um identificador do backend: prefira `value`.
   */
  const optionsWithId = Array.from(entries).map(([value, label], index) => ({
    id: index + 1,
    value,
    label,
  })) as { id: number; value: Key; label: Label }[];

  return {
    entries,
    options,
    optionsWithId,
    labelByKey,
    keyByLabel,
    getKeyByLabel: (label?: string): Key | undefined =>
      label ? keyByLabel[label] : undefined,
    getLabelByKey: (key?: Key): Label | undefined =>
      key ? labelByKey[key] : undefined,
  } as const;
}
