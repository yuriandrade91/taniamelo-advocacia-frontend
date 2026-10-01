import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type { DisabilityPeriodRequest } from "@/components/clients/form/disabilityPeriods";
import type { DisabilityGradeLabel } from "@/enums/disabilityGrade/DisabilityGrade";

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

export type DisabilityConversionLine = {
  grade: DisabilityGradeLabel;
  gradeYears: number;
  days: number;
  factor: number;
  convertedDays: number;
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
): Promise<ApiEnvelope<DisabilityPeriodResponse>> => {
  const { data } = await axiosInstance.post<
    ApiEnvelope<DisabilityPeriodResponse>
  >(endpoints.CLIENT_DISABILITY_PERIODS.CREATE(clientId), body);
  return data;
};

export const updateDisabilityPeriod = async (
  clientId: string,
  periodId: string,
  body: DisabilityPeriodRequest,
): Promise<ApiEnvelope<DisabilityPeriodResponse>> => {
  const { data } = await axiosInstance.put<
    ApiEnvelope<DisabilityPeriodResponse>
  >(endpoints.CLIENT_DISABILITY_PERIODS.UPDATE(clientId, periodId), body);
  return data;
};

export const deleteDisabilityPeriod = async (
  clientId: string,
  periodId: string,
): Promise<void> => {
  await axiosInstance.delete(
    endpoints.CLIENT_DISABILITY_PERIODS.DELETE(clientId, periodId),
  );
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
): Promise<ApiEnvelope<DisabilityConversionResponse>> => {
  const { data } = await axiosInstance.get<
    ApiEnvelope<DisabilityConversionResponse>
  >(endpoints.CLIENT_DISABILITY_PERIODS.CONVERSION(clientId), {
    params: to ? { to } : undefined,
  });
  return data;
};
