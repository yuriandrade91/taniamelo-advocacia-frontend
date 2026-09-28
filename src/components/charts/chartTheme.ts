import type { ChartOptions, TooltipItem } from "chart.js";

/**
 * Tema compartilhado dos gráficos.
 *
 * ## A paleta foi validada, não escolhida no olho
 *
 * Rodei o validador de paleta (checagem de banda de luminosidade, piso de
 * croma, separação sob daltonismo simulado e contraste) e o resultado mudou a
 * escolha original:
 *
 * - **O ouro da marca (#B5843C) saiu dos gráficos.** Ao lado do vermelho da
 *   marca ele colapsa sob deuteranopia: ΔE 0,7 — literalmente a mesma cor para
 *   quem tem essa condição. Ouro continua em régua, título e selo; o que ele
 *   não pode é carregar **identidade de série** ao lado do vermelho.
 * - **O verde #2ECC71 saiu.** Contraste 2,05:1 sobre branco, abaixo do mínimo
 *   de 3:1 para marca. Trocado por #238C26, que o `StatusBadge` já usava para
 *   texto de sucesso.
 * - O azul entrou no lugar do ouro. Trio final passa em **todos os pares**:
 *   pior par ΔE 8,0 (protan) e 27,4 na visão normal.
 *
 * Cores literais, não `var(--…)`: o Chart.js desenha em canvas, onde a
 * variável CSS não resolve — a mesma razão anotada no `MonthlyBalance`.
 */

/** Superfície dos cards. Os separadores de 2px são desenhados com ela. */
export const CHART_SURFACE = "#ffffff";

/**
 * Paleta de estado dos recebimentos/despesas.
 * Validada em todos os pares sobre superfície branca.
 */
export const STATUS_COLORS = {
  overdue: "#F34649",
  upcoming: "#2a78d6",
  paid: "#238C26",
} as const;

/** Fluxo de caixa — dois valores de sinal oposto. Par validado (ΔE 8,0). */
export const FLOW_COLORS = {
  inflow: "#238C26",
  outflow: "#F34649",
} as const;

/** Série única: a cor da marca. Sem legenda — o título nomeia o que é. */
export const SINGLE_SERIES_COLOR = "#090D4C";

type AxisFormatter = (value: number) => string;

/** Tinta de texto e eixo. Texto nunca usa a cor da série. */
const INK_MUTED = "#5B5B5B";
const GRID = "#E7E8EC";

/**
 * Especificação de barra, fixa em todos os gráficos:
 * no máximo 24px, ponta de dado arredondada em 4px e base quadrada.
 */
export const BAR_SPEC = {
  maxBarThickness: 24,
  borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
  borderSkipped: "bottom" as const,
};

/**
 * Separador de 2px na cor da superfície entre segmentos que se tocam.
 * É espaço em branco separando, não contorno — contorno adiciona tinta que
 * não é dado.
 */
export const STACK_GAP = {
  borderColor: CHART_SURFACE,
  borderWidth: 2,
};

/**
 * Opções compartilhadas: eixo recessivo, sem legenda nativa (a legenda é HTML,
 * para o texto usar tinta de texto e não a cor da série) e tooltip formatado.
 */
export function baseBarOptions({
  formatValue,
  stacked = false,
  tooltipLabel,
}: {
  formatValue: AxisFormatter;
  stacked?: boolean;
  tooltipLabel?: (raw: number, seriesLabel: string) => string;
}): ChartOptions<"bar"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    // A camada de hover é padrão, não opcional: um gráfico em tela é
    // interativo, e o tooltip é o que substitui rotular todo ponto.
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#090D4C",
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (item: TooltipItem<"bar">) => {
            const value = item.parsed.y ?? 0;
            const label = item.dataset.label ?? "";
            return tooltipLabel
              ? tooltipLabel(value, label)
              : `${label}: ${formatValue(value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked,
        grid: { display: false },
        border: { display: false },
        ticks: { color: INK_MUTED, font: { size: 11 } },
      },
      y: {
        stacked,
        beginAtZero: true,
        // Grade hairline sólida, um passo fora da superfície: recessiva.
        grid: { color: GRID, lineWidth: 1 },
        border: { display: false },
        ticks: {
          color: INK_MUTED,
          font: { size: 11 },
          maxTicksLimit: 5,
          callback: (value: string | number) => formatValue(Number(value)),
        },
      },
    },
  };
}

/**
 * Especificação de linha: 2px, junta e ponta arredondadas, marcador de raio 4
 * (8px de diâmetro) com anel de 2px na cor da superfície — o anel mantém o
 * ponto legível onde ele cruza a linha, e faz parte do alvo de hover.
 */
export const LINE_SPEC = {
  borderWidth: 2,
  borderCapStyle: "round" as const,
  borderJoinStyle: "round" as const,
  pointRadius: 4,
  pointHoverRadius: 6,
  pointBorderColor: CHART_SURFACE,
  pointBorderWidth: 2,
  tension: 0.3,
};

/** Preenchimento de área: lavagem a ~10%, nunca bloco saturado. */
export const areaFill = (hex: string) => `${hex}1A`;

export function baseLineOptions({
  formatValue,
  tooltipLabel,
}: {
  formatValue: AxisFormatter;
  tooltipLabel?: (raw: number, seriesLabel: string) => string;
}): ChartOptions<"line"> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#090D4C",
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (item: TooltipItem<"line">) => {
            const value = item.parsed.y ?? 0;
            const label = item.dataset.label ?? "";
            return tooltipLabel
              ? tooltipLabel(value, label)
              : `${label}: ${formatValue(value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: INK_MUTED, font: { size: 11 } },
      },
      y: {
        grid: { color: GRID, lineWidth: 1 },
        border: { display: false },
        ticks: {
          color: INK_MUTED,
          font: { size: 11 },
          maxTicksLimit: 5,
          callback: (value: string | number) => formatValue(Number(value)),
        },
      },
    },
  };
}
