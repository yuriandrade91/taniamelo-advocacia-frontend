"use client";

import { Skeleton } from "@heroui/react";
import { PulseHalo } from "@/components/wallet/PulseHalo";
import type { ClientPaymentResponse } from "@/interfaces/client/ClientSubResources.interface";
import { formatBRL, formatDateBR, plural } from "@/lib/format";
import { BUCKET_BADGE, bucketOf, type PaymentBucket } from "./paymentBuckets";
import type { InstallmentCounts } from "./installmentTrail";
import { STATUS_FILL } from "./list/PaymentStatus";

/**
 * As parcelas de um acordo, uma por nó — a mesma esteira no cartão de
 * Pagamentos (`InstallmentPopover`) e no histórico do detalhe da parcela
 * (`PaymentDetailsDrawer`).
 *
 * - Recebida em **verde com ✓**, atrasada em vermelho com "!", a vencer em
 *   azul claro, cancelada em cinza; a parcela em foco leva o halo e "esta".
 * - Número sem lançamento aparece como "não lançada".
 * - Carregando, as outras parcelas são skeleton; a em foco já se sabe.
 */

const NODE: Record<PaymentBucket, string> = {
  paid: "bg-success text-white",
  overdue: "bg-danger text-white",
  upcoming: "bg-sky-400 text-white",
  cancelled: "bg-light-gray text-gray-100",
};

const NODE_MARK: Record<PaymentBucket, (n: number) => string> = {
  paid: () => "✓",
  overdue: () => "!",
  upcoming: (n) => String(n),
  cancelled: (n) => String(n),
};

/** Texto do estado: só atrasado e recebido com cor, como no cartão. */
const STATE_TEXT: Record<PaymentBucket, string> = {
  paid: "text-success",
  overdue: "text-danger",
  upcoming: "text-gray-100",
  cancelled: "text-gray-100",
};

const numbersOf = (total: number) =>
  Array.from({ length: total }, (_, i) => i + 1);

export function InstallmentList<P extends ClientPaymentResponse>({
  current,
  byNumber,
  isLoading,
  onOpen,
  canOpenCurrent = true,
  className = "",
}: {
  /** A parcela em foco: a do cartão ou a do detalhe aberto. */
  current: P;
  /** As parcelas do acordo, por número (`agreementOf`). */
  byNumber: ReadonlyMap<number, P>;
  isLoading: boolean;
  /** Abre o detalhe de uma parcela. */
  onOpen?: (payment: P) => void;
  /** No detalhe, a parcela em foco já é a que está aberta. */
  canOpenCurrent?: boolean;
  className?: string;
}) {
  const numbers = numbersOf(current.installmentTotal ?? 1);

  return (
    <ol aria-label="Parcelas" className={`flex flex-col ${className}`}>
      {numbers.map((n, index) => {
        const item = byNumber.get(n);
        const isThis = n === current.installmentNumber;
        const isLast = index === numbers.length - 1;
        const bucket = item ? bucketOf(item) : null;
        const canOpen = item && onOpen && (canOpenCurrent || !isThis);
        return (
          <li key={n} className="relative">
            {!isLast && (
              <span
                aria-hidden="true"
                className={`absolute top-8 left-5.5 h-[calc(100%-1.25rem)] w-0.5 rounded-full ${
                  bucket === "paid" ? "bg-success" : "bg-light-gray"
                }`}
              />
            )}
            {isLoading && !isThis ? (
              <div className="flex items-center gap-3 px-2.5 py-1.5">
                <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
                <Skeleton className="h-3.5 flex-1 rounded-md" />
              </div>
            ) : (
              <InstallmentRow
                n={n}
                item={item}
                bucket={bucket}
                isThis={isThis}
                onOpen={canOpen ? () => onOpen(item) : undefined}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Uma barra por parcela, na cor da situação; não lançada fica cinza. */
export function InstallmentStrip<P extends ClientPaymentResponse>({
  current,
  byNumber,
}: {
  current: P;
  byNumber: ReadonlyMap<number, P>;
}) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {numbersOf(current.installmentTotal ?? 1).map((n) => {
        const item = byNumber.get(n);
        return (
          <span
            key={n}
            className={`h-1.5 flex-1 rounded-full ${item ? STATUS_FILL[bucketOf(item)] : "bg-light-gray"}`}
          />
        );
      })}
    </div>
  );
}

/** "3 recebidas · 1 atrasada · 6 a vencer" — atrasada só quando há. */
export function InstallmentTally({ counts }: { counts: InstallmentCounts }) {
  return (
    <>
      <span className="text-success">
        {plural(counts.paid, "recebida", "recebidas")}
      </span>
      {counts.overdue > 0 && (
        <>
          {" · "}
          <span className="text-danger">
            {plural(counts.overdue, "atrasada", "atrasadas")}
          </span>
        </>
      )}
      {" · "}
      {plural(counts.upcoming, "a vencer", "a vencer")}
    </>
  );
}

function InstallmentRow({
  n,
  item,
  bucket,
  isThis,
  onOpen,
}: {
  n: number;
  item?: ClientPaymentResponse;
  bucket: PaymentBucket | null;
  isThis: boolean;
  onOpen?: () => void;
}) {
  const label = bucket ? BUCKET_BADGE[bucket].label : "não lançada";
  const when = !item
    ? null
    : bucket === "paid" && item.paidDate
      ? `recebida em ${formatDateBR(item.paidDate)}`
      : `vence ${formatDateBR(item.dueDate)}`;
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      aria-label={`Parcela ${n} (${label})${onOpen ? " — ver detalhes" : ""}`}
      className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-1.5 text-left text-sm transition disabled:cursor-default ${
        isThis ? "bg-primary/5 ring-1 ring-primary/15" : "enabled:hover:bg-primary/5"
      }`}
    >
      <span className="relative grid h-6 w-6 shrink-0 place-items-center">
        {isThis && bucket && <PulseHalo bucket={bucket} colorClass={bucket === "upcoming" ? "bg-sky-400" : undefined} />}
        <span
          className={`relative grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold ${
            bucket ? NODE[bucket] : "bg-white text-gray-100 ring-1 ring-light-gray"
          }`}
        >
          {bucket ? NODE_MARK[bucket](n) : n}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-gray-100 ${isThis ? "font-medium" : ""}`}>
          Parcela {n}
          {isThis && <span className="ml-1.5 text-[10px] text-secondary uppercase">esta</span>}
        </span>
        <span className={`block truncate text-[11px] ${bucket ? STATE_TEXT[bucket] : "text-gray-100"}`}>
          {label}
          {when && <span className="text-gray-100"> · {when}</span>}
        </span>
      </span>
      {item && (
        <span className="shrink-0 text-xs font-medium text-gray-100 tabular-nums">
          {item.amount === undefined ? "—" : formatBRL(item.amount)}
        </span>
      )}
    </button>
  );
}
