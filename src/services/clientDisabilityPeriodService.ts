import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type { DisabilityPeriodRequest } from "@/components/clients/form/disabilityPeriods";
import type { DisabilityGradeLabel } from "@/enums/disabilityGrade/DisabilityGrade";
import { feedback, type RequestFeedback } from "@/services/requestFeedback";

/**
 * Períodos de deficiência — ClientDisabilityPeriodController.
 * Base: /clients/{clientId}/disability-periods
 */

export type DisabilityPeriodResponse = {
  id: string;
  /** Label PT-BR: a API devolve o rótulo, não o nome da constante. */
  grade: DisabilityGradeLabel;
  startedOn: string;
  /** `null` quando se mantém até a presente data. */
  endedOn: string | null;
  ongoing: boolean;
  /** Dias corridos, calculados no servidor (fim em aberto = hoje no fuso do escritório). */
  days: number;
};

type DisabilityConversionLine = {
  grade: DisabilityGradeLabel;
  gradeYears: number;
  days: number;
  factor: number;
  convertedDays: number;
  startedOn: string;
  /** O fim que entrou na conta; num intervalo em aberto, hoje no fuso do escritório. */
  endedOn: string;
  ongoing: boolean;
};

export type DisabilityConversionResponse = {
  convertedTo: DisabilityGradeLabel;
  targetYears: number;
  lines: DisabilityConversionLine[];
  totalDays: number;
  totalYears: number;
  totalMonths: number;
  totalRemainingDays: number;
  totalLabel: string;
};

export const listDisabilityPeriods = async (
  clientId: string,
): Promise<ApiEnvelope<DisabilityPeriodResponse[]>> => {
  const { data } = await axiosInstance.get<
    ApiEnvelope<DisabilityPeriodResponse[]>
  >(endpoints.CLIENT_DISABILITY_PERIODS.LIST(clientId));
  return data;
};

export const createDisabilityPeriod = async (
  clientId: string,
  body: DisabilityPeriodRequest,
  options?: RequestFeedback,
): Promise<ApiEnvelope<DisabilityPeriodResponse>> => {
  const { data } = await axiosInstance.post<
    ApiEnvelope<DisabilityPeriodResponse>
  >(endpoints.CLIENT_DISABILITY_PERIODS.CREATE(clientId), body, feedback("Período de deficiência salvo.", options));
  return data;
};

export const updateDisabilityPeriod = async (
  clientId: string,
  periodId: string,
  body: DisabilityPeriodRequest,
  options?: RequestFeedback,
): Promise<ApiEnvelope<DisabilityPeriodResponse>> => {
  const { data } = await axiosInstance.put<
    ApiEnvelope<DisabilityPeriodResponse>
  >(endpoints.CLIENT_DISABILITY_PERIODS.UPDATE(clientId, periodId), body, feedback("Período de deficiência atualizado.", options));
  return data;
};

export const deleteDisabilityPeriod = async (
  clientId: string,
  periodId: string,
  options?: RequestFeedback,
): Promise<void> => {
  await axiosInstance.delete(endpoints.CLIENT_DISABILITY_PERIODS.DELETE(clientId, periodId), feedback("Período de deficiência excluído.", options));
};

/**
 * O tempo convertido, calculado pelo servidor.
 *
 * A tela faz o mesmo cálculo localmente (`lib/disabilityTime.ts`) para mostrar
 * o total enquanto a pessoa digita — durante o cadastro não existe `clientId`
 * para consultar. Esta chamada é a versão autoritativa, para a ficha de um
 * cliente já gravado: é o número que o servidor assina.
 *
 * Responde **400** se o sexo do cliente não for masculino ou feminino — a LC
 * 142/2013 tem duas colunas, e escolher uma por conta própria seria decisão
 * jurídica tomada em silêncio.
 */
export const getDisabilityConversion = async (
  clientId: string,
  to?: string,
  options?: {
    /**
     * Sem toast global. A ficha consulta ao abrir, e o 400 de sexo fora da
     * tabela é um estado que ela explica no lugar da conta — um toast
     * vermelho a cada abertura trataria como falha o que é só a lei.
     */
    silent?: boolean;
  },
): Promise<ApiEnvelope<DisabilityConversionResponse>> => {
  const { data } = await axiosInstance.get<
    ApiEnvelope<DisabilityConversionResponse>
  >(endpoints.CLIENT_DISABILITY_PERIODS.CONVERSION(clientId), {
    params: to ? { to } : undefined,
    skipErrorToast: options?.silent,
  });
  return data;
};
