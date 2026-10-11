import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type { RequestStageLabel } from "@/enums/requestStage/RequestStage";
import type { InssStepRequest } from "@/components/clients/inss/inssSteps";
import { feedback, type RequestFeedback } from "@/services/requestFeedback";
import {
  pendingEmptyList,
  pendingIntegration,
  pendingWrite,
} from "@/services/pendingIntegration";

/**
 * Andamento do processo no INSS — /clients/{clientId}/inss-steps.
 *
 * **Contrato proposto, ainda sem backend.** O desenho segue o dos períodos de
 * deficiência (sub-recurso do cliente, `LocalDate` sem fuso, enum pelo
 * rótulo). Enquanto a rota não sobe, o grupo `inss-steps` fica em
 * `NEXT_PUBLIC_PENDING_INTEGRATIONS` e a ficha diz que a parte não está no ar.
 */

export const INSS_STEPS_INTEGRATION = "inss-steps";

export type InssStepResponse = {
  id: string;
  /** Label PT-BR: a API devolve o rótulo, não o nome da constante. */
  step: RequestStageLabel;
  /** `YYYY-MM-DD` — o dia do evento no INSS, não o do registro. */
  occurredOn: string;
  /** Número do requerimento/protocolo no INSS. */
  protocol?: string | null;
  notes?: string | null;
  createdByUserId?: string | null;
  /** `Instant` do registro — desempata dois eventos no mesmo dia. */
  createdAt?: string;
};

export const listInssSteps = async (
  clientId: string,
): Promise<ApiEnvelope<InssStepResponse[]>> => {
  if (pendingIntegration(INSS_STEPS_INTEGRATION)) return pendingEmptyList();
  const { data } = await axiosInstance.get<ApiEnvelope<InssStepResponse[]>>(
    endpoints.CLIENT_INSS_STEPS.LIST(clientId),
  );
  return data;
};

export const createInssStep = async (
  clientId: string,
  body: InssStepRequest,
  options?: RequestFeedback,
): Promise<ApiEnvelope<InssStepResponse>> => {
  if (pendingIntegration(INSS_STEPS_INTEGRATION)) return pendingWrite("POST /api/v1/clients/{id}/inss-steps");
  const { data } = await axiosInstance.post<ApiEnvelope<InssStepResponse>>(
    endpoints.CLIENT_INSS_STEPS.CREATE(clientId),
    body,
    feedback("Andamento no INSS registrado.", options),
  );
  return data;
};

export const updateInssStep = async (
  clientId: string,
  stepId: string,
  body: InssStepRequest,
  options?: RequestFeedback,
): Promise<ApiEnvelope<InssStepResponse>> => {
  if (pendingIntegration(INSS_STEPS_INTEGRATION)) return pendingWrite("PUT /api/v1/clients/{id}/inss-steps/{stepId}");
  const { data } = await axiosInstance.put<ApiEnvelope<InssStepResponse>>(
    endpoints.CLIENT_INSS_STEPS.UPDATE(clientId, stepId),
    body,
    feedback("Andamento no INSS atualizado.", options),
  );
  return data;
};

export const deleteInssStep = async (
  clientId: string,
  stepId: string,
  options?: RequestFeedback,
): Promise<void> => {
  if (pendingIntegration(INSS_STEPS_INTEGRATION)) return pendingWrite("DELETE /api/v1/clients/{id}/inss-steps/{stepId}");
  await axiosInstance.delete(
    endpoints.CLIENT_INSS_STEPS.DELETE(clientId, stepId),
    feedback("Andamento no INSS excluído.", options),
  );
};
