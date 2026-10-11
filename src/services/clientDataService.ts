import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  ClientPersonalDataRequest,
  ClientPersonalDataResponse,
  ClientProfessionalDataRequest,
  ClientProfessionalDataResponse,
} from "@/interfaces/client/ClientSubResources.interface";
import { feedback, type RequestFeedback } from "@/services/requestFeedback";

/**
 * Dados pessoais e profissionais (recursos 1:1 do cliente).
 * ClientPersonalDataController + ClientProfessionalDataController.
 */

export const updatePersonalData = async (
  clientId: string,
  body: ClientPersonalDataRequest,
  options?: RequestFeedback,
): Promise<ApiEnvelope<ClientPersonalDataResponse>> => {
  const { data } = await axiosInstance.put<
    ApiEnvelope<ClientPersonalDataResponse>
  >(endpoints.CLIENT_PERSONAL_DATA.UPDATE(clientId), body, feedback("Dados pessoais salvos.", options));
  return data;
};

export const updateProfessionalData = async (
  clientId: string,
  body: ClientProfessionalDataRequest,
  options?: RequestFeedback,
): Promise<ApiEnvelope<ClientProfessionalDataResponse>> => {
  const { data } = await axiosInstance.put<
    ApiEnvelope<ClientProfessionalDataResponse>
  >(endpoints.CLIENT_PROFESSIONAL_DATA.UPDATE(clientId), body, feedback("Dados profissionais salvos.", options));
  return data;
};
