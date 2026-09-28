// Espelha com.lawfirm.law.firm.model.Situation (backend).
import { createEnum } from "@/lib/enumFactory";

const SITUATION_ENTRIES = [
  ["FORMULARIO_PREENCHIDO", "Formulário preenchido"],
  ["ANALISE_DOCUMENTAL", "Análise documental"],
  ["PLANEJAMENTO_EM_EXECUCAO", "Planejamento em execução"],
  ["PLANEJAMENTO_CONCLUIDO", "Planejamento concluído"],
  ["BENEFICIO_FUTURO", "Benefício futuro"],
  ["BENEFICIO_CONCLUIDO", "Benefício concluído"],
] as const;

const situation = createEnum(SITUATION_ENTRIES);

export type SituationKey = (typeof SITUATION_ENTRIES)[number][0];
/** Label PT-BR — é ESTE valor que a API devolve (@JsonValue no backend). */
export type SituationLabel = (typeof SITUATION_ENTRIES)[number][1];
/** Aceito em requisições: o backend resolve nome do enum OU label. */
export type SituationInput = SituationKey | SituationLabel;

export const SituationOptions = situation.options;
export const SituationLabelByKey = situation.labelByKey;
export const getSituationKeyByLabel = situation.getKeyByLabel;
export const getSituationLabelByKey = situation.getLabelByKey;

export { SITUATION_ENTRIES };

// Compatibility: many components expect RetirementTypeOptions = {id,label}[]
export const RetirementTypeOptions = SituationOptions.map((opt, i) => ({
  id: i + 1,
  label: opt.label,
}));
