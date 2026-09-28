// Espelha com.lawfirm.law.firm.model.Gender (backend).
import { createEnum } from "@/lib/enumFactory";

const GENDER_ENTRIES = [
  ["MASCULINO", "Masculino"],
  ["FEMININO", "Feminino"],
  ["NAO_BINARIO", "Não-binário"],
  ["OUTRO", "Outro"],
] as const;

const gender = createEnum(GENDER_ENTRIES);

export type GenderKey = (typeof GENDER_ENTRIES)[number][0];
/** Label PT-BR — valor devolvido pela API (@JsonValue). */
export type GenderLabel = (typeof GENDER_ENTRIES)[number][1];
/** Aceito em requisições (nome do enum OU label). */
export type GenderInput = GenderKey | GenderLabel;

export const GenderOptions = gender.optionsWithId;
export const GenderLabelByKey = gender.labelByKey;
export const getGenderKeyByLabel = gender.getKeyByLabel;
export const getGenderLabelByKey = gender.getLabelByKey;

export { GENDER_ENTRIES };
