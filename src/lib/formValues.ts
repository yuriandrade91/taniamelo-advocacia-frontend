/**
 * A ida e a volta entre o que a API devolve e o que um campo guarda.
 *
 * Campo de formulário guarda texto (ou boolean, numa chave liga/desliga):
 * ausente vira "", número vira texto, rótulo de enum vira a chave que o select
 * usa. Na volta, o campo vazio some do JSON em vez de ir como string vazia.
 *
 * Eram cópias com nomes diferentes nos formulários de cliente, de parcela, de
 * lançamento e de benefício — e uma delas deixava passar como chave um rótulo
 * que o select não conhece.
 */

// ── API → campo ──

/** Texto: ausente vira "". */
export const textOf = (value?: string | null): string => value ?? "";

/** Número → texto. `0` é valor legítimo e precisa sobreviver; ausente vira "". */
export const numberTextOf = (value?: number | null): string =>
  value === undefined || value === null || Number.isNaN(value) ? "" : String(value);

/** Chave liga/desliga não tem terceiro estado: ausente é `false`. */
export const flagOf = (value?: boolean | null): boolean => value === true;

/**
 * Reais → texto do campo de valor: vírgula decimal e **sem** separador de
 * milhar, que é o que o `AmountField` lê de volta com `parseAmountBRL`.
 * Formatar como "1.234,56" faria o campo mostrar certo e o `parse` devolver
 * 1234 na hora de salvar.
 */
export const amountTextOf = (value?: number | null): string =>
  value === undefined || value === null || Number.isNaN(value) ? "" : value.toFixed(2).replace(".", ",");

/** Uma chave de enum é MAIÚSCULA com underscore; um rótulo tem minúsculas. */
const looksLikeKey = (candidate: string): boolean => /^[A-Z0-9_]+$/.test(candidate);

/**
 * Rótulo de enum (o que a API devolve, `@JsonValue`) → a chave que o select
 * usa.
 *
 * Aceita a chave pronta: o backend aceita as duas na escrita (`@JsonCreator`),
 * e um registro gravado por outro caminho pode voltar assim — devolver ""
 * nesse caso apagaria a seleção. O que não é nem uma coisa nem outra vira "",
 * e o select mostra "Selecione" em vez de um valor fora da lista.
 */
export function enumKeyOf(
  value: string | null | undefined,
  keyByLabel: (label?: string) => string | undefined,
): string {
  if (!value) return "";
  return keyByLabel(value) ?? (looksLikeKey(value) ? value : "");
}

// ── campo → API ──

/** Texto aparado; vazio vira `undefined`, para a chave sumir do JSON. */
export const optionalText = (value: string): string | undefined =>
  value.trim() === "" ? undefined : value.trim();

/** Inteiro do campo; vazio ou não inteiro vira `undefined`. */
export function optionalInteger(value: string): number | undefined {
  const clean = value.trim();
  if (clean === "") return undefined;
  const parsed = Number(clean);
  return Number.isInteger(parsed) ? parsed : undefined;
}
