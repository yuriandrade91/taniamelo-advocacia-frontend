import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  ClientPersonalDataRequest,
  ClientPersonalDataResponse,
  ClientProfessionalDataRequest,
  ClientProfessionalDataResponse,
} from "@/interfaces/client/ClientSubResources.interface";

/**
 * Dados pessoais e profissionais (recursos 1:1 do cliente).
 * ClientPersonalDataController + ClientProfessionalDataController.
 */

// ── Dados pessoais: /clients/{clientId}/personal-data ──

export const getPersonalData = async (
  clientId: string,
): Promise<ApiEnvelope<ClientPersonalDataResponse>> => {
  const { data } = await axiosInstance.get<
    ApiEnvelope<ClientPersonalDataResponse>
  >(endpoints.CLIENT_PERSONAL_DATA.GET(clientId));
  return data;
};

export const updatePersonalData = async (
  clientId: string,
  body: ClientPersonalDataRequest,
): Promise<ApiEnvelope<ClientPersonalDataResponse>> => {
  const { data } = await axiosInstance.put<
    ApiEnvelope<ClientPersonalDataResponse>
  >(endpoints.CLIENT_PERSONAL_DATA.UPDATE(clientId), body);
  return data;
};

// ── Dados profissionais: /clients/{clientId}/professional-data ──

export const getProfessionalData = async (
  clientId: string,
): Promise<ApiEnvelope<ClientProfessionalDataResponse>> => {
  const { data } = await axiosInstance.get<
    ApiEnvelope<ClientProfessionalDataResponse>
  >(endpoints.CLIENT_PROFESSIONAL_DATA.GET(clientId));
  return data;
};

export const updateProfessionalData = async (
  clientId: string,
  body: ClientProfessionalDataRequest,
): Promise<ApiEnvelope<ClientProfessionalDataResponse>> => {
  const { data } = await axiosInstance.put<
    ApiEnvelope<ClientProfessionalDataResponse>
  >(endpoints.CLIENT_PROFESSIONAL_DATA.UPDATE(clientId), body);
  return data;
};
