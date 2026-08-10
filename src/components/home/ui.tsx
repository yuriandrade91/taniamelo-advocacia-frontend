"use client";

import React from "react";

/**
 * Primitivos visuais compartilhados da home.
 * Concentram os padrões do design: título com sublinhado dourado, pílula de
 * período, selo de variação e selo de status.
 */

/** Ícone de calendário (inline, sem dependência de biblioteca). */
export function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-3.5 w-3.5 ${className}`}
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-3.5 w-3.5"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** Título de seção com o sublinhado dourado da marca. */
export function SectionTitle({
  children,
  as: Tag = "h2",
  className = "",
}: {
  children: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <Tag className={`inline-flex flex-col gap-1.5 ${className}`}>
      <span className="text-lg font-medium text-primary">{children}</span>
      <span className="h-[2px] w-10 rounded-full bg-secondary" />
    </Tag>
  );
}

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
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
        positive ? "bg-light-green text-[#238C26]" : "bg-danger/10 text-danger"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`h-3 w-3 ${positive ? "" : "rotate-90"}`}
      >
        <path d="M3 17 9 11l4 4 8-8" />
        <path d="M17 7h4v4" />
      </svg>
      {positive ? `+${value}` : value}
    </span>
  );
}

export type BadgeTone = "danger" | "success" | "neutral";

/** Selo de status (Atrasado / Pago / A vencer). */
export function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: BadgeTone;
}) {
  const toneClass: Record<BadgeTone, string> = {
    danger: "bg-danger/10 text-danger",
    success: "bg-light-green text-[#238C26]",
    neutral: "bg-light-gray text-gray-100/70",
  };
  return (
    <span
      className={`inline-flex shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${toneClass[tone]}`}
    >
      {label}
    </span>
  );
}

/** Card branco padrão da home. */
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-black/5 bg-white p-5 ${className}`}
    >
      {children}
    </div>
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
