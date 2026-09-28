// Espelha com.lawfirm.law.firm.model.AddressType (backend).
import { createEnum } from "@/lib/enumFactory";

const ADDRESS_TYPE_ENTRIES = [
  ["RESIDENCIAL", "Residencial"],
  ["COMERCIAL", "Comercial"],
  ["CORRESPONDENCIA", "Correspondência"],
] as const;

const addressType = createEnum(ADDRESS_TYPE_ENTRIES);

export type AddressTypeKey = (typeof ADDRESS_TYPE_ENTRIES)[number][0];
/** Label PT-BR — valor devolvido pela API (@JsonValue). */
export type AddressTypeLabel = (typeof ADDRESS_TYPE_ENTRIES)[number][1];
/** Aceito em requisições (nome do enum OU label). */
export type AddressTypeInput = AddressTypeKey | AddressTypeLabel;

export const AddressTypeOptions = addressType.optionsWithId;
export const AddressTypeLabelByKey = addressType.labelByKey;
export const getAddressTypeKeyByLabel = addressType.getKeyByLabel;
export const getAddressTypeLabelByKey = addressType.getLabelByKey;

export { ADDRESS_TYPE_ENTRIES };
