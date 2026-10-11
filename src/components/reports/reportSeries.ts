/** Estado de uma carga em várias séries. */
export type LoadState = "loading" | "ready" | "partial" | "error";

import {
  SITUATION_ENTRIES,
  type SituationKey,
} from "@/enums/situation/Situation";
import { monthRange, shiftMonth, type MonthRef } from "@/lib/period";

/**
 * Séries dos relatórios que nascem de cartões da Home.
 *
 * ## Contagem por `totalRecords`, não por lista
 *
 * Não há endpoint de métricas de cliente. O que existe é `GET /clients` com
 * filtro e paginação — e o `pagination.totalRecords` de uma página de tamanho
 * 1 é a contagem exata do filtro. É o mesmo truque do contador de formulários
 * pendentes da Home.
 *
 * Contar no navegador a partir da lista (o que a Esteira faz com 50 clientes)
 * erraria em silêncio assim que o escritório passasse de 50.
 */

/** Chave `YYYY-MM`, a mesma que as séries financeiras usam no eixo. */
export const monthKey = ({ year, month }: MonthRef): string =>
  `${year}-${String(month).padStart(2, "0")}`;

/** Os `count` meses que terminam em `end`, do mais antigo ao mais recente. */
export function lastMonths(end: MonthRef, count: number): MonthRef[] {
  return Array.from({ length: count }, (_, i) =>
    shiftMonth(end, i - (count - 1)),
  );
}

/** Intervalo de criação de um mês, no formato que `createdFrom/To` aceita. */
export const createdRange = (month: MonthRef) => {
  const { from, to } = monthRange(month);
  return { createdFrom: from, createdTo: to };
};

export type SituationCount = {
  key: SituationKey;
  label: string;
  count: number;
};

/**
 * Contagens na ordem do enum — que é a ordem da esteira. Situação é etapa,
 * não categoria solta: reordenar por tamanho apagaria o funil.
 */
export function toSituationCounts(
  counts: Partial<Record<SituationKey, number>>,
): SituationCount[] {
  return SITUATION_ENTRIES.map(([key, label]) => ({
    key,
    label,
    count: counts[key] ?? 0,
  }));
}

type IntakePoint = {
  month: string;
  verified: number;
  potential: number;
};

export type IntakeTrendPoint = IntakePoint & { average: number };

/**
 * Média móvel do total de cadastros (verificado + potencial), devolvendo só os
 * últimos `visible` meses.
 *
 * Recebe `visible + window - 1` meses de propósito: os meses anteriores à
 * janela visível servem só de base para a média. Sem eles, os dois primeiros
 * pontos seriam média de 1 e 2 meses — uma linha que parte "torta" por falta
 * de dado, não por movimento.
 */
export function withMovingAverage(
  points: readonly IntakePoint[],
  visible: number,
  window = 3,
): IntakeTrendPoint[] {
  const totals = points.map((p) => p.verified + p.potential);
  return points
    .map((point, i) => {
      const slice = totals.slice(Math.max(0, i - window + 1), i + 1);
      const average = slice.reduce((sum, n) => sum + n, 0) / slice.length;
      return { ...point, average: Math.round(average * 10) / 10 };
    })
    .slice(-visible);
}

/** "ready" sem falhas, "error" se tudo falhou, "partial" no meio. */
export function stateOf(results: readonly PromiseSettledResult<unknown>[]): LoadState {
  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed === 0) return "ready";
  return failed === results.length ? "error" : "partial";
}

/** O pior de dois blocos: "error" só quando os dois falharam; um só já é "partial". */
export function worstOf(a: LoadState, b: LoadState): LoadState {
  if (a === "error" && b === "error") return "error";
  if (a === "error" || b === "error" || a === "partial" || b === "partial") return "partial";
  return a === "loading" || b === "loading" ? "loading" : "ready";
}
