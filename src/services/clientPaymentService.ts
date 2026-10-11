import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  ClientPaymentRequest,
  ClientPaymentUpdateRequest,
  ClientPaymentResponse,
} from "@/interfaces/client/ClientSubResources.interface";
import { feedback, type RequestFeedback } from "@/services/requestFeedback";

export const createPayment = async (
  clientId: string,
  body: ClientPaymentRequest,
  options?: RequestFeedback,
): Promise<ApiEnvelope<ClientPaymentResponse>> => {
  const { data } = await axiosInstance.post<ApiEnvelope<ClientPaymentResponse>>(
    endpoints.CLIENT_PAYMENTS.CREATE(clientId),
    body,
    feedback("Valor a receber lançado.", options),
  );
  return data;
};

export const getPayment = async (
  clientId: string,
  paymentId: string,
): Promise<ApiEnvelope<ClientPaymentResponse>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<ClientPaymentResponse>>(
    endpoints.CLIENT_PAYMENTS.BY_ID(clientId, paymentId),
  );
  return data;
};

/** PATCH — atualização parcial (ex.: marcar como pago). */
export const patchPayment = async (
  clientId: string,
  paymentId: string,
  body: ClientPaymentUpdateRequest,
  options?: RequestFeedback,
): Promise<ApiEnvelope<ClientPaymentResponse>> => {
  const { data } = await axiosInstance.patch<ApiEnvelope<ClientPaymentResponse>>(
    endpoints.CLIENT_PAYMENTS.PATCH(clientId, paymentId),
    body,
    feedback("Parcela atualizada.", options),
  );
  return data;
};

/** DELETE — backend responde 204 sem corpo. */
export const deletePayment = async (
  clientId: string,
  paymentId: string,
  options?: RequestFeedback,
): Promise<void> => {
  await axiosInstance.delete(endpoints.CLIENT_PAYMENTS.DELETE(clientId, paymentId), feedback("Parcela excluída.", options));
};
