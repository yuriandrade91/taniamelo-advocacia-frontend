import type { ReactNode } from "react";
import { Svg } from "@/components/ui/icons/Svg";

/**
 * Linha do tempo em pé: cada registro é um nó num trilho vertical, do mais
 * recente para o mais antigo. O atual ganha destaque (cartão creme e nó
 * maior); os outros são linhas leves.
 *
 * É o desenho do "Andamento do benefício" e do "Andamento no INSS" — a cor do
 * nó vem de quem usa, porque cada esteira pinta pela sua etapa.
 */
export function Timeline({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ol aria-label={label} className="flex flex-col">
      {children}
    </ol>
  );
}

export function TimelineItem({
  dotClassName,
  isCurrent,
  isLast,
  children,
}: {
  /** Fundo e anel do nó: `bg-success ring-success/20`. */
  dotClassName: string;
  isCurrent: boolean;
  isLast: boolean;
  children: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-3">
      {/* O trilho: o nó do registro e a linha até o anterior. */}
      <div className="flex flex-col items-center">
        <span
          aria-hidden="true"
          className={`mt-4 shrink-0 rounded-full ring-4 ${dotClassName} ${
            isCurrent ? "h-3.5 w-3.5" : "h-2.5 w-2.5"
          }`}
        />
        {!isLast && <span aria-hidden="true" className="mt-1 w-px flex-1 bg-light-gray" />}
      </div>

      <div
        className={`mb-2 flex min-w-0 flex-col gap-1.5 rounded-2xl px-3.5 py-3 ${
          isCurrent ? "bg-floral ring-1 ring-secondary/15" : ""
        }`}
      >
        {children}
      </div>
    </li>
  );
}

const PersonGlyph = () => (
  <Svg viewBox="0 0 16 16" strokeWidth={1.3} className="h-3.5 w-3.5 shrink-0">
    <circle cx="8" cy="5.5" r="2.5" />
    <path d="M3 13.5c.8-2.3 2.7-3.5 5-3.5s4.2 1.2 5 3.5" />
  </Svg>
);

const CalendarGlyph = () => (
  <Svg viewBox="0 0 16 16" strokeWidth={1.3} className="h-3.5 w-3.5 shrink-0">
    <rect x="2" y="3.5" width="12" height="10.5" rx="2" />
    <path d="M2 6.5h12M5.5 2v3M10.5 2v3" />
  </Svg>
);

/**
 * O rodapé do registro: quando e por quem. A data chega formatada — cada
 * esteira sabe se a sua é `Instant` (com fuso) ou `LocalDate` (sem).
 * Sem autor, a linha fica sem autoria; nunca o UUID cru.
 */
export function TimelineMeta({ date, author, children }: { date: string; author?: string; children?: ReactNode }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-100/80">
      <span className="flex items-center gap-1 whitespace-nowrap">
        <CalendarGlyph />
        {date}
      </span>
      {author && (
        <span className="flex min-w-0 items-center gap-1">
          <PersonGlyph />
          <span className="truncate">por {author}</span>
        </span>
      )}
      {children}
    </p>
  );
}
