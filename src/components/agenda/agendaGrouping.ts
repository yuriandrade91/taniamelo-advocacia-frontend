import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";
import { AppointmentStatusLabelByKey } from "@/enums/appointment/Appointment";

/**
 * Agrupamento da agenda por dia.
 *
 * ## Por que aqui `new Date` é o certo, e em `formatDateBR` não era
 *
 * São tipos diferentes no backend. `dueDate` de um pagamento é `LocalDate` —
 * data sem hora e sem fuso — e por isso `formatDateBR` faz recorte de string:
 * interpretá-la como instante desloca o dia.
 *
 * `startAt` de um compromisso é `Instant`: um ponto no tempo, com fuso. "Que
 * dia é esse compromisso" só tem resposta **no fuso de quem olha** — uma
 * reunião às 22h de Brasília é 01h do dia seguinte em UTC, e para a secretária
 * ela é hoje à noite, não amanhã de madrugada. Então o agrupamento usa o
 * relógio local de propósito.
 */

export type AgendaDay = {
  /** `yyyy-MM-dd` no fuso local — é a chave do grupo. */
  date: string;
  items: AppointmentResponse[];
};

const pad = (value: number) => String(value).padStart(2, "0");

/** Dia local de um instante ISO, como `yyyy-MM-dd`. */
export function localDayOf(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `HH:mm` no fuso local. */
export function localTimeOf(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Agrupa por dia local, dias em ordem crescente e, dentro de cada dia, por
 * horário de início.
 *
 * Ordenar aqui e não confiar na ordem do backend é deliberado: a API ordena
 * por `startAt` asc, mas o agrupamento precisa da ordem de qualquer forma, e
 * uma lista que muda de ordem conforme o servidor é difícil de depurar.
 */
export function groupByDay(
  items: readonly AppointmentResponse[],
): AgendaDay[] {
  const byDay = new Map<string, AppointmentResponse[]>();

  for (const item of items) {
    const day = localDayOf(item.startAt);
    if (!day) continue; // instante inválido não vira grupo fantasma
    const bucket = byDay.get(day);
    if (bucket) bucket.push(item);
    else byDay.set(day, [item]);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayItems]) => ({
      date,
      items: [...dayItems].sort((a, b) => a.startAt.localeCompare(b.startAt)),
    }));
}

const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

/** "Quinta-feira, 12/03" — cabeçalho do grupo. */
export function formatDayHeader(day: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return day;
  const [, year, month, date] = match.map(Number);
  // Meio-dia UTC para o nome do dia da semana não escorregar por fuso.
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, date, 12)).getUTCDay()];
  return `${weekday}, ${pad(date)}/${pad(month)}`;
}

// ── Situação e tempo de um compromisso ──

export const isScheduled = (a: AppointmentResponse) => a.status === AppointmentStatusLabelByKey.AGENDADO;
export const isCancelled = (a: AppointmentResponse) => a.status === AppointmentStatusLabelByKey.CANCELADO;
export const isDone = (a: AppointmentResponse) => a.status === AppointmentStatusLabelByKey.CONCLUIDO;

const ms = (iso: string) => new Date(iso).getTime();

/** Agendado e com `now` dentro do horário — o "acontecendo agora". */
export const isOngoing = (a: AppointmentResponse, now: number) =>
  isScheduled(a) && ms(a.startAt) <= now && now < ms(a.endAt);

/** Minutos desde a meia-noite local. */
export function minutesOfDay(iso: string): number {
  const date = new Date(iso);
  return date.getHours() * 60 + date.getMinutes();
}

export const durationMinutes = (a: AppointmentResponse) =>
  Math.max(0, Math.round((ms(a.endAt) - ms(a.startAt)) / 60_000));

/** Minutos ocupados — cancelado não ocupa agenda. */
export const busyMinutes = (items: readonly AppointmentResponse[]) =>
  items.filter((a) => !isCancelled(a)).reduce((sum, a) => sum + durationMinutes(a), 0);

/** `45 min`, `2h`, `1h30`. */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${pad(m)}` : `${h}h`;
}

/** Expediente da régua do dia: 07h–20h. */
export const DAY_START = 7 * 60;
export const DAY_END = 20 * 60;

/**
 * Onde um compromisso cai na régua do expediente, em % da largura; `null`
 * quando fica todo fora dela. Cortado nas pontas.
 */
export function rulerSpan(a: AppointmentResponse): { left: number; width: number } | null {
  const begin = minutesOfDay(a.startAt);
  const start = Math.max(DAY_START, begin);
  const end = Math.min(DAY_END, begin + durationMinutes(a));
  if (end <= start) return null;
  const span = DAY_END - DAY_START;
  return { left: ((start - DAY_START) / span) * 100, width: ((end - start) / span) * 100 };
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Hoje, às 14h30", "Amanhã, às 09h00", "23/09, às 15h00" — no fuso de quem olha. */
export function formatWhen(startAt: string, now: Date = new Date()): string {
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return "-";
  const time = `${pad(start.getHours())}h${pad(start.getMinutes())}`;
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (sameDay(start, now)) return `Hoje, às ${time}`;
  if (sameDay(start, tomorrow)) return `Amanhã, às ${time}`;
  return `${pad(start.getDate())}/${pad(start.getMonth() + 1)}, às ${time}`;
}
