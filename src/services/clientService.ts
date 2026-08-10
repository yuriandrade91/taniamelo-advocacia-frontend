import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import { Clients } from "@/interfaces/Clients.interface";
import { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  ClientListRequest,
  ClientCreateRequest,
  ClientUpdateRequest,
  ClientPatchRequest,
  ClientPatchResponse,
  ClientSituationHistory,
} from "@/interfaces/client/Client.interface";

/**
 * Cliente — espelha ClientController.
 *
 * Leituras devolvem `Clients` (shape de tela, legado) para compatibilidade com
 * os componentes atuais; escritas já usam os DTOs estritos do backend.
 * Paginação é 1-based.
 */

/** GET /api/v1/clients — listagem paginada + filtros. */
export const clients = async (
  params?: ClientListRequest,
): Promise<ApiEnvelope<Clients[]>> => {
  const response = await axiosInstance.get<ApiEnvelope<Clients[]>>(
    endpoints.CLIENTS.LIST,
    { params },
  );
  return response.data;
};

/** GET /api/v1/clients/{id} */
export const clientById = async (
  clientId: string | number,
): Promise<Clients> => {
  const response = await axiosInstance.get<ApiEnvelope<Clients>>(
    endpoints.CLIENTS.BY_ID(String(clientId)),
  );
  // backend às vezes retorna objeto cru para recurso único
  return (
    (response.data?.data as Clients) ?? (response.data as unknown as Clients)
  );
};

/** POST /api/v1/clients */
export const createClient = async (
  body: ClientCreateRequest,
): Promise<ApiEnvelope<Clients>> => {
  const response = await axiosInstance.post<ApiEnvelope<Clients>>(
    endpoints.CLIENTS.CREATE,
    body,
  );
  return response.data;
};

/** PUT /api/v1/clients/{id} */
export const updateClient = async (
  clientId: string,
  body: ClientUpdateRequest,
): Promise<ApiEnvelope<Clients>> => {
  const response = await axiosInstance.put<ApiEnvelope<Clients>>(
    endpoints.CLIENTS.UPDATE(clientId),
    body,
  );
  return response.data;
};

/** PATCH /api/v1/clients/{id} — situação, benefício, clientType, notBillable. */
export const patchClient = async (
  clientId: string,
  body: ClientPatchRequest,
): Promise<ApiEnvelope<ClientPatchResponse>> => {
  const response = await axiosInstance.patch<ApiEnvelope<ClientPatchResponse>>(
    endpoints.CLIENTS.PATCH(clientId),
    body,
  );
  return response.data;
};

/** DELETE /api/v1/clients/{id} */
export const deleteClient = async (
  clientId: string,
): Promise<ApiEnvelope<ClientPatchResponse>> => {
  const response = await axiosInstance.delete<ApiEnvelope<ClientPatchResponse>>(
    endpoints.CLIENTS.DELETE(clientId),
  );
  return response.data;
};

/** GET /api/v1/clients/{id}/situation-history — paginado. */
export const clientSituationHistory = async (
  clientId: string,
  params?: { pageNumber?: number; pageSize?: number },
): Promise<ApiEnvelope<ClientSituationHistory[]>> => {
  const response = await axiosInstance.get<
    ApiEnvelope<ClientSituationHistory[]>
  >(endpoints.CLIENTS.SITUATION_HISTORY(clientId), { params });
  return response.data;
};
