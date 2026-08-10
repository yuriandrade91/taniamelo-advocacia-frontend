import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  ClientInterviewRequest,
  ClientInterviewResponse,
} from "@/interfaces/client/ClientSubResources.interface";

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
): Promise<ApiEnvelope<ClientInterviewResponse>> => {
  const { data } = await axiosInstance.post<
    ApiEnvelope<ClientInterviewResponse>
  >(endpoints.CLIENT_INTERVIEWS.CREATE(clientId), body);
  return data;
};

export const getInterview = async (
  clientId: string,
  interviewId: string,
): Promise<ApiEnvelope<ClientInterviewResponse>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<ClientInterviewResponse>>(
    endpoints.CLIENT_INTERVIEWS.BY_ID(clientId, interviewId),
  );
  return data;
};

export const updateInterview = async (
  clientId: string,
  interviewId: string,
  body: ClientInterviewRequest,
): Promise<ApiEnvelope<ClientInterviewResponse>> => {
  const { data } = await axiosInstance.put<ApiEnvelope<ClientInterviewResponse>>(
    endpoints.CLIENT_INTERVIEWS.UPDATE(clientId, interviewId),
    body,
  );
  return data;
};

/** DELETE — backend responde 204 sem corpo. */
export const deleteInterview = async (
  clientId: string,
  interviewId: string,
): Promise<void> => {
  await axiosInstance.delete(
    endpoints.CLIENT_INTERVIEWS.DELETE(clientId, interviewId),
  );
};
