"use client";

import type { ComponentType } from "react";
import { AlertIcon, BanIcon, CheckCircleIcon, ClockIcon } from "@/components/ui/icons/glyphs";
import { BUCKET_BADGE, type PaymentBucket } from "../paymentBuckets";

/**
 * A situação da parcela: ícone + rótulo, com a cor só no ícone. Previsto
 * em azul claro, como no selo da lista da Carteira — o laranja do token
 * `--color-previsto` segue nas outras telas.
 */

const STATUS_ICON: Record<PaymentBucket, ComponentType<{ className?: string }>> = {
  overdue: AlertIcon,
  upcoming: ClockIcon,
  paid: CheckCircleIcon,
  cancelled: BanIcon,
};

/** Cor do ícone e do texto de destaque (prazo do cartão). */
const STATUS_TEXT: Record<PaymentBucket, string> = {
  overdue: "text-danger",
  upcoming: "text-sky-500",
  paid: "text-success",
  cancelled: "text-gray-100/60",
};

/** Barras e faixas. */
export const STATUS_FILL: Record<PaymentBucket, string> = {
  overdue: "bg-danger",
  upcoming: "bg-sky-400",
  paid: "bg-success",
  cancelled: "bg-light-gray",
};

/** Selo branco: ícone colorido + rótulo em `gray-100`. */
export function StatusChip({ bucket }: { bucket: PaymentBucket }) {
  const Icon = STATUS_ICON[bucket];
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white py-0.5 pr-2.5 pl-1.5 text-[11px] font-medium text-gray-100 ring-1 ring-black/10">
      <Icon className={`h-3.5 w-3.5 ${STATUS_TEXT[bucket]}`} />
      {BUCKET_BADGE[bucket].label}
    </span>
  );
}
