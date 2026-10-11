// Espelha com.lawfirm.law.firm.model.RequestStage (backend).
import { createEnum } from "@/lib/enumFactory";

/**
 * A etapa do requerimento no INSS — a esteira do **órgão**, paralela à
 * `Situation` (a do escritório). Um cliente pode estar em "Planejamento
 * concluído" aqui dentro e em "Exigência" lá fora ao mesmo tempo.
 *
 * Não é funil: deferimento e indeferimento são desfechos alternativos do
 * mesmo ponto, recurso só vem depois de um indeferimento, e voltar de recurso
 * para exigência é caminho real. No cliente o campo é anulável: nulo é
 * "ainda não foi ao INSS".
 */
const REQUEST_STAGE_ENTRIES = [
  ["REQUERIMENTO", "Requerimento"],
  ["EXIGENCIA", "Exigência"],
  ["CUMPRIMENTO_DE_EXIGENCIA", "Cumprimento de exigência"],
  ["DEFERIMENTO", "Deferimento"],
  ["INDEFERIMENTO", "Indeferimento"],
  ["RECURSO", "Recurso"],
] as const;

const requestStage = createEnum(REQUEST_STAGE_ENTRIES);

export type RequestStageKey = (typeof REQUEST_STAGE_ENTRIES)[number][0];
/** Label PT-BR — é ESTE valor que a API devolve (@JsonValue no backend). */
export type RequestStageLabel = (typeof REQUEST_STAGE_ENTRIES)[number][1];
/** Aceito em requisições: o backend resolve nome do enum OU label. */
export type RequestStageInput = RequestStageKey | RequestStageLabel;

export const RequestStageOptions = requestStage.options;
export const RequestStageLabelByKey = requestStage.labelByKey;
export const getRequestStageKeyByLabel = requestStage.getKeyByLabel;

export { REQUEST_STAGE_ENTRIES };
