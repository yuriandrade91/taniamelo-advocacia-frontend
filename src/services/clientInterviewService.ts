import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  ClientInterviewRequest,
  ClientInterviewResponse,
} from "@/interfaces/client/ClientSubResources.interface";
import { feedback, type RequestFeedback } from "@/services/requestFeedback";

/** Entrevistas — ClientInterviewController. Base: /clients/{clientId}/interviews */

export const listInterviews = async (
  clientId: string,
  params?: { pageNumber?: number; pageSize?: number },
): Promise<ApiEnvelope<ClientInterviewResponse[]>> => {
  const { data } = await axiosInstance.get<
    ApiEnvelope<ClientInterviewResponse[]>
  >(endpoints.CLIENT_INTERVIEWS.LIST(clientId), { params });
  return data;
};

export const createInterview = async (
  clientId: string,
  body: ClientInterviewRequest,
  options?: RequestFeedback,
): Promise<ApiEnvelope<ClientInterviewResponse>> => {
  const { data } = await axiosInstance.post<
    ApiEnvelope<ClientInterviewResponse>
  >(endpoints.CLIENT_INTERVIEWS.CREATE(clientId), body, feedback("Entrevista salva.", options));
  return data;
};

export const updateInterview = async (
  clientId: string,
  interviewId: string,
  body: ClientInterviewRequest,
  options?: RequestFeedback,
): Promise<ApiEnvelope<ClientInterviewResponse>> => {
  const { data } = await axiosInstance.put<ApiEnvelope<ClientInterviewResponse>>(
    endpoints.CLIENT_INTERVIEWS.UPDATE(clientId, interviewId),
    body,
    feedback("Entrevista atualizada.", options),
  );
  return data;
};

