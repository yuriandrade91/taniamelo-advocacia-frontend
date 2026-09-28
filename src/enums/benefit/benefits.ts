/**
 * Espelha `com.lawfirm.law.firm.model.BenefitType` (backend) — 7 valores.
 *
 * Eram nove. "Aposentadoria por invalidez" é o nome anterior à EC 103/2019 do
 * que hoje se chama "incapacidade permanente", e "Aposentadoria para PCD" é a
 * escrita informal de "deficiência" — o mesmo benefício aparecia duas vezes na
 * lista, e quem cadastrava escolhia um dos dois sem saber que eram um só.
 *
 * O backend ainda ACEITA os dois nomes antigos na entrada (resolve para o
 * canônico), então dado já gravado continua abrindo normalmente. Eles só não
 * são mais oferecidos na tela.
 */
import { createEnum } from "@/lib/enumFactory";

const BENEFIT_ENTRIES = [
  ["APOSENTADORIA_POR_IDADE", "Aposentadoria por idade"],
  ["APOSENTADORIA_POR_TEMPO_CONTRIBUICAO", "Aposentadoria por tempo de contribuição"],
  ["APOSENTADORIA_POR_INCAPACIDADE_PERMANENTE", "Aposentadoria por incapacidade permanente"],
  ["APOSENTADORIA_ESPECIAL", "Aposentadoria especial"],
  ["APOSENTADORIA_POR_DEFICIENCIA", "Aposentadoria por deficiência"],
  ["APOSENTADORIA_POR_TEMPO_PROFESSOR", "Aposentadoria por tempo de contribuição do professor"],
  ["APOSENTADORIA_RURAL", "Aposentadoria rural"],
] as const;

const benefit = createEnum(BENEFIT_ENTRIES);

export type BenefitKey = (typeof BENEFIT_ENTRIES)[number][0];
/** Label PT-BR — é ESTE valor que a API devolve (@JsonValue no backend). */
export type BenefitLabel = (typeof BENEFIT_ENTRIES)[number][1];
/** Aceito em requisições: o backend resolve nome do enum OU label. */
export type BenefitInput = BenefitKey | BenefitLabel;

export const BenefitOptions = benefit.options;
export const BenefitLabelByKey = benefit.labelByKey;
export const getBenefitKeyByLabel = benefit.getKeyByLabel;
export const getBenefitLabelByKey = benefit.getLabelByKey;

export { BENEFIT_ENTRIES };

// Compatibility aliases used across the codebase
export const IntendedBenefitOptions = BenefitOptions;
export const Benefits = {
  BenefitOptions,
  BenefitLabelByKey,
};
