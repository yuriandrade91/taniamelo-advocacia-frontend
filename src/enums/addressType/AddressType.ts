// Espelha com.lawfirm.law.firm.model.AddressType (backend).
const ADDRESS_TYPE_ENTRIES = [
  ["RESIDENCIAL", "Residencial"],
  ["COMERCIAL", "Comercial"],
  ["CORRESPONDENCIA", "Correspondência"],
] as const;

export type AddressTypeKey = (typeof ADDRESS_TYPE_ENTRIES)[number][0];
/** Label PT-BR — valor devolvido pela API (@JsonValue). */
export type AddressTypeLabel = (typeof ADDRESS_TYPE_ENTRIES)[number][1];
/** Aceito em requisições (nome do enum OU label). */
export type AddressTypeInput = AddressTypeKey | AddressTypeLabel;

export const AddressTypeOptions = Array.from(ADDRESS_TYPE_ENTRIES).map(
  ([value, label], index) => ({
    id: index + 1,
    value: value as AddressTypeKey,
    label,
  }),
);

export const AddressTypeLabelByKey = Object.fromEntries(
  Array.from(ADDRESS_TYPE_ENTRIES).map(([k, v]) => [k, v]),
) as Record<AddressTypeKey, string>;

const addressTypeKeyByLabel = Object.fromEntries(
  Array.from(ADDRESS_TYPE_ENTRIES).map(([k, v]) => [v, k]),
) as Record<string, AddressTypeKey>;

export const getAddressTypeKeyByLabel = (
  label?: string,
): AddressTypeKey | undefined =>
  label ? addressTypeKeyByLabel[label] : undefined;

export const getAddressTypeLabelByKey = (
  key?: AddressTypeKey,
): string | undefined => (key ? AddressTypeLabelByKey[key] : undefined);

export { ADDRESS_TYPE_ENTRIES };
