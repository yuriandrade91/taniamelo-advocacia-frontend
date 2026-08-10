// Espelha com.lawfirm.law.firm.model.BenefitType (backend) — 9 valores.
const BENEFIT_ENTRIES = [
  ['APOSENTADORIA_POR_IDADE', 'Aposentadoria por idade'],
  ['APOSENTADORIA_POR_TEMPO_CONTRIBUICAO', 'Aposentadoria por tempo de contribuição'],
  ['APOSENTADORIA_POR_INCAPACIDADE_PERMANENTE', 'Aposentadoria por incapacidade permanente'],
  ['APOSENTADORIA_ESPECIAL', 'Aposentadoria especial'],
  ['APOSENTADORIA_POR_DEFICIENCIA', 'Aposentadoria por deficiência'],
  ['APOSENTADORIA_POR_TEMPO_PROFESSOR', 'Aposentadoria por tempo de contribuição do professor'],
  ['APOSENTADORIA_POR_INVALIDEZ', 'Aposentadoria por invalidez'],
  ['APOSENTADORIA_RURAL', 'Aposentadoria rural'],
  ['APOSENTADORIA_PCD', 'Aposentadoria para PCD'],
] as const;

export type BenefitKey = typeof BENEFIT_ENTRIES[number][0];
/** Label PT-BR — é ESTE valor que a API devolve (@JsonValue no backend). */
export type BenefitLabel = typeof BENEFIT_ENTRIES[number][1];
/** Aceito em requisições: o backend resolve nome do enum OU label. */
export type BenefitInput = BenefitKey | BenefitLabel;

export const BenefitOptions = Array.from(BENEFIT_ENTRIES).map(([value, label]) => ({ value: value as BenefitKey, label }));

export const BenefitLabelByKey = Object.fromEntries(
  Array.from(BENEFIT_ENTRIES).map(([k, v]) => [k, v])
) as Record<BenefitKey, string>;

const benefitKeyByLabel = Object.fromEntries(
  Array.from(BENEFIT_ENTRIES).map(([k, v]) => [v, k])
) as Record<string, BenefitKey>;

export const getBenefitKeyByLabel = (label?: string): BenefitKey | undefined => (label ? benefitKeyByLabel[label] : undefined);

export const getBenefitLabelByKey = (key?: BenefitKey): string | undefined => (key ? BenefitLabelByKey[key] : undefined);

export { BENEFIT_ENTRIES };

// Compatibility aliases used across the codebase
export const IntendedBenefitOptions = BenefitOptions;
export const Benefits = {
  BenefitOptions,
  BenefitLabelByKey,
};
