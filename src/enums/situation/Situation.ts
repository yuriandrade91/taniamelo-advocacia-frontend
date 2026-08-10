const SITUATION_ENTRIES = [
  ['FORMULARIO_PREENCHIDO', 'Formulário preenchido'],
  ['ANALISE_DOCUMENTAL', 'Análise documental'],
  ['PLANEJAMENTO_EM_EXECUCAO', 'Planejamento em execução'],
  ['PLANEJAMENTO_CONCLUIDO', 'Planejamento concluído'],
  ['BENEFICIO_FUTURO', 'Benefício futuro'],
  ['BENEFICIO_CONCLUIDO', 'Benefício concluído'],
] as const;

export type SituationKey = typeof SITUATION_ENTRIES[number][0];
/** Label PT-BR — é ESTE valor que a API devolve (@JsonValue no backend). */
export type SituationLabel = typeof SITUATION_ENTRIES[number][1];
/** Aceito em requisições: o backend resolve nome do enum OU label. */
export type SituationInput = SituationKey | SituationLabel;

export const SituationOptions = Array.from(SITUATION_ENTRIES).map(([value, label]) => ({ value: value as SituationKey, label }));

export const SituationLabelByKey = Object.fromEntries(
  Array.from(SITUATION_ENTRIES).map(([k, v]) => [k, v])
) as Record<SituationKey, string>;

const situationKeyByLabel = Object.fromEntries(
  Array.from(SITUATION_ENTRIES).map(([k, v]) => [v, k])
) as Record<string, SituationKey>;

export const getSituationKeyByLabel = (label?: string): SituationKey | undefined => (label ? situationKeyByLabel[label] : undefined);

export const getSituationLabelByKey = (key?: SituationKey): string | undefined => (key ? SituationLabelByKey[key] : undefined);

// Compatibility: many components expect RetirementTypeOptions = {id,label}[]
export const RetirementTypeOptions = SituationOptions.map((opt, i) => ({ id: i + 1, label: opt.label }));

export { SITUATION_ENTRIES };
