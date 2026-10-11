"use client";

import type { ReactNode } from "react";

/**
 * Gráficos em SVG e CSS, feitos aqui, sem biblioteca — os das visões de
 * Relatórios (o Chart.js fica para os gráficos de `reports/charts`).
 *
 * ## Por que sem lib
 *
 * O Chart.js desenha em canvas: `var(--color-primary)` não resolve lá dentro
 * (por isso existe a `BALANCE_PALETTE` com cores literais), o texto não herda
 * a fonte da página e nada responde a uma classe do Tailwind. Para visões que
 * mudam o desenho inteiro, isso amarra demais.
 *
 * SVG inline e barras em CSS resolvem as três coisas: as cores saem dos tokens
 * da marca, o texto é HTML de verdade (Jost, acessível, selecionável) e o
 * tamanho acompanha o container sem `resize` manual. São primitivas pequenas
 * — linha, área, barras, rosca, anel, medidor — o bastante para as visões, e
 * nenhuma dependência nova no `package.json`.
 */

export type Tone =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "previsto"
  | "gray"
  | "sky"
  | "violet"
  | "white";

/** Cor para atributos SVG (`fill`, `stroke`). */
export const TONE: Record<Tone, string> = {
  primary: "var(--color-primary)",
  secondary: "var(--color-secondary)",
  success: "var(--color-success)",
  danger: "var(--color-danger)",
  previsto: "var(--color-previsto)",
  gray: "var(--color-gray-100)",
  sky: "#0ea5e9",
  violet: "#8b5cf6",
  white: "#ffffff",
};

/** Classes literais — o Tailwind só gera o que encontra escrito. */
export const TONE_BG: Record<Tone, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  success: "bg-success",
  danger: "bg-danger",
  previsto: "bg-previsto",
  gray: "bg-gray-100",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  white: "bg-white",
};

/** Paleta em rodízio para séries sem cor própria (categorias, situações). */
const SERIES_TONES: readonly Tone[] = [
  "primary",
  "secondary",
  "sky",
  "violet",
  "success",
  "danger",
  "previsto",
  "gray",
];

const toneAt = (index: number): Tone =>
  SERIES_TONES[index % SERIES_TONES.length];

