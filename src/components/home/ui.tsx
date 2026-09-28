"use client";

import React from "react";
import { ChevronDownIcon } from "@/components/ui/icons/CalendarIcon";

/**
 * Controles interativos da home.
 *
 * Este arquivo era um saco de gatos com 8 exports sem relação: ícones,
 * primitivos de layout, selos e controles. Ficaram aqui só os que **precisam
 * de cliente** (têm `onClick`); o resto virou Server Component:
 *
 * | Antes (`home/ui.tsx`)      | Agora                                |
 * |----------------------------|--------------------------------------|
 * | `CalendarIcon`             | `ui/icons/CalendarIcon`              |
 * | `Card`, `SectionTitle`     | `ui/layout/Card`                     |
 * | `MonthLabel`, `DeltaBadge` | `ui/feedback/Badges`                 |
 * | `StatusBadge`, `BadgeTone` | `ui/feedback/Badges`                 |
 * | `MonthPill`, `SeeAllLink`  | continuam aqui (interativos)         |
 *
 * Os re-exports abaixo mantêm os imports existentes funcionando — a migração
 * dos consumidores pode ser gradual.
 */

export { CalendarIcon } from "@/components/ui/icons/CalendarIcon";
export { Card, SectionTitle } from "@/components/ui/layout/Card";
export {
  MonthLabel,
  DeltaBadge,
  StatusBadge,
  type BadgeTone,
} from "@/components/ui/feedback/Badges";

/** Pílula de período (ex.: "Novembro") com chevron. */
export function MonthPill({
  label,
  onClick,
  className = "",
}: {
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 py-1 text-xs text-gray-100 hover:bg-light-gray/60 ${className}`}
    >
      <ChevronDownIcon />
      {label}
    </button>
  );
}

/** Link "Ver todos" centralizado no rodapé de um card. */
export function SeeAllLink({
  onClick,
  label = "Ver todos",
}: {
  onClick?: () => void;
  label?: string;
}) {
  return (
    <div className="flex justify-center pt-4">
      <button
        type="button"
        onClick={onClick}
        className="text-xs text-gray-100/70 underline-offset-4 hover:text-primary hover:underline"
      >
        {label}
      </button>
    </div>
  );
}
