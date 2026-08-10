"use client";

import React from "react";
import { DeltaBadge, MonthLabel } from "./ui";

export type StatCardProps = {
  /** Rótulo do indicador (ex.: "Formulários preenchidos"). */
  title: string;
  value: number | string;
  /** Denominador opcional — renderiza "20 / 30". */
  total?: number;
  /** Período exibido ao lado do título. */
  period?: string;
  /** Variação exibida como selo (+10 / -10). */
  delta?: number;
  /** Destaca o card (usado no primeiro indicador). */
  highlighted?: boolean;
  className?: string;
};

/**
 * Indicador compacto usado dentro do card "Formulários pendentes".
 * O valor principal fica em destaque; o denominador, esmaecido ao lado.
 */
export default function StatCard({
  title,
  value,
  total,
  period,
  delta,
  highlighted = false,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border p-4 ${
        highlighted
          ? "border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          : "border-black/5 bg-light-gray/40"
      } ${className}`}
    >
      <header className="flex items-start justify-between gap-2">
        <span className="inline-flex flex-col gap-1">
          <span className="text-[13px] font-medium text-primary">{title}</span>
          <span className="h-[2px] w-8 rounded-full bg-secondary/70" />
        </span>
        {period && <MonthLabel label={period} />}
      </header>

      <div className="flex items-end justify-between gap-2">
        <p className="flex items-baseline gap-1">
          <span className="text-3xl font-semibold leading-none text-primary">
            {value}
          </span>
          {total !== undefined && (
            <span className="text-base text-gray-100/40">/{total}</span>
          )}
        </p>
        {delta !== undefined && <DeltaBadge value={delta} />}
      </div>
    </div>
  );
}