/** Variação percentual de `previous` para `current`; `null` sem base. */
export function deltaPercent(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

/** Selo de variação: verde para cima, vermelho para baixo (ou o inverso). */
export function DeltaChip({
  value,
  invert = false,
  className = "",
}: {
  value: number | null;
  /** Para despesa, subir é ruim. */
  invert?: boolean;
  className?: string;
}) {
  if (value === null) return null;
  const good = invert ? value <= 0 : value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${
        good ? "bg-success/15 text-emerald-700" : "bg-danger/10 text-danger"
      } ${className}`}
    >
      {value >= 0 ? "▲" : "▼"} {Math.abs(value)}%
    </span>
  );
}

// ── Linha e área ──

type Series = {
  label: string;
  values: readonly number[];
  tone: Tone;
  dashed?: boolean;
};

function linePath(values: readonly number[], max: number, min: number, w: number, h: number) {
  const span = max - min || 1;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = values.length > 1 ? i * step : w / 2;
      const y = h - ((v - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

/** Linha mínima, sem eixo — para cartões e cabeçalhos. */
export function Sparkline({
  values,
  tone = "primary",
  height = 40,
  area = true,
  className = "",
}: {
  values: readonly number[];
  tone?: Tone;
  height?: number;
  area?: boolean;
  className?: string;
}) {
  if (values.length === 0) return <div style={{ height }} className={className} />;
  const w = 100;
  const max = Math.max(...values);
  const min = Math.min(0, ...values);
  const d = linePath(values, max, min, w, height);
  const id = `spark-${tone}-${values.length}-${Math.round(max)}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={TONE[tone]} stopOpacity="0.35" />
          <stop offset="100%" stopColor={TONE[tone]} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={`${d} L${w},${height} L0,${height} Z`} fill={`url(#${id})`} />}
      <path
        d={d}
        fill="none"
        stroke={TONE[tone]}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Linhas (ou áreas) com rótulos no eixo X e grade horizontal.
 *
 * Os rótulos são HTML embaixo do SVG, e não `<text>`: com
 * `preserveAspectRatio="none"` o texto esticaria junto com o gráfico.
 */
export function LineChart({
  labels,
  series,
  height = 200,
  area = false,
  format = (v: number) => String(v),
  className = "",
  dark = false,
}: {
  labels: readonly string[];
  series: readonly Series[];
  height?: number;
  area?: boolean;
  format?: (value: number) => string;
  className?: string;
  /** Sobre fundo escuro: grade e rótulos claros. */
  dark?: boolean;
}) {
  const all = series.flatMap((s) => s.values);
  const max = Math.max(1, ...all);
  const min = Math.min(0, ...all);
  const w = 100;
  const grid = [0, 0.25, 0.5, 0.75, 1];
  const labelClass = dark ? "text-white/60" : "text-gray-100/70";
  return (
    <div className={className}>
      <div className="relative" style={{ height }}>
        <svg
          viewBox={`0 0 ${w} ${height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          {grid.map((g) => (
            <line
              key={g}
              x1={0}
              x2={w}
              y1={height - g * height}
              y2={height - g * height}
              stroke={dark ? "rgba(255,255,255,0.12)" : "rgba(9,13,76,0.07)"}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {series.map((s, i) => {
            const d = linePath(s.values, max, min, w, height);
            const gid = `line-${i}-${s.tone}-${s.values.length}`;
            return (
              <g key={s.label}>
                {area && (
                  <>
                    <defs>
                      <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={TONE[s.tone]} stopOpacity="0.28" />
                        <stop offset="100%" stopColor={TONE[s.tone]} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={`${d} L${w},${height} L0,${height} Z`} fill={`url(#${gid})`} />
                  </>
                )}
                <path
                  d={d}
                  fill="none"
                  stroke={TONE[s.tone]}
                  strokeWidth={2.25}
                  strokeDasharray={s.dashed ? "5 5" : undefined}
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
        </svg>
        <span className={`absolute -top-1 left-0 text-[10px] tabular-nums ${labelClass}`}>
          {format(max)}
        </span>
      </div>
      <div className={`mt-2 flex justify-between text-[10px] ${labelClass}`}>
        {labels.map((l, i) => (
          <span key={`${l}-${i}`} className="min-w-0 truncate">
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Barras ──

/**
 * Colunas por rótulo — agrupadas ou empilhadas. CSS puro (flex + altura em
 * %), com `title` em cada barra para o valor aparecer ao passar o mouse.
 */
export function BarChart({
  labels,
  series,
  height = 180,
  stacked = false,
  format = (v: number) => String(v),
  className = "",
  dark = false,
}: {
  labels: readonly string[];
  series: readonly Series[];
  height?: number;
  stacked?: boolean;
  format?: (value: number) => string;
  className?: string;
  dark?: boolean;
}) {
  const totals = labels.map((_, i) =>
    series.reduce((sum, s) => sum + Math.max(0, s.values[i] ?? 0), 0),
  );
  const max = Math.max(
    1,
    ...(stacked ? totals : series.flatMap((s) => s.values.map((v) => Math.max(0, v)))),
  );
  const labelClass = dark ? "text-white/60" : "text-gray-100/70";
  return (
    <div className={className}>
      <div className="flex items-end gap-2" style={{ height }}>
        {labels.map((label, i) => (
          <div key={`${label}-${i}`} className="flex h-full min-w-0 flex-1 items-end justify-center gap-1">
            {stacked ? (
              <div className="flex h-full w-full max-w-10 flex-col-reverse overflow-hidden rounded-lg">
                {series.map((s) => {
                  const v = Math.max(0, s.values[i] ?? 0);
                  return (
                    <div
                      key={s.label}
                      title={`${s.label}: ${format(v)}`}
                      className={`${TONE_BG[s.tone]} transition-all duration-500`}
                      style={{ height: `${(v / max) * 100}%` }}
                    />
                  );
                })}
              </div>
            ) : (
              series.map((s) => {
                const v = Math.max(0, s.values[i] ?? 0);
                return (
                  <div
                    key={s.label}
                    title={`${s.label} · ${label}: ${format(v)}`}
                    className={`w-full max-w-5 rounded-t-md ${TONE_BG[s.tone]} transition-all duration-500`}
                    style={{ height: `${Math.max(v > 0 ? 2 : 0, (v / max) * 100)}%` }}
                  />
                );
              })
            )}
          </div>
        ))}
      </div>
      <div className={`mt-2 flex gap-2 text-[10px] ${labelClass}`}>
        {labels.map((l, i) => (
          <span key={`${l}-${i}`} className="min-w-0 flex-1 truncate text-center">
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Ranking em barras horizontais, com rótulo e valor em cada linha. */
export function HBarList({
  items,
  format = (v: number) => String(v),
  className = "",
  dark = false,
}: {
  items: readonly { label: string; value: number; tone?: Tone }[];
  format?: (value: number) => string;
  className?: string;
  dark?: boolean;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={`flex flex-col gap-3 ${className}`}>
      {items.map((item, index) => (
        <li key={item.label}>
          <div className={`mb-1 flex items-baseline justify-between gap-3 text-xs ${dark ? "text-white/80" : "text-gray-100"}`}>
            <span className="truncate">{item.label}</span>
            <span className={`font-medium tabular-nums ${dark ? "text-white" : "text-primary"}`}>
              {format(item.value)}
            </span>
          </div>
          <div className={`h-2 overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-light-gray/60"}`}>
            <div
              className={`h-full rounded-full ${TONE_BG[item.tone ?? toneAt(index)]} transition-all duration-700`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Rosca, anel e medidores ──

type Slice = { label: string; value: number; tone: Tone };

/** Rosca em SVG (`stroke-dasharray`), com o miolo livre para um número. */
export function Donut({
  slices,
  size = 160,
  thickness = 18,
  children,
  className = "",
  track = "rgba(9,13,76,0.06)",
}: {
  slices: readonly Slice[];
  size?: number;
  thickness?: number;
  children?: ReactNode;
  className?: string;
  track?: string;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0);
  let offset = 0;
  return (
    <div className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={thickness} />
        {total > 0 &&
          slices.map((s) => {
            const len = (Math.max(0, s.value) / total) * c;
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={TONE[s.tone]}
                strokeWidth={thickness}
                strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              >
                <title>{s.label}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}

/** Anel de progresso (0 a 1), com conteúdo no centro. */
export function RadialProgress({
  value,
  size = 120,
  thickness = 10,
  tone = "secondary",
  children,
  track = "rgba(9,13,76,0.08)",
  className = "",
}: {
  value: number;
  size?: number;
  thickness?: number;
  tone?: Tone;
  children?: ReactNode;
  track?: string;
  className?: string;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, value));
  return (
    <div className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={TONE[tone]}
          strokeWidth={thickness}
          strokeDasharray={`${v * c} ${c}`}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}

/** Barra de progresso simples. */
export function Meter({
  value,
  max = 1,
  tone = "primary",
  className = "",
  track = "bg-light-gray/60",
}: {
  value: number;
  max?: number;
  tone?: Tone;
  className?: string;
  track?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={`h-2 overflow-hidden rounded-full ${track} ${className}`}>
      <div
        className={`h-full rounded-full ${TONE_BG[tone]} transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Uma barra só, dividida em segmentos proporcionais (composição de 100%). */
export function SegmentBar({
  segments,
  className = "h-3",
}: {
  segments: readonly Slice[];
  className?: string;
}) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  return (
    <div className={`flex w-full gap-0.5 overflow-hidden rounded-full bg-light-gray/50 ${className}`}>
      {total > 0 &&
        segments.map((s) =>
          s.value > 0 ? (
            <div
              key={s.label}
              title={s.label}
              className={`${TONE_BG[s.tone]} first:rounded-l-full last:rounded-r-full transition-all duration-700`}
              style={{ width: `${(s.value / total) * 100}%` }}
            />
          ) : null,
        )}
    </div>
  );
}

/** Legenda em linha: ponto colorido, rótulo e valor opcional. */
export function Legend({
  items,
  className = "",
  dark = false,
}: {
  items: readonly { label: string; tone: Tone; value?: string }[];
  className?: string;
  dark?: boolean;
}) {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1.5 text-xs ${dark ? "text-white/70" : "text-gray-100"} ${className}`}>
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${TONE_BG[item.tone]}`} />
          {item.label}
          {item.value && (
            <span className={`font-medium tabular-nums ${dark ? "text-white" : "text-primary"}`}>
              {item.value}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
