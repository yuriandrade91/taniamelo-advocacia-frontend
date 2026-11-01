import {
  getLocalTimeZone,
  parseAbsoluteToLocal,
  toCalendarDate,
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
type AppointmentFormField =
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

/**
 * Escolher o início arruma o término: sem término, ele nasce **1h depois**;
 * com término, acompanha o início e **mantém a duração** — mexer na hora de um
 * compromisso de duas horas não o encolhe nem o deixa terminando antes de
 * começar. Se o término que estava lá já não é posterior ao início (duração
 * inválida), volta a 1h. Limpar o início não mexe no término.
 *
 * Só conta quando a **hora** foi escolhida: o calendário, sem hora no campo,
 * entrega o dia às 00:00. Esse "dia sem hora" (campo vazio e meia-noite) não
 * preenche o término — ele espera a hora ser digitada.
 */
export function withStart(
  values: AppointmentFormValues,
  startAt: CalendarDateTime | null,
): AppointmentFormValues {
  if (!startAt) return { ...values, startAt };
  const isDayOnly = !values.startAt && startAt.hour === 0 && startAt.minute === 0;
  if (isDayOnly) return { ...values, startAt };

  const durationMs =
    values.startAt && values.endAt
      ? values.endAt.toDate(getLocalTimeZone()).getTime() -
        values.startAt.toDate(getLocalTimeZone()).getTime()
      : 0;
  const endAt =
    durationMs > 0 ? startAt.add({ minutes: Math.round(durationMs / 60_000) }) : startAt.add({ hours: 1 });
  return { ...values, startAt, endAt };
}

/** O dia do início (`2026-11-02`), ou `""` sem início — a chave da consulta de feriado. */
export const dayOf = (startAt: CalendarDateTime | null): string =>
  startAt ? toCalendarDate(startAt).toString() : "";

/** ISO-8601 -> `CalendarDateTime` local, pro `DatePicker`. */
function fromIsoInstant(
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
  const candidates: AppointmentFormErrors = {
    title: titleError(values.title),
    type: values.type ? undefined : "Selecione o tipo.",
    startAt: values.startAt ? undefined : "Informe a data e hora de início.",
    endAt: endAtError(values),
    meetingUrl: meetingUrlError(values.meetingUrl),
    clientName: clientNameError(values),
    description: descriptionError(values.description),
    justification:
      isEditing && !values.justification.trim()
        ? "A justificativa é obrigatória na edição."
        : undefined,
  };
  // Só os campos com erro: a tela lê "tem a chave" como "tem erro".
  return Object.fromEntries(Object.entries(candidates).filter(([, message]) => message));
}

function titleError(raw: string): string | undefined {
  const title = raw.trim();
  if (!title) return "Informe um título.";
  if (title.length < MIN_TITLE_LENGTH) {
    return `O título precisa ter pelo menos ${MIN_TITLE_LENGTH} caracteres.`;
  }
  return undefined;
}

function endAtError(values: AppointmentFormValues): string | undefined {
  if (!values.endAt) return "Informe a data e hora de término.";
  const startAt = toIsoInstant(values.startAt);
  const endAt = toIsoInstant(values.endAt);
  if (!startAt || !endAt) return undefined;
  const diffMinutes = (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60_000;
  if (diffMinutes <= 0) return "O término deve ser posterior ao início.";
  if (diffMinutes < MIN_DURATION_MINUTES) {
    return `O compromisso precisa durar pelo menos ${MIN_DURATION_MINUTES} minutos.`;
  }
  return undefined;
}

function meetingUrlError(raw: string): string | undefined {
  const url = raw.trim();
  if (!url) return undefined;
  try {
    new URL(url);
    return undefined;
  } catch {
    return "Informe uma URL válida (com https://).";
  }
}

/**
 * Cliente é obrigatório — por `clientId` (selecionado na busca) ou, na
 * falta de um cadastro correspondente, pelo nome digitado livre.
 */
function clientNameError(values: AppointmentFormValues): string | undefined {
  if (values.clientId) return undefined;
  const clientName = values.clientName.trim();
  if (!clientName) return "Informe o cliente.";
  if (clientName.length < MIN_CLIENT_NAME_LENGTH) {
    return `O nome do cliente precisa ter pelo menos ${MIN_CLIENT_NAME_LENGTH} caracteres.`;
  }
  return undefined;
}

function descriptionError(raw: string): string | undefined {
  const description = raw.trim();
  if (description && description.length < MIN_DESCRIPTION_LENGTH) {
    return `A descrição precisa ter pelo menos ${MIN_DESCRIPTION_LENGTH} caracteres.`;
  }
  return undefined;
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
