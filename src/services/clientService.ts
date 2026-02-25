import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import { Clients } from "@/interfaces/Clients.interface";
import { ApiEnvelope } from "@/interfaces/Envelope.interface";
import { ClientListRequest } from "@/interfaces/client/Request/ClientRequest.interface";

export const clients = async (params?: ClientListRequest): Promise<ApiEnvelope<Clients[]>> => {
  const response = await axiosInstance.get<ApiEnvelope<Clients[]>>(endpoints.URL_CLIENTS.CLIENT, { params });

  return response.data;
};

export const clientById = async (clientId: string | number): Promise<Clients> => {
  const response = await axiosInstance.get<ApiEnvelope<Clients>>(
    `${endpoints.URL_CLIENTS.CLIENT}/${clientId}`
  );

  // backend sometimes returns a raw object for single resource
  return (response.data?.data as Clients) ?? (response.data as unknown as Clients);
};
