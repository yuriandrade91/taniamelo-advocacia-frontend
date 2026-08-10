// Espelha com.lawfirm.law.firm.model.Gender (backend).
const GENDER_ENTRIES = [
  ["MASCULINO", "Masculino"],
  ["FEMININO", "Feminino"],
  ["NAO_BINARIO", "Não-binário"],
  ["OUTRO", "Outro"],
] as const;

export type GenderKey = (typeof GENDER_ENTRIES)[number][0];
/** Label PT-BR — valor devolvido pela API (@JsonValue). */
export type GenderLabel = (typeof GENDER_ENTRIES)[number][1];
/** Aceito em requisições (nome do enum OU label). */
export type GenderInput = GenderKey | GenderLabel;

export const GenderOptions = Array.from(GENDER_ENTRIES).map(
  ([value, label], index) => ({ id: index + 1, value: value as GenderKey, label }),
);

export const GenderLabelByKey = Object.fromEntries(
  Array.from(GENDER_ENTRIES).map(([k, v]) => [k, v]),
) as Record<GenderKey, string>;

const genderKeyByLabel = Object.fromEntries(
  Array.from(GENDER_ENTRIES).map(([k, v]) => [v, k]),
) as Record<string, GenderKey>;

export const getGenderKeyByLabel = (label?: string): GenderKey | undefined =>
  label ? genderKeyByLabel[label] : undefined;

export const getGenderLabelByKey = (key?: GenderKey): string | undefined =>
  key ? GenderLabelByKey[key] : undefined;

export { GENDER_ENTRIES };
