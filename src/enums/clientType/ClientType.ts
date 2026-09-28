// Espelha com.lawfirm.law.firm.model.ClientType (backend).
import { createEnum } from "@/lib/enumFactory";

const CLIENT_TYPE_ENTRIES = [
  ["VERIFICADO", "Verificado"],
  ["POTENCIAL", "Potencial"],
] as const;

const clientType = createEnum(CLIENT_TYPE_ENTRIES);

export type ClientTypeKey = (typeof CLIENT_TYPE_ENTRIES)[number][0];
/** Label PT-BR — valor devolvido pela API (@JsonValue). */
export type ClientTypeLabel = (typeof CLIENT_TYPE_ENTRIES)[number][1];
/** Aceito em requisições (nome do enum OU label). */
export type ClientTypeInput = ClientTypeKey | ClientTypeLabel;

export const ClientTypeOptions = clientType.optionsWithId;
export const ClientTypeLabelByKey = clientType.labelByKey;
export const getClientTypeKeyByLabel = clientType.getKeyByLabel;
export const getClientTypeLabelByKey = clientType.getLabelByKey;

export { CLIENT_TYPE_ENTRIES };
