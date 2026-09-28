import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";

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
