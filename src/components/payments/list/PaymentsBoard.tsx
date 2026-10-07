"use client";

import { useState } from "react";
import { AlertIcon, ReceiptIcon } from "@/components/ui/icons/glyphs";
import { todayIso } from "@/lib/period";
import { PaymentCard, PaymentCardSkeleton } from "./PaymentCard";
import { PaymentsFilterBar } from "./PaymentsFilterBar";
import type { PaymentsBoardProps, PaymentsLoadState } from "./types";

/**
 * Pagamentos — filtro + grade de cartões (12 por página fecham as linhas de
 * 2, 3 e 4 colunas). O botão de lançar é o do cabeçalho da página.
 */

const GRID =
  "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

export function PaymentsBoard({
  items,
  state,
  emptyMessage,
  filters,
  pagination,
  actions,
}: PaymentsBoardProps) {
  // "Hoje" fixado na montagem: o render fica puro e o prazo não muda no meio da tela.
  const [today] = useState(todayIso);
  return (
    <div className="flex flex-col gap-5">
      <PaymentsFilterBar filters={filters} />

      {state === "loading" ? (
        <ul role="status" aria-label="Carregando recebimentos" className={GRID}>
          {Array.from({ length: 12 }, (_, i) => (
            <PaymentCardSkeleton key={i} />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <EmptyState message={emptyMessage} state={state} />
      ) : (
        <ul className={GRID}>
          {items.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              actions={actions}
              today={today}
            />
          ))}
        </ul>
      )}

      {/* Com uma página só, a paginação não desenha nada e a moldura some junto. */}
      <div className="empty:hidden">{pagination}</div>
    </div>
  );
}

/** Erro e rota ausente ganham o alerta: "não carregou" não pode parecer "não há nada". */
function EmptyState({
  message,
  state,
}: {
  message: string;
  state: PaymentsLoadState;
}) {
  const failed = state === "error" || state === "missing-endpoint";
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-black/10 bg-white/70 px-6 py-14 text-center"
    >
      <span
        className={`grid h-14 w-14 place-items-center rounded-2xl ${
          failed
            ? "bg-danger/10 text-danger"
            : "bg-light-secondary text-secondary"
        }`}
      >
        {failed ? (
          <AlertIcon className="h-7 w-7" />
        ) : (
          <ReceiptIcon className="h-7 w-7" />
        )}
      </span>
      <p className="max-w-md text-sm text-gray-100">{message}</p>
    </div>
  );
}
