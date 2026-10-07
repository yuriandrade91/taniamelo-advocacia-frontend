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
export const getAppointmentModalityKeyByLabel =
  appointmentModality.getKeyByLabel;

export {
  APPOINTMENT_TYPE_ENTRIES,
  APPOINTMENT_STATUS_ENTRIES,
  APPOINTMENT_MODALITY_ENTRIES,
};
