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

export type BadgeTone = "danger" | "success" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  danger: "bg-danger/10 text-danger",
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
