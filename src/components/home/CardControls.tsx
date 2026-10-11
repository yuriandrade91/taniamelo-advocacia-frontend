"use client";

import { ChevronDownIcon } from "@/components/ui/icons/glyphs";

/** Controles interativos dos cartões da Home (os primitivos estão em `ui/layout` e `ui/feedback`). */

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
      <ChevronDownIcon className="h-3.5 w-3.5" />
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
