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
import { REPORT_BAR, baseBarOptions } from "@/components/charts/chartTheme";
import { stageOpacity } from "../views/kit";
import type { SituationCount } from "../reportSeries";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

/**
 * Clientes por etapa — a Esteira da Home em forma de gráfico.
 *
 * A Esteira mostra **quem** está em cada etapa; aqui a pergunta é **onde o
 * volume se acumula**. Barra horizontal na ordem da esteira (de cima para
 * baixo), que lê como funil sem precisar de um plugin de funil: o Chart.js não
 * tem esse tipo, e trapézio distorce o comprimento, que é justamente o dado.
 *
 * ## Cor: a rampa do funil
 *
 * As etapas são ordinais, então a cor acompanha a posição na esteira e não
 * um "tipo": o azul da marca, do escuro (primeira etapa) ao claro (última),
 * a mesma rampa da visão Jornada do cliente (`stageOpacity` em
 * `models/kit.tsx`). Sem contorno, como lá. O nome da etapa está no eixo, ao
 * lado da barra, então não há legenda.
 *
 * RGB literal, não a classe do Tailwind: o Chart.js desenha em canvas. É o
 * `--color-primary` (#090D4C) — se o token mudar, muda aqui junto.
 */
const PRIMARY_RGB = "9, 13, 76";

const stageColor = (index: number, boost = 0) =>
  `rgba(${PRIMARY_RGB}, ${Math.min(1, stageOpacity(index) + boost)})`;

export type ClientsBySituationChartProps = {
  items: SituationCount[];
  isLoading?: boolean;
};

export function ClientsBySituationChart({
  items,
  isLoading = false,
}: ClientsBySituationChartProps) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  const data = useMemo(
    () => ({
      labels: items.map((item) => item.label),
      datasets: [
        {
          label: "Clientes",
          data: items.map((item) => item.count),
          backgroundColor: items.map((_, index) => stageColor(index)),
          // No hover a barra escurece um degrau, sem trocar de cor.
          hoverBackgroundColor: items.map((_, index) => stageColor(index, 0.15)),
          borderWidth: 0,
          ...REPORT_BAR,
          borderRadius: {
            topRight: 4,
            bottomRight: 4,
            topLeft: 0,
            bottomLeft: 0,
          },
          borderSkipped: "left" as const,
        },
      ],
    }),
    [items],
  );

  const options = useMemo(() => {
    const base = baseBarOptions({
      formatValue: (value) => String(Math.round(value)),
      tooltipLabel: (raw) => {
        const share = total ? Math.round((raw / total) * 100) : 0;
        return `${raw} ${raw === 1 ? "cliente" : "clientes"} (${share}%)`;
      },
    });
    return {
      ...base,
      indexAxis: "y" as const,
      scales: {
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
  }, [total]);

  return (
    <ChartCard
      isLoading={isLoading}
      title="Clientes por etapa"
      subtitle={`${total} ${total === 1 ? "cliente" : "clientes"} na esteira hoje.`
      }
      height={240}
      isEmpty={!isLoading && total === 0}
      emptyMessage="Nenhum cliente cadastrado."
    >
      <Bar data={data} options={options} />
    </ChartCard>
  );
}
