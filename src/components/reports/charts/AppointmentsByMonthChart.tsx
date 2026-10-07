"use client";

import { useMemo } from "react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { ChartCard } from "@/components/charts/ChartCard";
import {
  APPOINTMENT_STATUS_COLORS,
  BAR_SPEC,
  REPORT_BAR,
  baseBarOptions,
  barColors,
} from "@/components/charts/chartTheme";
import { formatMonthAxis } from "@/components/wallet/walletOverview";
import type { AppointmentTimelinePoint } from "@/interfaces/appointment/Appointment.interface";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

/**
 * Compromissos por mês, empilhados por status — de janeiro até o mês
 * escolhido.
 *
 * Vem de `GET /appointments/timeline`, que já devolve a quebra por status e
 * todos os meses da janela (zerados onde não houve nada). Uma chamada, sem
 * contar no navegador.
 *
 * ## Por que empilhado, e com os cancelados
 *
 * A pergunta é "quanto a agenda andou em cada mês e como terminou". A altura
 * da coluna é o total agendado no mês; a divisão mostra quanto foi feito,
 * quanto ainda está pendente e quanto caiu. Tirar os cancelados (o que o
 * `/summary` faz, para as abas) esconderia justamente o mês em que muita
 * perícia foi desmarcada.
 *
 * Concluído fica na base: é o que se lê contra o zero. Cancelado vai no topo,
 * onde não desloca as outras duas faixas.
 */

export type AppointmentsByMonthChartProps = {
  points: AppointmentTimelinePoint[];
  year: number;
  isLoading?: boolean;
};

const SERIES = [
  {
    label: "Concluído",
    color: APPOINTMENT_STATUS_COLORS.completed,
    value: (p: AppointmentTimelinePoint) => p.completedCount,
  },
  {
    label: "Agendado",
    color: APPOINTMENT_STATUS_COLORS.scheduled,
    value: (p: AppointmentTimelinePoint) => p.scheduledCount,
  },
  {
    label: "Cancelado",
    color: APPOINTMENT_STATUS_COLORS.cancelled,
    value: (p: AppointmentTimelinePoint) => p.cancelledCount,
  },
];

const LEGEND = SERIES.map(({ label, color }) => ({ label, color }));

const formatCount = (n: number) => String(Math.round(n));

export function AppointmentsByMonthChart({
  points,
  year,
  isLoading = false,
}: AppointmentsByMonthChartProps) {
  const total = points.reduce((sum, p) => sum + p.totalCount, 0);
  const cancelled = points.reduce((sum, p) => sum + p.cancelledCount, 0);

  const data = useMemo(
    () => ({
      labels: points.map((p) => formatMonthAxis(p.month)),
      datasets: SERIES.map((series) => ({
        label: series.label,
        data: points.map(series.value),
        ...barColors(series.color),
        ...BAR_SPEC,
        ...REPORT_BAR,
      })),
    }),
    [points],
  );

  const options = useMemo<ChartOptions<"bar">>(() => {
    // `baseBarOptions` monta um objeto novo a cada chamada: ajustar aqui não
    // vaza para os outros gráficos.
    const options = baseBarOptions({
      formatValue: formatCount,
      stacked: true,
      tooltipLabel: (n, label) => `${label}: ${n}`,
    });
    // O total do mês no rodapé do tooltip: é a altura da coluna, que nenhuma
    // faixa sozinha mostra.
    Object.assign(options.plugins?.tooltip?.callbacks ?? {}, {
      footer: (items: TooltipItem<"bar">[]) => {
        const point = points[items[0]?.dataIndex ?? -1];
        return point ? `Total: ${point.totalCount}` : "";
      },
    });
    // Contagem: sem degrau fracionário (0,5 compromisso).
    Object.assign(options.scales?.y?.ticks ?? {}, { precision: 0 });
    return options;
  }, [points]);

  const range =
    points.length > 0
      ? `${formatMonthAxis(points[0].month)} a ${formatMonthAxis(points[points.length - 1].month)}`
      : String(year);

  return (
    <ChartCard
      isLoading={isLoading}
      title={`Compromissos em ${year}`}
      subtitle={`${total} ${total === 1 ? "compromisso" : "compromissos"} de ${range}, ${cancelled} ${cancelled === 1 ? "cancelado" : "cancelados"}.`
      }
      legend={LEGEND}
      isEmpty={!isLoading && total === 0}
      emptyMessage="Nenhum compromisso neste período."
    >
      <Bar data={data} options={options} />
    </ChartCard>
  );
}
