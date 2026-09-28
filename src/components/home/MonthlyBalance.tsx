"use client";

import { formatBRLCompact } from "@/lib/format";
import React, { useMemo } from "react";
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Card, MonthPill, SectionTitle } from "./ui";

// Registro dos elementos usados pelo doughnut (tree-shaking do Chart.js v4).
ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * Paleta do gráfico — degradê do azul da marca até o azul claro.
 * Valores literais: o Chart.js desenha em canvas, onde `var(--…)` não resolve.
 */
export const BALANCE_PALETTE = [
  "#0F1A4A",
  "#2E3FA8",
  "#3B6FE0",
  "#7FB3F0",
  "#DDE5EC",
] as const;

export type BalanceSlice = {
  label: string;
  /** Percentual de 0 a 100. */
  percentage: number;
  /** Opcional — se omitido, usa a paleta padrão pela ordem. */
  color?: string;
};

export type MonthlyBalanceProps = {
  total: number;
  slices: BalanceSlice[];
  period?: string;
  onChangePeriod?: () => void;
  className?: string;
};

/** Balanço mensal — doughnut do Chart.js com total no centro. */
export default function MonthlyBalance({
  total,
  slices,
  period,
  onChangePeriod,
  className = "",
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

  const data = useMemo(
    () => ({
      labels: colored.map((s) => s.label),
      datasets: [
        {
          data: colored.map((s) => s.percentage),
          backgroundColor: colored.map((s) => s.color),
          borderWidth: 0,
          // Espessura do anel: quanto maior, mais fino o donut.
          cutout: "68%",
        },
      ],
    }),
    [colored],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      // A legenda é renderizada ao lado, em HTML (mais controle de estilo).
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: { label?: string; parsed: number }) =>
              ` ${ctx.label ?? ""}: ${ctx.parsed}%`,
          },
        },
      },
    }),
    [],
  );

  return (
    <Card className={className}>
      <header className="flex items-start justify-between gap-4">
        <SectionTitle>Balanço</SectionTitle>
        {period && <MonthPill label={period} onClick={onChangePeriod} />}
      </header>

      <div className="mt-6 flex items-center gap-6">
        <div className="relative h-36 w-36 shrink-0">
          <Doughnut data={data} options={options} />

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
    </Card>
  );
}
