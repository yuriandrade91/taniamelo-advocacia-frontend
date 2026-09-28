/**
 * Espelha os enums da agenda no backend:
 * `AppointmentType`, `AppointmentStatus` e `AppointmentModality`.
 *
 * Mesmo contrato dos demais enums do projeto (@JsonValue/@JsonCreator):
 * a API **devolve o label** PT-BR e **aceita o nome da constante OU o label**.
 * Por isso cada enum expõe `…Key` (constante), `…Label` e `…Input`.
 */
import { createEnum } from "@/lib/enumFactory";

// ── Tipo do compromisso ──
const APPOINTMENT_TYPE_ENTRIES = [
  ["ENTREVISTA", "Entrevista"],
  ["REUNIAO", "Reunião"],
  ["PERICIA", "Perícia"],
  ["AUDIENCIA", "Audiência"],
  ["PRAZO", "Prazo"],
  ["OUTRO", "Outro"],
] as const;

const appointmentType = createEnum(APPOINTMENT_TYPE_ENTRIES);

export type AppointmentTypeKey = (typeof APPOINTMENT_TYPE_ENTRIES)[number][0];
export type AppointmentTypeLabel = (typeof APPOINTMENT_TYPE_ENTRIES)[number][1];
export type AppointmentTypeInput = AppointmentTypeKey | AppointmentTypeLabel;

export const AppointmentTypeOptions = appointmentType.options;
export const AppointmentTypeLabelByKey = appointmentType.labelByKey;
export const getAppointmentTypeKeyByLabel = appointmentType.getKeyByLabel;

// ── Situação ──
const APPOINTMENT_STATUS_ENTRIES = [
  ["AGENDADO", "Agendado"],
  ["CONCLUIDO", "Concluído"],
  ["CANCELADO", "Cancelado"],
] as const;

const appointmentStatus = createEnum(APPOINTMENT_STATUS_ENTRIES);

export type AppointmentStatusKey =
  (typeof APPOINTMENT_STATUS_ENTRIES)[number][0];
export type AppointmentStatusLabel =
  (typeof APPOINTMENT_STATUS_ENTRIES)[number][1];
export type AppointmentStatusInput =
  | AppointmentStatusKey
  | AppointmentStatusLabel;

export const AppointmentStatusOptions = appointmentStatus.options;
export const AppointmentStatusLabelByKey = appointmentStatus.labelByKey;
export const getAppointmentStatusKeyByLabel = appointmentStatus.getKeyByLabel;

// ── Modalidade ──
const APPOINTMENT_MODALITY_ENTRIES = [
  ["PRESENCIAL", "Presencial"],
  ["ONLINE", "Online"],
] as const;

const appointmentModality = createEnum(APPOINTMENT_MODALITY_ENTRIES);

export type AppointmentModalityKey =
  (typeof APPOINTMENT_MODALITY_ENTRIES)[number][0];
export type AppointmentModalityLabel =
  (typeof APPOINTMENT_MODALITY_ENTRIES)[number][1];
export type AppointmentModalityInput =
  | AppointmentModalityKey
  | AppointmentModalityLabel;

export const AppointmentModalityOptions = appointmentModality.options;
export const AppointmentModalityLabelByKey = appointmentModality.labelByKey;
export const getAppointmentModalityKeyByLabel =
  appointmentModality.getKeyByLabel;

/**
 * Ação da trilha de alterações (`appointment_history`).
 * Diferente dos demais: o backend documenta como "puramente técnica", sem
 * label — a API devolve o nome da constante. Por não ter o par chave/label,
 * não passa pela fábrica.
 */
export const APPOINTMENT_ACTIONS = [
  "EDITED",
  "CANCELLED",
  "ACKNOWLEDGED",
] as const;
export type AppointmentAction = (typeof APPOINTMENT_ACTIONS)[number];

/** Rótulos PT-BR para exibição — montados no frontend, não vêm da API. */
export const AppointmentActionLabel: Record<AppointmentAction, string> = {
  EDITED: "Editado",
  CANCELLED: "Cancelado",
  ACKNOWLEDGED: "Ciência de data passada",
};

export {
  APPOINTMENT_TYPE_ENTRIES,
  APPOINTMENT_STATUS_ENTRIES,
  APPOINTMENT_MODALITY_ENTRIES,
};
