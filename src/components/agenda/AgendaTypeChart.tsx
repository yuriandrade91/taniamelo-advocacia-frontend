"use client";

import { useMemo } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { ChartCard } from "@/components/charts/ChartCard";
import {
  SINGLE_SERIES_COLOR,
  baseBarOptions,
} from "@/components/charts/chartTheme";
import { buildTypeBreakdown } from "./agendaSeries";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

/**
 * Compromissos por tipo — barra **horizontal**.
 *
 * Horizontal e não rosca: com seis categorias, comparar comprimentos é fácil e
 * comparar ângulos é adivinhação. A rosca só funciona com poucas fatias e
 * quando a pergunta é "que fração do todo" — aqui a pergunta é "qual tipo
 * aparece mais".
 *
 * **Uma cor só para todas as barras.** Os tipos são categorias nominais:
 * trocar a ordem não muda o significado. Pintar cada uma de um jeito gastaria
 * o canal de identidade reencodando o que o comprimento já diz — e obrigaria
 * uma legenda para explicar uma cor que não significa nada.
 */

export type AgendaTypeChartProps = { items: AppointmentResponse[] };

export function AgendaTypeChart({ items }: AgendaTypeChartProps) {
  const breakdown = useMemo(() => buildTypeBreakdown(items), [items]);

  const data = useMemo(
    () => ({
      labels: breakdown.labels,
      datasets: [
        {
          label: "Compromissos",
          data: breakdown.counts,
          backgroundColor: SINGLE_SERIES_COLOR,
          maxBarThickness: 24,
          // Barra horizontal: a ponta de dado é a da direita.
          borderRadius: { topRight: 4, bottomRight: 4, topLeft: 0, bottomLeft: 0 },
          borderSkipped: "left" as const,
        },
      ],
    }),
    [breakdown],
  );

  const options = useMemo(() => {
    const base = baseBarOptions({
      formatValue: (value) => String(Math.round(value)),
      tooltipLabel: (raw) =>
        `${raw} ${raw === 1 ? "compromisso" : "compromissos"}`,
    });
    return {
      ...base,
      indexAxis: "y" as const,
      scales: {
        // Deitado, os papéis dos eixos trocam: a contagem vai no x.
        x: {
          beginAtZero: true,
          grid: { color: "#E7E8EC", lineWidth: 1 },
          border: { display: false },
          ticks: {
            color: "#5B5B5B",
            font: { size: 11 },
            maxTicksLimit: 5,
            precision: 0,
          },
        },
        y: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: "#5B5B5B", font: { size: 11 } },
        },
      },
    };
  }, []);

  return (
    <ChartCard
      title="Compromissos por tipo"
      subtitle="Distribuição do mês."
      height={200}
      isEmpty={breakdown.labels.length === 0}
      emptyMessage="Nenhum compromisso neste mês."
    >
      <Bar data={data} options={options} />
    </ChartCard>
  );
}
