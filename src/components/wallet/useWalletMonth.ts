"use client";

import { useState } from "react";
import { settledValue, useSettled } from "@/hooks/useSettled";
import { getOfficeExpenseSummary } from "@/services/officeExpenseService";
import { getOfficeRevenueSummary } from "@/services/officeRevenueService";
import type { FinanceSummary } from "@/interfaces/finance/Finance.interface";
import type { EntryKind } from "./entryForms";
import { buildMonthSummary } from "./summary/monthSummary";

/**
 * Os números do mês da Carteira: para cada lado, dois resumos.
 *
 * - **Por pagamento** (caixa): entradas, saídas e saldo — o mesmo recorte de
 *   data nos dois lados; misturar recortes é o que dá saldo falso.
 * - **Por vencimento** (o recorte das listas): previsto, atrasado e a contagem
 *   de cada aba (sem Cancelado). É ela que deixa a aba Entradas esperar o
 *   clique sem o número mentir.
 *
 * Cada lado relê só o seu (`reload(kind)`): gravar uma despesa não pede de
 * novo os resumos de receita. Uma metade que falha não esconde a outra.
 */
export type WalletLoadState = "loading" | "ready" | "partial" | "error";

const dueCount = (summary: FinanceSummary | null): number | null =>
  summary ? summary.overdueCount + summary.upcomingCount + summary.paidCount : null;

export function useWalletMonth(range: { from: string; to: string }, enabled: boolean) {
  const [versions, setVersions] = useState<Record<EntryKind, number>>({ entrada: 0, saida: 0 });
  const key = enabled ? `${range.from}:${range.to}` : null;
  const paid = { paidFrom: range.from, paidTo: range.to };
  const due = { dueFrom: range.from, dueTo: range.to };

  const revenue = useSettled(
    key,
    () => Promise.allSettled([getOfficeRevenueSummary(paid), getOfficeRevenueSummary(due)]),
    versions.entrada,
  );
  const expense = useSettled(
    key,
    () => Promise.allSettled([getOfficeExpenseSummary(paid), getOfficeExpenseSummary(due)]),
    versions.saida,
  );

  const paidRevenue = settledValue(revenue?.[0], null)?.data ?? null;
  const dueRevenue = settledValue(revenue?.[1], null)?.data ?? null;
  const paidExpense = settledValue(expense?.[0], null)?.data ?? null;
  const dueExpense = settledValue(expense?.[1], null)?.data ?? null;

  const state: WalletLoadState =
    !revenue || !expense
      ? "loading"
      : paidRevenue && paidExpense
        ? "ready"
        : paidRevenue || paidExpense
          ? "partial"
          : "error";

  return {
    state,
    summary: buildMonthSummary({ paidRevenue, paidExpense, dueRevenue, dueExpense }),
    /** `null` carregando; `undefined` quando o resumo não respondeu (sem selo, em vez de girar para sempre). */
    counts: {
      entrada: revenue ? (dueCount(dueRevenue) ?? undefined) : null,
      saida: expense ? (dueCount(dueExpense) ?? undefined) : null,
    } as Record<EntryKind, number | null | undefined>,
    reload: (kind: EntryKind) => setVersions((current) => ({ ...current, [kind]: current[kind] + 1 })),
  };
}
