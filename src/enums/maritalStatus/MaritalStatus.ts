// Espelha com.lawfirm.law.firm.model.MaritalStatus (backend).
//
// ⚠️ Corrigido para bater com a API: o frontend tinha "União Estável" (que o
// backend REJEITA) e não tinha "Separado(a)". As options mantêm `id` e `label`
// (compatibilidade com as telas atuais) e passam a expor `value` — a chave real
// enviada à API. Prefira `value` em código novo.
import { createEnum } from "@/lib/enumFactory";

const MARITAL_STATUS_ENTRIES = [
  ["SOLTEIRO", "Solteiro(a)"],
  ["CASADO", "Casado(a)"],
  ["SEPARADO", "Separado(a)"],
  ["DIVORCIADO", "Divorciado(a)"],
  ["VIUVO", "Viúvo(a)"],
] as const;

const maritalStatus = createEnum(MARITAL_STATUS_ENTRIES);

export type MaritalStatusKey = (typeof MARITAL_STATUS_ENTRIES)[number][0];
/** Label PT-BR — valor devolvido pela API (@JsonValue). */
export type MaritalStatusLabel = (typeof MARITAL_STATUS_ENTRIES)[number][1];
/** Aceito em requisições (nome do enum OU label). */
export type MaritalStatusInput = MaritalStatusKey | MaritalStatusLabel;

export const MaritalStatusOptions: {
  id: number;
  value: MaritalStatusKey;
  label: string;
}[] = maritalStatus.optionsWithId;

export const MaritalStatusLabelByKey = maritalStatus.labelByKey;
export const getMaritalStatusKeyByLabel = maritalStatus.getKeyByLabel;
export const getMaritalStatusLabelByKey = maritalStatus.getLabelByKey;

/** @deprecated Use `MaritalStatusLabelByKey`. Mantido para compatibilidade. */
export const MaritalStatusText = MaritalStatusLabelByKey;

export { MARITAL_STATUS_ENTRIES };
