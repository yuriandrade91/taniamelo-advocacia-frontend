"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { bucketOf } from "@/components/payments/paymentBuckets";
import type { OfficePaymentResponse } from "@/interfaces/payment/OfficePayment.interface";
import type { AppointmentResponse } from "@/interfaces/appointment/Appointment.interface";
import { localDay, todayOf } from "./homeKit";

/**
 * Peças da segunda leva de modelos do Início (paleta, vidro, mural, stories,
 * terminal, órbitas, brutalista, colmeia, conversa e neumórfico).
 *
 * O que já era regra continua em `homeKit`; aqui ficam só os ícones novos e
 * os poucos utilitários que essa leva divide.
 */

// ── Ícones dos seletores ──

function Glyph({ className = "h-4 w-4", children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

type P = { className?: string };

export const CommandKeyIcon = ({ className }: P) => (
  <Glyph className={className}>
    <path d="M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6Z" />
  </Glyph>
);
export const GlassIcon = ({ className }: P) => (
  <Glyph className={className}>
    <rect x="3" y="6" width="13" height="13" rx="3" />
    <rect x="8" y="3" width="13" height="13" rx="3" opacity=".55" />
  </Glyph>
);
export const PinIcon = ({ className }: P) => (
  <Glyph className={className}>
    <path d="M9 3h6l-1 6 3 3H7l3-3-1-6ZM12 12v9" />
  </Glyph>
);
export const StoriesIcon = ({ className }: P) => (
  <Glyph className={className}>
    <path d="M3 4h4M10 4h4M17 4h4" />
    <rect x="6" y="8" width="12" height="13" rx="2.5" />
  </Glyph>
);
export const PromptIcon = ({ className }: P) => (
  <Glyph className={className}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="m7 10 3 2-3 2M12 15h5" />
  </Glyph>
);
export const BrutalIcon = ({ className }: P) => (
  <Glyph className={className}>
    <rect x="3" y="3" width="14" height="14" rx="1" />
    <path d="M7 21h14V7" />
  </Glyph>
);
export const HexIcon = ({ className }: P) => (
  <Glyph className={className}>
    <path d="m12 2.5 8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5L12 2.5Z" />
    <path d="m12 8 3.5 2v4L12 16l-3.5-2v-4L12 8Z" />
  </Glyph>
);
export const BubbleIcon = ({ className }: P) => (
  <Glyph className={className}>
    <path d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    <path d="M20 9h.5A1.5 1.5 0 0 1 22 10.5v6a1.5 1.5 0 0 1-1.5 1.5H20v2.5L17 18h-4" />
  </Glyph>
);
export const SoftIcon = ({ className }: P) => (
  <Glyph className={className}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" opacity=".55" />
  </Glyph>
);
export const PauseIcon = ({ className }: P) => (
  <Glyph className={className}>
    <path d="M9 5v14M15 5v14" />
  </Glyph>
);
export const PlayIcon = ({ className }: P) => (
  <Glyph className={className}>
    <path d="M7 5v14l11-7L7 5Z" />
  </Glyph>
);
export const ReplayIcon = ({ className }: P) => (
  <Glyph className={className}>
    <path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" />
  </Glyph>
);
export const SendIcon = ({ className }: P) => (
  <Glyph className={className}>
    <path d="M4 12 20 4l-6 16-3-7-7-1Z" />
  </Glyph>
);

// ── Utilitários ──

/** Minúsculas e sem acento — busca que acha "análise" digitando "analise". */
export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const media = window.matchMedia(REDUCED_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** `true` quando o sistema pede menos movimento (no servidor, `false`). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/**
 * Vazio do bloco financeiro: sem permissão a moldura fica e a frase explica;
 * com permissão e lista vazia, só "nada previsto".
 */
export function financeEmptyText(canSeeFinance: boolean): string {
  return canSeeFinance
    ? "Nenhum recebimento em aberto."
    : "Recebimentos visíveis só para administradores.";
}

/** Recebimentos em aberto: atrasados primeiro, depois os previstos (por vencimento). */
export function openPayments(list: OfficePaymentResponse[]): OfficePaymentResponse[] {
  const overdue = list.filter((p) => bucketOf(p) === "overdue");
  const upcoming = list.filter((p) => bucketOf(p) === "upcoming");
  const byDue = (a: OfficePaymentResponse, b: OfficePaymentResponse) =>
    a.dueDate.localeCompare(b.dueDate);
  return [...overdue.sort(byDue), ...upcoming.sort(byDue)];
}

/** Só os compromissos de hoje (já sem cancelados, se a lista vier de `activeAppointments`). */
export function todayOnly(list: AppointmentResponse[], now: number): AppointmentResponse[] {
  const today = todayOf(now);
  return list.filter((a) => localDay(a.startAt) === today);
}

/** Tecla digitada dentro de um campo ou com diálogo aberto — atalhos globais ignoram. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (typeof document !== "undefined" && document.querySelector('[role="dialog"]')) return true;
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]'))
  );
}
