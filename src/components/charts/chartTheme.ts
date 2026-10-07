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

/**
 * Status dos compromissos — o mesmo trio validado do `STATUS_COLORS`, com o
 * mesmo sentido: verde é o que terminou bem, azul o que ainda vem, vermelho o
 * que caiu.
 */
export const APPOINTMENT_STATUS_COLORS = {
  completed: STATUS_COLORS.paid,
  scheduled: STATUS_COLORS.upcoming,
  cancelled: STATUS_COLORS.overdue,
} as const;

/** Fluxo de caixa — dois valores de sinal oposto. Par validado (ΔE 8,0). */
export const FLOW_COLORS = {
  inflow: "#238C26",
  outflow: "#F34649",
} as const;

/**
 * Tipo de cliente — duas categorias nominais.
 *
 * Validado (light): pior par ΔE 27,5 sob protanopia, ambos acima de 3:1. O
 * ouro da marca volta aqui porque o problema dele era o **vermelho** ao lado
 * (ΔE 0,7 sob deuteranopia), e este par não tem vermelho.
 */
export const CLIENT_TYPE_COLORS = {
  verified: "#3B6FE0",
  potential: "#B5843C",
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
 * Barras dos Relatórios — mais grossas que o `BAR_SPEC` padrão.
 *
 * Lá os gráficos dividem a tela com poucos pontos (6 meses, 6 etapas) e a
 * barra de 24px sobrava solta no meio de uma faixa larga. Só subir o teto não
 * resolve: o Chart.js usa 80% da faixa da categoria e 90% disso para a barra,
 * e no gráfico deitado (6 etapas em 240px) ela nunca passaria dos ~24px.
 * Por isso a fração da faixa sobe junto.
 *
 * Espalhar **depois** do `BAR_SPEC`, que traz o teto de 24px. A Agenda segue
 * no padrão: é outra tela, com 30 dias no eixo.
 */
export const REPORT_BAR = {
  maxBarThickness: 44,
  categoryPercentage: 0.85,
  barPercentage: 0.95,
};

/**
 * Cores de uma barra: preenchimento a 50% e contorno sólido de 2px na cor
 * cheia da série — o padrão do exemplo de border-radius do Chart.js.
 *
 * ## Por que o contorno, e não só a opacidade
 *
 * Rodei o validador de paleta com as cores já misturadas ao branco a 70%, e
 * mesmo ali a opacidade sozinha reprovava — a 50% o miolo fica ainda mais
 * claro, então a borda é obrigatória:
 *
 * - **Contraste**: todas caem abaixo de 3:1 sobre o card (a pior, 2,16:1).
 * - **Daltonismo**: entradas × saídas (verde × vermelho) colapsam para ΔE 5,4
 *   sob deuteranopia, abaixo do piso de 8.
 *
 * O contorno devolve a cor cheia — a mesma que passou na validação — à borda
 * de cada barra, e é ela que carrega identidade e contraste. O miolo claro é
 * o gosto; a borda é o que mantém o gráfico legível.
 *
 * Nas barras empilhadas, o contorno também faz o papel do antigo separador
 * branco de 2px: cada segmento termina numa borda da própria cor.
 *
 * No hover a barra fica cheia: é o retorno de "esta é a que você apontou".
 */
export const BAR_FILL_ALPHA = "80"; // 0x80 / 0xFF ≈ 50%

export const barColors = (hex: string) => ({
  backgroundColor: `${hex}${BAR_FILL_ALPHA}`,
  hoverBackgroundColor: hex,
  borderColor: hex,
  borderWidth: 2,
});

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
            // Barra deitada (`indexAxis: "y"`) guarda o valor em `x`; em `y`
            // fica o índice da categoria, e o tooltip mostrava 0, 1, 2…
            const value =
              (item.chart.options.indexAxis === "y"
                ? item.parsed.x
                : item.parsed.y) ?? 0;
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
