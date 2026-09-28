import {
  getLocalTimeZone,
  parseAbsoluteToLocal,
  toCalendarDateTime,
  type CalendarDateTime,
} from "@internationalized/date";
import type {
  AppointmentModalityKey,
  AppointmentTypeKey,
} from "@/enums/appointment/Appointment";
import {
  getAppointmentModalityKeyByLabel,
  getAppointmentTypeKeyByLabel,
} from "@/enums/appointment/Appointment";
import type {
  AppointmentRequest,
  AppointmentResponse,
} from "@/interfaces/appointment/Appointment.interface";

/**
 * Formulário de compromisso: shape, validação e conversão de/para a API.
 *
 * Fica fora do componente de propósito — a regra de obrigatoriedade espelha as
 * constraints do backend e precisa ser testável e reutilizável (o mesmo
 * formulário serve criação e edição). O componente só renderiza e chama daqui.
 */

/**
 * Campos do formulário. Início/término usam `CalendarDateTime` (data+hora,
 * sem timezone — @internationalized/date) porque é o tipo de valor que o
 * `DatePicker` do HeroUI espera/devolve; a API recebe um único `Instant`
 * ISO-8601, montado em `toRequest`.
 */
export type AppointmentFormValues = {
  title: string;
  type: AppointmentTypeKey | "";
  startAt: CalendarDateTime | null;
  endAt: CalendarDateTime | null;
  modality: AppointmentModalityKey | "";
  location: string;
  meetingUrl: string;
  description: string;
  clientId: string;
  clientName: string;
  /** Só usado na edição — obrigatório lá. */
  justification: string;
  /** Ciência de data no passado (evita o 422 PAST_DATE_NOT_CONFIRMED). */
  pastDateAcknowledged: boolean;
};

export const EMPTY_APPOINTMENT_FORM: AppointmentFormValues = {
  title: "",
  type: "",
  startAt: null,
  endAt: null,
  modality: "",
  location: "",
  meetingUrl: "",
  description: "",
  clientId: "",
  clientName: "",
  justification: "",
  pastDateAcknowledged: false,
};

/** Campos que podem exibir mensagem de erro. */
export type AppointmentFormField =
  | "title"
  | "type"
  | "startAt"
  | "endAt"
  | "meetingUrl"
  | "clientName"
  | "description"
  | "justification";

/** Tamanhos mínimos exigidos nos campos de texto livre. */
const MIN_TITLE_LENGTH = 3;
const MIN_CLIENT_NAME_LENGTH = 3;
const MIN_DESCRIPTION_LENGTH = 10;
/** Duração mínima entre início e término. */
const MIN_DURATION_MINUTES = 5;

export type AppointmentFormErrors = Partial<
  Record<AppointmentFormField, string>
>;

/** `CalendarDateTime` (sem timezone, hora local) -> ISO-8601 UTC (o que o `Instant` espera). */
export function toIsoInstant(value: CalendarDateTime | null): string | null {
  if (!value) return null;
  try {
    return value.toDate(getLocalTimeZone()).toISOString();
  } catch {
    return null;
  }
}

/**
 * Move o compromisso para começar quando o conflito termina, **preservando a
 * duração**.
 *
 * É a saída não destrutiva do conflito: em vez de cancelar o que já existe,
 * encaixa o novo logo depois. Preservar a duração é o ponto — uma reunião de
 * uma hora continua de uma hora; recalcular só o início e deixar o término
 * onde estava encolheria o compromisso em silêncio.
 *
 * Devolve os valores inalterados quando não há o que mover, para o chamador
 * poder aplicar o resultado sem um `if` próprio.
 */
export function shiftAfter(
  values: AppointmentFormValues,
  conflictEndIso: string,
): AppointmentFormValues {
  const nextStart = fromIsoInstant(conflictEndIso);
  if (!nextStart || !values.startAt || !values.endAt) return values;

  const durationMs =
    values.endAt.toDate(getLocalTimeZone()).getTime() -
    values.startAt.toDate(getLocalTimeZone()).getTime();
  if (durationMs <= 0) return values;

  const nextEnd = fromIsoInstant(
    new Date(nextStart.toDate(getLocalTimeZone()).getTime() + durationMs).toISOString(),
  );
  if (!nextEnd) return values;

  return { ...values, startAt: nextStart, endAt: nextEnd };
}

/** ISO-8601 -> `CalendarDateTime` local, pro `DatePicker`. */
export function fromIsoInstant(
  iso?: string | null,
): CalendarDateTime | null {
  if (!iso) return null;
  try {
    return toCalendarDateTime(parseAbsoluteToLocal(iso));
  } catch {
    return null;
  }
}

/**
 * Valida o formulário espelhando o backend:
 *
 * | Campo           | Regra no backend                                  |
 * |-----------------|---------------------------------------------------|
 * | `title`         | `@NotBlank`                                       |
 * | `type`          | `@NotNull`                                        |
 * | `startAt`       | `@NotNull`                                        |
 * | `endAt`         | `@NotNull` + `@AssertTrue` (posterior a `startAt`)|
 * | `justification` | obrigatório **na edição** (validado no service)   |
 *
 * `meetingUrl` não tem constraint no backend, mas validamos o formato aqui:
 * uma URL quebrada só apareceria na hora de entrar na reunião.
 *
 * Além disso, `clientId`/`clientName` são obrigatórios (por `clientId`,
 * vinculado na busca, ou por nome livre) e exigimos tamanhos mínimos em
 * `title`, `clientName` (quando preenchido como texto livre) e `description`,
 * mais uma duração mínima entre `startAt`/`endAt` — nenhum desses é
 * constraint do backend, mas evitam registros sem informação útil.
 */
