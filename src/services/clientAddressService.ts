import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  ClientAddressRequest,
  ClientAddressResponse,
} from "@/interfaces/client/ClientSubResources.interface";

/** Endereços — ClientAddressController. Base: /clients/{clientId}/addresses */

export const listAddresses = async (
  clientId: string,
  params?: { pageNumber?: number; pageSize?: number },
): Promise<ApiEnvelope<ClientAddressResponse[]>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<ClientAddressResponse[]>>(
    endpoints.CLIENT_ADDRESSES.LIST(clientId),
    { params },
  );
  return data;
};

export const createAddress = async (
  clientId: string,
  body: ClientAddressRequest,
): Promise<ApiEnvelope<ClientAddressResponse>> => {
  const { data } = await axiosInstance.post<ApiEnvelope<ClientAddressResponse>>(
    endpoints.CLIENT_ADDRESSES.CREATE(clientId),
    body,
  );
  return data;
};

export const getAddress = async (
  clientId: string,
  addressId: string,
): Promise<ApiEnvelope<ClientAddressResponse>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<ClientAddressResponse>>(
    endpoints.CLIENT_ADDRESSES.BY_ID(clientId, addressId),
  );
  return data;
};

export const updateAddress = async (
  clientId: string,
  addressId: string,
  body: ClientAddressRequest,
): Promise<ApiEnvelope<ClientAddressResponse>> => {
  const { data } = await axiosInstance.put<ApiEnvelope<ClientAddressResponse>>(
    endpoints.CLIENT_ADDRESSES.UPDATE(clientId, addressId),
    body,
  );
  return data;
};

/** DELETE — backend responde 204 sem corpo. */
export const deleteAddress = async (
  clientId: string,
  addressId: string,
): Promise<void> => {
  await axiosInstance.delete(
    endpoints.CLIENT_ADDRESSES.DELETE(clientId, addressId),
  );
};
