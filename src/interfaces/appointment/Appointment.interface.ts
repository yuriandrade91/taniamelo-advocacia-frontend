import type {
  AppointmentAction,
  AppointmentModalityInput,
  AppointmentModalityLabel,
  AppointmentStatusInput,
  AppointmentStatusLabel,
  AppointmentTypeInput,
  AppointmentTypeLabel,
} from "@/enums/appointment/Appointment";

/**
 * Contratos da agenda — espelham `AppointmentRequestDTO`, `AppointmentResponseDTO`,
 * `AppointmentSummaryDTO`, `AppointmentHistoryDTO` e `AppointmentSearchParams`.
 *
 * Convenção de datas: o backend usa `Instant`, serializado em ISO-8601 UTC
 * (ex.: `2026-08-20T14:30:00Z`). Aqui trafega sempre como `string` — a
 * conversão de/para os inputs de data e hora fica na camada de UI.
 */

/** POST /appointments e PUT /appointments/{id}. */
export interface AppointmentRequest {
  /** Obrigatório (`@NotBlank`). */
  title: string;
  /** Obrigatório (`@NotNull`). Aceita nome da constante ou label. */
  type: AppointmentTypeInput;
  /** Obrigatório (`@NotNull`). ISO-8601. */
  startAt: string;
  /** Obrigatório (`@NotNull`). ISO-8601, posterior a `startAt` (`@AssertTrue`). */
  endAt: string;

  modality?: AppointmentModalityInput;
  location?: string;
  meetingUrl?: string;
  description?: string;

  /** Vínculo opcional com cliente cadastrado — validado se informado. */
  clientId?: string;
  /** Nome livre quando não há cliente. Ignorado se `clientId` vier preenchido. */
  clientName?: string;

  /**
   * Ignorado na criação, **obrigatório na edição** — validado no service do
   * backend, não por bean validation, porque o mesmo DTO serve os dois fluxos.
   */
  justification?: string;

  /**
   * Confirmação de ciência quando `startAt` está no passado. Sem isso o
   * backend rejeita com 422 `PAST_DATE_NOT_CONFIRMED`.
   */
  pastDateAcknowledged?: boolean;
}

/** GET /appointments — enums chegam como label PT-BR. */
export interface AppointmentResponse {
  id: string;
  title: string;
  type: AppointmentTypeLabel | string;
  startAt: string;
  endAt: string;
  modality?: AppointmentModalityLabel | string | null;
  location?: string | null;
  meetingUrl?: string | null;
  description?: string | null;
  status: AppointmentStatusLabel | string;
  cancellationReason?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  pastDateAuthorizedBy?: string | null;
  pastDateAuthorizedAt?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
  /**
   * Preenchido só na lixeira (`GET /appointments/deleted`). A agenda normal
   * nunca traz compromisso excluído.
   */
  deletedAt?: string | null;
}

/** GET /appointments/summary?year= — alimenta as abas de mês. */
export interface AppointmentSummary {
  year: number;
  /** 1-based: 1 = janeiro. O rótulo do mês é montado no frontend. */
  month: number;
  count: number;
}

/** GET /appointments/{id}/history. */
export interface AppointmentHistory {
  id: string;
  action: AppointmentAction | string;
  justification?: string | null;
  changedAt: string;
  changedByUserId?: string | null;
}

/** PATCH /appointments/{id}/cancel — justificativa obrigatória (`@NotBlank`). */
export interface AppointmentCancelRequest {
  justification: string;
}

/**
 * Query string de GET /appointments (todos opcionais).
 *
 * `year`/`month`/`type`/`status` viraram `List<...>` no backend
 * (`AppointmentSearchParams`): um valor único continua funcionando (o Spring
 * envolve num array de 1) e serializa igual antes (`?year=2026`); passar um
 * array manda o parâmetro repetido (`?year=2025&year=2026`), no mesmo padrão
 * de binding do resto do projeto — ver `paramsSerializer` em `axiosService`.
 */
export interface AppointmentListRequest {
  /** 1-based (padrão do projeto). */
  pageNumber?: number;
  pageSize?: number;
  year?: number | number[];
  /** 1-12; exige `year`. */
  month?: number | number[];
  type?: AppointmentTypeInput | AppointmentTypeInput[];
  status?: AppointmentStatusInput | AppointmentStatusInput[];
  clientId?: string;
  searchTerm?: string;
  /** ISO-8601 (data ou timestamp). */
  from?: string;
  to?: string;
}
