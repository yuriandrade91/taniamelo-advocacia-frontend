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
  BAR_SPEC,
  SINGLE_SERIES_COLOR,
  baseBarOptions,
} from "@/components/charts/chartTheme";
import { buildDailyCounts } from "./agendaSeries";
import type { MonthRef } from "@/lib/period";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

/**
 * Ocupação do mês: quantos compromissos em cada dia.
 *
 * **Uma série só, uma cor só.** Nada de pintar o dia mais cheio de outra cor:
 * a cor segue a entidade, nunca o posto dela — recolorir por ranking faz a
 * mesma barra mudar de cor quando outro dia a ultrapassa, e o leitor passa a
 * achar que a cor significa algo. O pico vai no subtítulo, em texto.
 *
 * Sem legenda: com uma série, o título já diz o que está plotado.
 *
 * A leitura acessível alternativa é a própria lista da página, logo abaixo —
 * é a "visão de tabela" que o gráfico dispensa de repetir.
 */

export type AgendaMonthChartProps = {
  items: AppointmentResponse[];
  month: MonthRef;
};

export function AgendaMonthChart({ items, month }: AgendaMonthChartProps) {
  const series = useMemo(() => buildDailyCounts(items, month), [items, month]);

  const busiestDay = useMemo(() => {
    if (series.peak === 0) return null;
    return series.counts.indexOf(series.peak) + 1;
  }, [series]);

  const data = useMemo(
    () => ({
      labels: series.labels,
      datasets: [
        {
          label: "Compromissos",
          data: series.counts,
          backgroundColor: SINGLE_SERIES_COLOR,
          ...BAR_SPEC,
        },
      ],
    }),
    [series],
  );

  const options = useMemo(
    () =>
      baseBarOptions({
        // Contagem inteira: sem casas decimais no eixo nem no tooltip.
        formatValue: (value) => String(Math.round(value)),
        tooltipLabel: (raw) =>
          `${raw} ${raw === 1 ? "compromisso" : "compromissos"}`,
      }),
    [],
  );

  return (
    <ChartCard
      title="Ocupação do mês"
      subtitle={
        busiestDay
          ? `Dia mais cheio: ${busiestDay}, com ${series.peak} ${series.peak === 1 ? "compromisso" : "compromissos"}.`
          : "Nenhum compromisso neste mês."
      }
      height={200}
      isEmpty={series.peak === 0}
      emptyMessage="Nenhum compromisso neste mês."
    >
      <Bar data={data} options={options} />
    </ChartCard>
  );
}
