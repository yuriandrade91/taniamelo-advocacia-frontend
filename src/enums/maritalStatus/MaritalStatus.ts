// Espelha com.lawfirm.law.firm.model.MaritalStatus (backend).
//
// ⚠️ Corrigido para bater com a API: o frontend tinha "União Estável" (que o
// backend REJEITA) e não tinha "Separado(a)". As options mantêm `id` e `label`
// (compatibilidade com as telas atuais) e passam a expor `value` — a chave real
// enviada à API. Prefira `value` em código novo.
const MARITAL_STATUS_ENTRIES = [
  ["SOLTEIRO", "Solteiro(a)"],
  ["CASADO", "Casado(a)"],
  ["SEPARADO", "Separado(a)"],
  ["DIVORCIADO", "Divorciado(a)"],
  ["VIUVO", "Viúvo(a)"],
] as const;

export type MaritalStatusKey = (typeof MARITAL_STATUS_ENTRIES)[number][0];
/** Label PT-BR — valor devolvido pela API (@JsonValue). */
export type MaritalStatusLabel = (typeof MARITAL_STATUS_ENTRIES)[number][1];
/** Aceito em requisições (nome do enum OU label). */
export type MaritalStatusInput = MaritalStatusKey | MaritalStatusLabel;

export const MaritalStatusOptions: {
  id: number;
  value: MaritalStatusKey;
  label: string;
}[] = Array.from(MARITAL_STATUS_ENTRIES).map(([value, label], index) => ({
  id: index + 1,
  value: value as MaritalStatusKey,
  label,
}));

export const MaritalStatusLabelByKey = Object.fromEntries(
  Array.from(MARITAL_STATUS_ENTRIES).map(([k, v]) => [k, v]),
) as Record<MaritalStatusKey, string>;

const maritalStatusKeyByLabel = Object.fromEntries(
  Array.from(MARITAL_STATUS_ENTRIES).map(([k, v]) => [v, k]),
) as Record<string, MaritalStatusKey>;

export const getMaritalStatusKeyByLabel = (
  label?: string,
): MaritalStatusKey | undefined =>
  label ? maritalStatusKeyByLabel[label] : undefined;

export const getMaritalStatusLabelByKey = (
  key?: MaritalStatusKey,
): string | undefined => (key ? MaritalStatusLabelByKey[key] : undefined);

/** @deprecated Use `MaritalStatusLabelByKey`. Mantido para compatibilidade. */
export const MaritalStatusText = MaritalStatusLabelByKey;

export { MARITAL_STATUS_ENTRIES };
