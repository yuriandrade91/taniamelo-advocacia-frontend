import React from "react";
import { CalendarIcon, TrendIcon } from "@/components/ui/icons/CalendarIcon";

/**
 * Selos de status e variação. Server Components — nenhum tem estado.
 */

/** Rótulo de período sem interação (ícone de calendário + mês). */
export function MonthLabel({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-100/70">
      <CalendarIcon />
      {label}
    </span>
  );
}

/** Selo de variação: positivo (verde) ou negativo (vermelho). */
export function DeltaBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
        isPositive ? "bg-light-green text-[#238C26]" : "bg-danger/10 text-danger"
      }`}
    >
      <TrendIcon isPositive={isPositive} />
      {isPositive ? `+${value}` : value}
    </span>
  );
}

export type BadgeTone = "danger" | "warning" | "success" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  danger: "bg-danger/10 text-danger",
  // Previsto: ainda dentro do prazo. Cor no token `previsto` (globals.css),
  // com o mesmo tom a 10% no fundo.
  warning: "bg-previsto/10 text-previsto",
  success: "bg-light-green text-[#238C26]",
  neutral: "bg-light-gray text-gray-100/70",
};

/** Selo de status (Atrasado / Pago / A vencer). */
export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: BadgeTone;
}) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}

const PILL_TONE = {
  /** Dourado claro: marca ("principal", a etapa). */
  gold: "bg-light-secondary text-secondary",
  /** Dourado translúcido: estado provisório ("a enviar"). */
  soft: "bg-secondary/15 text-secondary",
  /** Dourado cheio: o destaque da lista ("atual"). */
  solid: "bg-secondary text-white",
  success: "bg-light-green text-[#238C26]",
  warning: "bg-warning/15 text-warning",
  muted: "bg-light-gray text-gray-100",
  /** Sobre fundo colorido: branco com filete. */
  outline: "bg-white text-gray-100 ring-1 ring-black/5",
  info: "bg-sky-400 text-white",
} as const;

export type PillTone = keyof typeof PILL_TONE;

/**
 * O selo pequeno em cápsula, ao lado de um nome: "principal", "a enviar",
 * "atual". `size` `xs` é o de dentro de linha e aba; `sm`, o de cartão.
 * `className` acrescenta (o tom da aba ativa, caixa alta) — o tom vem de
 * `tone`, para não disputar com ele.
 */
export function Pill({
  tone = "gold",
  size = "xs",
  weight = "medium",
  className = "",
  children,
}: {
  tone?: PillTone;
  size?: "xs" | "sm";
  weight?: "medium" | "semibold";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center rounded-full px-2 py-0.5 ${
        size === "xs" ? "text-[10px]" : "text-[11px]"
      } ${weight === "medium" ? "font-medium" : "font-semibold"} ${PILL_TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
