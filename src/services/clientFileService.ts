import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  ClientFileDocumentResponse,
  ClientFileSimulationResponse,
} from "@/interfaces/client/ClientSubResources.interface";
import { feedback, type RequestFeedback } from "@/services/requestFeedback";

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
  options?: RequestFeedback,
): Promise<ApiEnvelope<ClientFileDocumentResponse[]>> => {
  const { data } = await axiosInstance.post<
    ApiEnvelope<ClientFileDocumentResponse[]>
  >(endpoints.CLIENT_FILES.UPLOAD_DOCUMENTS(clientId), formData, { ...MULTIPART, ...feedback("Documentos enviados.", options) });
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
  options?: RequestFeedback,
): Promise<ApiEnvelope<ClientFileSimulationResponse[]>> => {
  const { data } = await axiosInstance.post<
    ApiEnvelope<ClientFileSimulationResponse[]>
  >(endpoints.CLIENT_FILES.UPLOAD_SIMULATIONS(clientId), formData, { ...MULTIPART, ...feedback("Simulações enviadas.", options) });
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

/**
 * GET .../files/{fileId}/download — o conteúdo do arquivo.
 *
 * Pelo axios, e não por link: a rota exige `Authorization` e `X-Tenant-Id`, e
 * o `downloadUrl` da listagem é um caminho da API — aberto direto numa aba,
 * caía na origem do front (404) ou chegava sem token (401). Quem entrega o
 * blob ao navegador (aba ou "salvar como") é `lib/blobFile`.
 */
export const downloadClientFile = async (clientId: string, fileId: string): Promise<Blob> => {
  const { data } = await axiosInstance.get<Blob>(endpoints.CLIENT_FILES.DOWNLOAD(clientId, fileId), {
    responseType: "blob",
  });
  return data;
};

/** DELETE — backend responde 204 sem corpo. */
export const deleteFile = async (
  clientId: string,
  fileId: string,
  options?: RequestFeedback,
): Promise<void> => {
  await axiosInstance.delete(endpoints.CLIENT_FILES.DELETE(clientId, fileId), feedback("Arquivo excluído.", options));
};
