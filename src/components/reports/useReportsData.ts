"use client";

import { useMemo, useState } from "react";
import { settledValue, useSettled } from "@/hooks/useSettled";
import { SITUATION_ENTRIES } from "@/enums/situation/Situation";
import { createRequestCache } from "@/lib/requestCache";
import { monthRange, shiftMonth, type MonthRef } from "@/lib/period";
import { clients as fetchClients } from "@/services/clientService";
import { getAppointmentTimeline } from "@/services/appointmentService";
import { getOfficePaymentTimeline } from "@/services/officePaymentService";
import { getOfficeExpenseSummary, getOfficeExpenseTimeline } from "@/services/officeExpenseService";
import { getOfficeRevenueTimeline } from "@/services/officeRevenueService";
import type { ClientListRequest } from "@/interfaces/client/Client.interface";
import {
  buildFlowTimeline,
  formatMonthAxis,
  toBalanceSlices,
  toCumulativeBalance,
} from "@/components/wallet/walletOverview";
import {
  createdRange,
  stateOf,
  worstOf,
  lastMonths,
  monthKey,
  toSituationCounts,
  withMovingAverage,
} from "./reportSeries";
import type { ReportViewProps, ReportsLoadState } from "./views/types";

/**
 * Os dados de Relatórios: cada série carrega por conta própria (`allSettled`),
 * e uma falha de despesas não esconde o gráfico que respondeu.
 *
 * Sem requisição repetida:
 * - **Clientes por etapa** é a foto de hoje — não depende do mês: sai uma vez.
 * - **Cadastros por mês** são contagens por mês e tipo, guardadas por chave:
 *   andar um mês no seletor pede só o mês novo (os outros 7 já vieram).
 * - **Financeiro** só sai para quem pode vê-lo (D3), quando a permissão é
 *   conhecida — sem 403 para tratar e sem vazar valor.
 *
 * Não há rota de agregação de clientes: cada contagem é uma página de 1
 * lendo `totalRecords`.
 */

const INTAKE_VISIBLE = 6;
const INTAKE_AVERAGE = 3;

const valueOr = settledValue;

export function useReportsData(month: MonthRef, canSeeFinance: boolean) {
  /** Contagens de clientes por filtro, enquanto a página estiver aberta. */
  const [counts] = useState(() => createRequestCache<number>(200));
  const count = (key: string, params: ClientListRequest) =>
    counts.load(key, () =>
      fetchClients({ ...params, pageNumber: 1, pageSize: 1 }).then((e) => e?.pagination?.totalRecords ?? 0),
    );

  /** 8 meses para mostrar 6: os dois primeiros só alimentam a média móvel de 3. */
  const intakeMonths = useMemo(() => lastMonths(month, INTAKE_VISIBLE + INTAKE_AVERAGE - 1), [month]);
  const window6 = useMemo(
    () => ({ from: monthRange(shiftMonth(month, -5)).from, to: monthRange(month).to }),
    [month],
  );
  /** A agenda olha o ano até o mês escolhido: "como o ano andou". */
  const agendaWindow = useMemo(
    () => ({ from: monthRange({ year: month.year, month: 1 }).from, to: monthRange(month).to }),
    [month],
  );

  const situationResults = useSettled("situations", () =>
    Promise.allSettled(SITUATION_ENTRIES.map(([key]) => count(`situation:${key}`, { situation: [key] }))),
  );
  const intakeResults = useSettled(intakeMonths.map(monthKey).join(), () =>
    Promise.allSettled(
      intakeMonths.flatMap((m) => [
        count(`intake:${monthKey(m)}:V`, { ...createdRange(m), clientType: ["VERIFICADO"] }),
        count(`intake:${monthKey(m)}:P`, { ...createdRange(m), clientType: ["POTENCIAL"] }),
      ]),
    ),
  );
  const agendaResults = useSettled(`${agendaWindow.from}:${agendaWindow.to}`, () =>
    Promise.allSettled([getAppointmentTimeline(agendaWindow)]),
  );
  /** Uma carga por série do financeiro; `null` na chave = sem permissão, nada sai. */
  const financeKey = canSeeFinance ? `${window6.from}:${window6.to}` : null;
  const paymentSeries = useSettled(financeKey, () =>
    Promise.allSettled([getOfficePaymentTimeline({ ...window6, basis: "due" })]),
  );
  // Carteira em regime de caixa, como o resumo de lá.
  const revenueSeries = useSettled(financeKey, () =>
    Promise.allSettled([getOfficeRevenueTimeline({ ...window6, basis: "paid" })]),
  );
  const expenseSeries = useSettled(financeKey, () =>
    Promise.allSettled([getOfficeExpenseTimeline({ ...window6, basis: "paid" })]),
  );
  /*
    A rosca usa a mesma janela de 6 meses: recortada no mês, ficava vazia todo
    início de mês ao lado de gráficos cheios — e parecia quebrada.
  */
  const expenseSummary = useSettled(financeKey, () =>
    Promise.allSettled([getOfficeExpenseSummary({ paidFrom: window6.from, paidTo: window6.to })]),
  );
  const finance: (readonly PromiseSettledResult<unknown>[] | null)[] = [
    paymentSeries,
    revenueSeries,
    expenseSeries,
    expenseSummary,
  ];

  const operation = situationResults && intakeResults && agendaResults
    ? [...situationResults, ...intakeResults, ...agendaResults]
    : null;
  const operationState: ReportsLoadState = operation ? stateOf(operation) : "loading";
  const financeState: ReportsLoadState = !canSeeFinance
    ? "ready"
    : finance.every(Boolean)
      ? stateOf(finance.flatMap((results) => results ?? []))
      : "loading";

  const situations = toSituationCounts(
    Object.fromEntries(SITUATION_ENTRIES.map(([key], i) => [key, valueOr(situationResults?.[i], 0)])),
  );
  const intake = withMovingAverage(
    intakeMonths.map((m, i) => ({
      month: monthKey(m),
      verified: valueOr(intakeResults?.[i * 2], 0),
      potential: valueOr(intakeResults?.[i * 2 + 1], 0),
    })),
    INTAKE_VISIBLE,
    INTAKE_AVERAGE,
  );

  const flow = buildFlowTimeline(
    valueOr(revenueSeries?.[0], null)?.data ?? [],
    valueOr(expenseSeries?.[0], null)?.data ?? [],
  );
  const expenses = valueOr(expenseSummary?.[0], null)?.data ?? null;

  const props: Omit<ReportViewProps, "month"> = {
    windowLabel: `${formatMonthAxis(monthKey(shiftMonth(month, -5)))} – ${formatMonthAxis(monthKey(month))}`,
    canSeeFinance,
    state: worstOf(operationState, financeState),
    isLoading: operationState === "loading",
    isFinanceLoading: canSeeFinance && financeState === "loading",
    payments: valueOr(paymentSeries?.[0], null)?.data ?? [],
    flow,
    cumulative: toCumulativeBalance(flow),
    expenses,
    expenseSlices: toBalanceSlices(expenses?.byCategory ?? []),
    situations,
    intake,
    agenda: valueOr(agendaResults?.[0], null)?.data ?? [],
  };
  return props;
}
