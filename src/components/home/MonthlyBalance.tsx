"use client";

import { Skeleton } from "@heroui/react";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { formatBRLCompact } from "@/lib/format";
import { Card, SectionTitle } from "@/components/ui/layout/Card";
import { MonthPicker } from "@/components/ui/filters/MonthPicker";
import { currentMonth, formatMonthLabel, type MonthRef } from "@/lib/period";

const RING = <Skeleton className="h-36 w-36 shrink-0 rounded-full" />;

/** O anel traz o Chart.js: vem depois do cartão, com o skeleton no lugar. */
const BalanceDoughnut = dynamic(() => import("./BalanceDoughnut"), { ssr: false, loading: () => RING });

/**
 * Paleta do gráfico — degradê do azul da marca até o azul claro.
 * Valores literais: o Chart.js desenha em canvas, onde `var(--…)` não resolve.
 */
const BALANCE_PALETTE = [
  "#0F1A4A",
  "#2E3FA8",
  "#3B6FE0",
  "#7FB3F0",
  "#DDE5EC",
] as const;

type BalanceSlice = {
  label: string;
  /** Percentual de 0 a 100. */
  percentage: number;
  /** Opcional — se omitido, usa a paleta padrão pela ordem. */
  color?: string;
};

export type MonthlyBalanceProps = {
  total: number;
  slices: BalanceSlice[];
  /**
   * O mês dos números. Com `onMonthChange`, o cartão navega: quem consulta
   * troca o mês ali mesmo e a página relê o resumo (`GET /expenses/summary`
   * com o intervalo do mês novo).
   *
   * Sem ele o cartão não mostra navegação — é o caso dos Relatórios, onde o
   * mês é o da página inteira e um segundo controle diria o contrário.
   */
  month?: MonthRef;
  onMonthChange?: (month: MonthRef) => void;
  className?: string;
  /** Carregando: o anel e as fatias em skeleton, no mesmo lugar. */
  isLoading?: boolean;
};

/** Balanço mensal — doughnut com o total no centro e a legenda ao lado. */
export default function MonthlyBalance({
  total,
  slices,
  month,
  onMonthChange,
  className = "",
  isLoading = false,
}: MonthlyBalanceProps) {
  const colored = useMemo(
    () =>
      slices.map((slice, index) => ({
        ...slice,
        color:
          slice.color ?? BALANCE_PALETTE[index % BALANCE_PALETTE.length],
      })),
    [slices],
  );

  return (
    <Card className={className}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <SectionTitle>Balanço</SectionTitle>
        {month && onMonthChange && (
          /* Sem `maxMonth` futuro: despesa paga em mês que não chegou não
             existe, e deixar navegar para lá só renderiza vazio. */
          <MonthPicker
            value={month}
            onChange={onMonthChange}
            maxMonth={currentMonth()}
            compact
          />
        )}
      </header>

      {/*
        Sem fatias o Chart.js desenha um anel fantasma — um círculo cinza com
        "R$ 0,00" no meio, que lê como "o mês fechou zerado" quando na verdade
        é "não há dado". São afirmações diferentes, e num cartão de dinheiro a
        diferença importa.
      */}
      {isLoading ? (
        <div className="mt-6 flex items-center gap-6" aria-hidden="true">
          {RING}
          <ul className="flex flex-1 flex-col gap-2.5">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex items-center justify-between gap-4">
                <Skeleton className="h-3 w-28 rounded-md" />
                <Skeleton className="h-3 w-8 rounded-md" />
              </li>
            ))}
          </ul>
        </div>
      ) : colored.length === 0 ? (
        <p className="mt-6 text-sm text-gray-100/70">
          Sem despesas pagas para compor o balanço de{" "}
          {month ? formatMonthLabel(month).toLowerCase() : "deste mês"}.
        </p>
      ) : (
      <div className="mt-6 flex items-center gap-6">
        <div className="relative h-36 w-36 shrink-0">
          <BalanceDoughnut slices={colored} />

          {/* Total no centro do anel */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] text-gray-100/60">Total</span>
            <span className="text-sm font-semibold text-primary">
              {formatBRLCompact(total)}
            </span>
          </div>
        </div>

        <ul className="flex flex-1 flex-col gap-2.5">
          {colored.map((slice) => (
            <li
              key={slice.label}
              className="flex items-center justify-between gap-4 text-xs"
            >
              <span className="flex min-w-0 items-center gap-2">
                {/* Marcador quadrado, como no design */}
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate text-gray-100">{slice.label}</span>
              </span>
              <span className="shrink-0 font-medium text-primary">
                {slice.percentage}%
              </span>
            </li>
          ))}
        </ul>
      </div>
      )}
    </Card>
  );
}
