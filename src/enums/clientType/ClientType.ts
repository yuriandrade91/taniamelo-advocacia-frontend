// Espelha com.lawfirm.law.firm.model.ClientType (backend).
const CLIENT_TYPE_ENTRIES = [
  ["VERIFICADO", "Verificado"],
  ["POTENCIAL", "Potencial"],
] as const;

export type ClientTypeKey = (typeof CLIENT_TYPE_ENTRIES)[number][0];
/** Label PT-BR — valor devolvido pela API (@JsonValue). */
export type ClientTypeLabel = (typeof CLIENT_TYPE_ENTRIES)[number][1];
/** Aceito em requisições (nome do enum OU label). */
export type ClientTypeInput = ClientTypeKey | ClientTypeLabel;

export const ClientTypeOptions = Array.from(CLIENT_TYPE_ENTRIES).map(
  ([value, label], index) => ({
    id: index + 1,
    value: value as ClientTypeKey,
    label,
  }),
);

export const ClientTypeLabelByKey = Object.fromEntries(
  Array.from(CLIENT_TYPE_ENTRIES).map(([k, v]) => [k, v]),
) as Record<ClientTypeKey, string>;

const clientTypeKeyByLabel = Object.fromEntries(
  Array.from(CLIENT_TYPE_ENTRIES).map(([k, v]) => [v, k]),
) as Record<string, ClientTypeKey>;

export const getClientTypeKeyByLabel = (
  label?: string,
): ClientTypeKey | undefined => (label ? clientTypeKeyByLabel[label] : undefined);

export const getClientTypeLabelByKey = (
  key?: ClientTypeKey,
): string | undefined => (key ? ClientTypeLabelByKey[key] : undefined);

export { CLIENT_TYPE_ENTRIES };
