import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  ClientFileDocumentResponse,
  ClientFileDocumentUpdateRequest,
  ClientFileSimulationResponse,
  ClientFileSimulationUpdateRequest,
} from "@/interfaces/client/ClientSubResources.interface";

/**
 * Arquivos do cliente — ClientFileController. Base: /clients/{clientId}/files
 *
 * Uploads são multipart/form-data. Não defina Content-Type manualmente: o
 * browser precisa gerar o boundary — por isso passamos `undefined`.
 * Limites do backend: 10MB por arquivo, 60MB por requisição.
 */

const MULTIPART = { headers: { "Content-Type": undefined } } as const;

// ── Documentos ──

export const uploadDocuments = async (
  clientId: string,
  formData: FormData,
): Promise<ApiEnvelope<ClientFileDocumentResponse[]>> => {
  const { data } = await axiosInstance.post<
    ApiEnvelope<ClientFileDocumentResponse[]>
  >(endpoints.CLIENT_FILES.UPLOAD_DOCUMENTS(clientId), formData, MULTIPART);
  return data;
};

export const listDocuments = async (
  clientId: string,
  params?: { pageNumber?: number; pageSize?: number },
): Promise<ApiEnvelope<ClientFileDocumentResponse[]>> => {
  const { data } = await axiosInstance.get<
    ApiEnvelope<ClientFileDocumentResponse[]>
  >(endpoints.CLIENT_FILES.LIST_DOCUMENTS(clientId), { params });
  return data;
};

export const getDocument = async (
  clientId: string,
  fileId: string,
): Promise<ApiEnvelope<ClientFileDocumentResponse>> => {
  const { data } = await axiosInstance.get<
    ApiEnvelope<ClientFileDocumentResponse>
  >(endpoints.CLIENT_FILES.GET_DOCUMENT(clientId, fileId));
  return data;
};

export const updateDocument = async (
  clientId: string,
  fileId: string,
  body: ClientFileDocumentUpdateRequest,
): Promise<ApiEnvelope<ClientFileDocumentResponse>> => {
  const { data } = await axiosInstance.patch<
    ApiEnvelope<ClientFileDocumentResponse>
  >(endpoints.CLIENT_FILES.UPDATE_DOCUMENT(clientId, fileId), body);
  return data;
};

// ── Simulações ──

export const uploadSimulations = async (
  clientId: string,
  formData: FormData,
): Promise<ApiEnvelope<ClientFileSimulationResponse[]>> => {
  const { data } = await axiosInstance.post<
    ApiEnvelope<ClientFileSimulationResponse[]>
  >(endpoints.CLIENT_FILES.UPLOAD_SIMULATIONS(clientId), formData, MULTIPART);
  return data;
};

export const listSimulations = async (
  clientId: string,
  params?: { pageNumber?: number; pageSize?: number },
): Promise<ApiEnvelope<ClientFileSimulationResponse[]>> => {
  const { data } = await axiosInstance.get<
    ApiEnvelope<ClientFileSimulationResponse[]>
  >(endpoints.CLIENT_FILES.LIST_SIMULATIONS(clientId), { params });
  return data;
};

export const getSimulation = async (
  clientId: string,
  fileId: string,
): Promise<ApiEnvelope<ClientFileSimulationResponse>> => {
  const { data } = await axiosInstance.get<
    ApiEnvelope<ClientFileSimulationResponse>
  >(endpoints.CLIENT_FILES.GET_SIMULATION(clientId, fileId));
  return data;
};

export const updateSimulation = async (
  clientId: string,
  fileId: string,
  body: ClientFileSimulationUpdateRequest,
): Promise<ApiEnvelope<ClientFileSimulationResponse>> => {
  const { data } = await axiosInstance.patch<
    ApiEnvelope<ClientFileSimulationResponse>
  >(endpoints.CLIENT_FILES.UPDATE_SIMULATION(clientId, fileId), body);
  return data;
};

/** Marca uma simulação como principal. */
export const setSimulationPrincipal = async (
  clientId: string,
  fileId: string,
): Promise<ApiEnvelope<ClientFileSimulationResponse>> => {
  const { data } = await axiosInstance.patch<
    ApiEnvelope<ClientFileSimulationResponse>
  >(endpoints.CLIENT_FILES.SET_SIMULATION_PRINCIPAL(clientId, fileId), {});
  return data;
};

// ── Genéricos (documento OU simulação) ──

/** Download — retorna Blob. */
export const downloadFile = async (
  clientId: string,
  fileId: string,
): Promise<Blob> => {
  const { data } = await axiosInstance.get<Blob>(
    endpoints.CLIENT_FILES.DOWNLOAD(clientId, fileId),
    { responseType: "blob" },
  );
  return data;
};

/** DELETE — backend responde 204 sem corpo. */
export const deleteFile = async (
  clientId: string,
  fileId: string,
): Promise<void> => {
  await axiosInstance.delete(endpoints.CLIENT_FILES.DELETE(clientId, fileId));
};