export function validateAppointmentForm(
  values: AppointmentFormValues,
  { isEditing }: { isEditing: boolean },
): AppointmentFormErrors {
  const errors: AppointmentFormErrors = {};

  const title = values.title.trim();
  if (!title) errors.title = "Informe um título.";
  else if (title.length < MIN_TITLE_LENGTH) {
    errors.title = `O título precisa ter pelo menos ${MIN_TITLE_LENGTH} caracteres.`;
  }

  if (!values.type) errors.type = "Selecione o tipo.";
  if (!values.startAt) errors.startAt = "Informe a data e hora de início.";
  if (!values.endAt) errors.endAt = "Informe a data e hora de término.";

  const startAt = toIsoInstant(values.startAt);
  const endAt = toIsoInstant(values.endAt);

  if (startAt && endAt) {
    const diffMinutes =
      (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60_000;
    if (diffMinutes <= 0) {
      errors.endAt = "O término deve ser posterior ao início.";
    } else if (diffMinutes < MIN_DURATION_MINUTES) {
      errors.endAt = `O compromisso precisa durar pelo menos ${MIN_DURATION_MINUTES} minutos.`;
    }
  }

  if (values.meetingUrl.trim()) {
    try {
      new URL(values.meetingUrl.trim());
    } catch {
      errors.meetingUrl = "Informe uma URL válida (com https://).";
    }
  }

  // Cliente é obrigatório — por `clientId` (selecionado na busca) ou, na
  // falta de um cadastro correspondente, pelo nome digitado livre.
  const clientName = values.clientName.trim();
  if (!values.clientId && !clientName) {
    errors.clientName = "Informe o cliente.";
  } else if (!values.clientId && clientName.length < MIN_CLIENT_NAME_LENGTH) {
    errors.clientName = `O nome do cliente precisa ter pelo menos ${MIN_CLIENT_NAME_LENGTH} caracteres.`;
  }

  const description = values.description.trim();
  if (description && description.length < MIN_DESCRIPTION_LENGTH) {
    errors.description = `A descrição precisa ter pelo menos ${MIN_DESCRIPTION_LENGTH} caracteres.`;
  }

  if (isEditing && !values.justification.trim()) {
    errors.justification = "A justificativa é obrigatória na edição.";
  }

  return errors;
}

/** `true` quando o início já passou — dispara o aviso de ciência. */
export function isStartInPast(values: AppointmentFormValues): boolean {
  const startAt = toIsoInstant(values.startAt);
  return startAt !== null && new Date(startAt).getTime() < Date.now();
}

/**
 * Converte o formulário no corpo da API.
 *
 * Campos opcionais em branco viram `undefined` (e somem do JSON) em vez de
 * string vazia — `location: ""` sobrescreveria o valor no PUT, que é
 * substituição completa.
 */
export function toRequest(
  values: AppointmentFormValues,
  { isEditing }: { isEditing: boolean },
): AppointmentRequest {
  const startAt = toIsoInstant(values.startAt);
  const endAt = toIsoInstant(values.endAt);

  if (!startAt || !endAt || !values.type) {
    // Chamar `toRequest` com o formulário inválido é erro de programação:
    // `validateAppointmentForm` deve rodar antes.
    throw new Error("Formulário inválido: valide antes de montar o payload.");
  }

  const trimmed = (value: string) => {
    const next = value.trim();
    return next === "" ? undefined : next;
  };

  return {
    title: values.title.trim(),
    type: values.type,
    startAt,
    endAt,
    modality: values.modality || undefined,
    location: trimmed(values.location),
    meetingUrl: trimmed(values.meetingUrl),
    description: trimmed(values.description),
    clientId: trimmed(values.clientId),
    // O backend ignora `clientName` quando há `clientId` — não enviamos os dois.
    clientName: values.clientId.trim() ? undefined : trimmed(values.clientName),
    justification: isEditing ? values.justification.trim() : undefined,
    pastDateAcknowledged: values.pastDateAcknowledged || undefined,
  };
}

/** Preenche o formulário a partir de um compromisso vindo da API. */
export function fromResponse(
  appointment: AppointmentResponse,
): AppointmentFormValues {
  return {
    title: appointment.title ?? "",
    // A API devolve o LABEL dos enums; convertemos de volta para a constante.
    type: getAppointmentTypeKeyByLabel(appointment.type) ?? "",
    startAt: fromIsoInstant(appointment.startAt),
    endAt: fromIsoInstant(appointment.endAt),
    modality:
      getAppointmentModalityKeyByLabel(appointment.modality ?? undefined) ?? "",
    location: appointment.location ?? "",
    meetingUrl: appointment.meetingUrl ?? "",
    description: appointment.description ?? "",
    clientId: appointment.clientId ?? "",
    clientName: appointment.clientName ?? "",
    // Nunca reaproveitada: cada edição exige uma justificativa nova.
    justification: "",
    pastDateAcknowledged: false,
  };
}
