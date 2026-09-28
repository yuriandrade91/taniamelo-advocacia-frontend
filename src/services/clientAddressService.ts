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

/**
 * POST /clients/{clientId}/addresses/batch — de 1 a 10 endereços numa
 * transação só.
 *
 * O cadastro permite até três endereços preenchidos de uma vez. Gravá-los com
 * um POST cada não é a mesma coisa: cada requisição tem transação própria, e
 * uma falha no segundo deixa a ficha com o primeiro endereço salvo e o resto
 * perdido — sem nada na tela explicando por que só um sobreviveu. Aqui, ou
 * entram todos ou não entra nenhum.
 *
 * Devolve os criados **na ordem enviada**, o que é o que permite casar cada
 * resposta com a aba que a originou. Se mais de um item pedir `isPrimary`,
 * vale o último; a tela já garante um só antes de enviar.
 */
export const createAddresses = async (
  clientId: string,
  addresses: readonly ClientAddressRequest[],
): Promise<ApiEnvelope<ClientAddressResponse[]>> => {
  const { data } = await axiosInstance.post<
    ApiEnvelope<ClientAddressResponse[]>
  >(endpoints.CLIENT_ADDRESSES.CREATE_BATCH(clientId), {
    addresses: [...addresses],
  });
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
