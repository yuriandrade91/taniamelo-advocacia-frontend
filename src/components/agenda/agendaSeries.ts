import type { MonthRef } from "@/lib/period";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";
import { localDayOf } from "./agendaGrouping";

/**
 * Compromissos por dia do mês — a série do gráfico da agenda.
 *
 * **Todos os dias do mês entram, inclusive os vazios.** Um gráfico que só
 * mostra os dias com compromisso mente sobre a ocupação: dez barras coladas
 * parecem um mês cheio quando podem ser dez dias espalhados em trinta. O
 * espaço vazio é o dado.
 */

export type DailySeries = {
  /** Rótulo do eixo: o número do dia. */
  labels: string[];
  counts: number[];
  /** Maior contagem — usada para destacar o dia mais cheio. */
  peak: number;
};

export function buildDailyCounts(
  items: readonly AppointmentResponse[],
  { year, month }: MonthRef,
): DailySeries {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const counts = new Array<number>(daysInMonth).fill(0);
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;

  for (const item of items) {
    const day = localDayOf(item.startAt);
    // Ignora o que não é deste mês: a lista pode trazer borda de outro mês
    // conforme o fuso, e um compromisso do dia 1º às 00h30 não pode virar
    // barra do dia 31 do mês anterior.
    if (!day.startsWith(prefix)) continue;
    const index = Number(day.slice(-2)) - 1;
    if (index >= 0 && index < daysInMonth) counts[index] += 1;
  }

  return {
    labels: counts.map((_, index) => String(index + 1)),
    counts,
    peak: counts.reduce((max, value) => (value > max ? value : max), 0),
  };
}

/**
 * Compromissos por tipo — composição do mês.
 *
 * Categorias **nominais** (Entrevista, Reunião, Perícia…): trocar a ordem não
 * muda o significado. Por isso viram uma série só, todas na mesma cor, ordenada
 * por volume — colorir cada barra de um jeito gastaria o canal de identidade
 * para reencodar o que o comprimento da barra já mostra.
 */
export type TypeBreakdown = { labels: string[]; counts: number[] };

export function buildTypeBreakdown(
  items: readonly AppointmentResponse[],
): TypeBreakdown {
  const byType = new Map<string, number>();

  for (const item of items) {
    const type = String(item.type ?? "").trim() || "Sem tipo";
    byType.set(type, (byType.get(type) ?? 0) + 1);
  }

  const sorted = [...byType.entries()].sort((a, b) => b[1] - a[1]);
  return {
    labels: sorted.map(([label]) => label),
    counts: sorted.map(([, count]) => count),
  };
}
