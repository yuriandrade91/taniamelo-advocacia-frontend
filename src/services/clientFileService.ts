import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  ClientFileDocumentResponse,
  ClientFileSimulationResponse,
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

// ── Genéricos (documento OU simulação) ──

/** DELETE — backend responde 204 sem corpo. */
export const deleteFile = async (
  clientId: string,
  fileId: string,
): Promise<void> => {
  await axiosInstance.delete(endpoints.CLIENT_FILES.DELETE(clientId, fileId));
};
