import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  AppointmentCancelRequest,
  AppointmentHistory,
  AppointmentListRequest,
  AppointmentRequest,
  AppointmentResponse,
  AppointmentSummary,
} from "@/interfaces/appointment/Appointment.interface";

/**
 * Agenda — AppointmentController. Base: /api/v1/appointments
 *
 * Recurso top-level e tenant-scoped: o `X-Tenant-Id` é injetado pelo
 * `axiosService`, e um compromisso vinculado a cliente carrega `clientId` no
 * corpo — não na URL.
 */

/**
 * Para ações que já avisaram o usuário na própria tela (janela de desfazer):
 * a requisição sai calada, sem o toast de sucesso do interceptor.
 */
export type SilenceableRequest = { silent?: boolean };

/** GET /appointments — paginado (1-based), ordenado por início asc. */
export const listAppointments = async (
  params?: AppointmentListRequest,
): Promise<ApiEnvelope<AppointmentResponse[]>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<AppointmentResponse[]>>(
    endpoints.APPOINTMENTS.LIST,
    { params },
  );
  return data;
};

/**
 * GET /appointments/summary?year= — contagem por mês, para as abas.
 * Exclui cancelados (regra do backend).
 */
export const getAppointmentSummary = async (
  year: number,
): Promise<ApiEnvelope<AppointmentSummary[]>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<AppointmentSummary[]>>(
    endpoints.APPOINTMENTS.SUMMARY,
    { params: { year } },
  );
  return data;
};

/**
 * GET /appointments/conflicts — compromissos agendados na mesma faixa.
 *
 * `skipErrorToast` porque isto roda **enquanto a pessoa preenche o
 * formulário**: uma falha aqui não impede de agendar (o backend não bloqueia
 * por conflito de qualquer forma), e um toast vermelho a cada ajuste de horário
 * seria ruído sobre uma checagem que é só um aviso.
 */
export const getAppointmentConflicts = async (params: {
  startAt: string;
  endAt: string;
  excludeId?: string;
}): Promise<ApiEnvelope<AppointmentResponse[]>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<AppointmentResponse[]>>(
    endpoints.APPOINTMENTS.CONFLICTS,
    { params, skipErrorToast: true },
  );
  return data;
};

/** GET /appointments/{id}. */
export const getAppointment = async (
  appointmentId: string,
): Promise<ApiEnvelope<AppointmentResponse>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<AppointmentResponse>>(
    endpoints.APPOINTMENTS.BY_ID(appointmentId),
  );
  return data;
};

/**
 * POST /appointments — responde 201.
 *
 * `justification` é ignorada aqui (só vale na edição). Se `startAt` estiver no
 * passado e `pastDateAcknowledged` não for `true`, o backend recusa com 422
 * `PAST_DATE_NOT_CONFIRMED` — cabe à UI perguntar e repetir com a confirmação.
 */
export const createAppointment = async (
  body: AppointmentRequest,
): Promise<ApiEnvelope<AppointmentResponse>> => {
  const { data } = await axiosInstance.post<ApiEnvelope<AppointmentResponse>>(
    endpoints.APPOINTMENTS.CREATE,
    body,
    { successMessage: "Compromisso agendado com sucesso." },
  );
  return data;
};

/**
 * PUT /appointments/{id} — substituição completa.
 * `justification` é obrigatória; sem ela o backend responde erro de validação.
 */
export const updateAppointment = async (
  appointmentId: string,
  body: AppointmentRequest,
): Promise<ApiEnvelope<AppointmentResponse>> => {
  const { data } = await axiosInstance.put<ApiEnvelope<AppointmentResponse>>(
    endpoints.APPOINTMENTS.UPDATE(appointmentId),
    body,
    { successMessage: "Compromisso atualizado com sucesso." },
  );
  return data;
};

/** PATCH /appointments/{id}/cancel — justificativa obrigatória. */
export const cancelAppointment = async (
  appointmentId: string,
  body: AppointmentCancelRequest,
  options?: SilenceableRequest,
): Promise<ApiEnvelope<AppointmentResponse>> => {
  const { data } = await axiosInstance.patch<ApiEnvelope<AppointmentResponse>>(
    endpoints.APPOINTMENTS.CANCEL(appointmentId),
    body,
    {
      successMessage: "Compromisso cancelado com sucesso.",
      skipSuccessToast: options?.silent,
    },
  );
  return data;
};

/**
 * PATCH /appointments/{id}/complete — responde 200 com o compromisso atualizado.
 *
 * Concluir é estado terminal no backend: depois dele não há editar, cancelar
 * nem voltar. Recusa com 422 se já estiver concluído ou cancelado.
 *
 * Concluir ANTES do horário de início devolve 422
 * `EARLY_COMPLETION_NOT_CONFIRMED` — dar por realizado o que a agenda diz que
 * ainda vai acontecer é quase sempre linha errada da lista. Cabe à UI
 * perguntar e repetir com `earlyCompletionAcknowledged: true`; a ciência fica
 * na trilha. Corpo omitido quando não há o que confirmar.
 */
export const completeAppointment = async (
  appointmentId: string,
  options?: SilenceableRequest & { earlyCompletionAcknowledged?: boolean },
): Promise<ApiEnvelope<AppointmentResponse>> => {
  const { data } = await axiosInstance.patch<ApiEnvelope<AppointmentResponse>>(
    endpoints.APPOINTMENTS.COMPLETE(appointmentId),
    options?.earlyCompletionAcknowledged
      ? { earlyCompletionAcknowledged: true }
      : undefined,
    {
      successMessage: "Compromisso concluído com sucesso.",
      skipSuccessToast: options?.silent,
    },
  );
  return data;
};

/** DELETE /appointments/{id} — soft delete; backend responde 204 sem corpo. */
export const deleteAppointment = async (
  appointmentId: string,
  options?: SilenceableRequest,
): Promise<void> => {
  await axiosInstance.delete(endpoints.APPOINTMENTS.DELETE(appointmentId), {
    successMessage: "Compromisso excluído com sucesso.",
    skipSuccessToast: options?.silent,
  });
};

/** GET /appointments/{id}/history — paginado, mais recente primeiro. */
export const listAppointmentHistory = async (
  appointmentId: string,
  params?: { pageNumber?: number; pageSize?: number },
): Promise<ApiEnvelope<AppointmentHistory[]>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<AppointmentHistory[]>>(
    endpoints.APPOINTMENTS.HISTORY(appointmentId),
    { params },
  );
  return data;
};
