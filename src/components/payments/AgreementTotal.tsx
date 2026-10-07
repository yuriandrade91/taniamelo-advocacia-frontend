"use client";

import { Skeleton } from "@heroui/react";
import type { ClientPaymentResponse } from "@/interfaces/client/ClientSubResources.interface";
import { formatBRL } from "@/lib/format";
import { useAgreementTotals, type AgreementTotals } from "./installmentTrail";

/**
 * O montante que o cliente deve receber no acordo — o valor do cartão e do
 * detalhe é o de **uma** parcela. Soma as parcelas lançadas e não canceladas
 * (`useAgreementTotals`), com o já recebido e o que falta.
 *
 * Texto em `gray-100`; só o recebido em verde, como no resto da tela.
 */
export function AgreementTotal({
  clientId,
  payment,
  size = "sm",
}: {
  clientId: string;
  payment: ClientPaymentResponse;
  /** `sm` no cartão; `md` no painel de detalhes. */
  size?: "sm" | "md";
}) {
  const state = useAgreementTotals(clientId, payment);
  const md = size === "md";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={
            md
              ? "text-[11px] tracking-wide text-gray-100/60 uppercase"
              : "text-xs text-gray-100"
          }
        >
          Total a receber no acordo
        </span>
        {state.status === "loading" ? (
          <Skeleton className={`rounded-md ${md ? "h-6 w-28" : "h-4 w-20"}`} />
        ) : (
          <span
            className={`font-semibold text-gray-100 tabular-nums ${md ? "text-xl" : "text-sm"}`}
          >
            {state.status === "ready" ? formatBRL(state.total) : "—"}
          </span>
        )}
      </div>
      {state.status === "ready" ? (
        <Breakdown totals={state} md={md} />
      ) : state.status === "error" ? (
        <p className="mt-0.5 text-[11px] text-gray-100">
          Não foi possível somar as parcelas.
        </p>
      ) : null}
    </div>
  );
}

function Breakdown({ totals, md }: { totals: AgreementTotals; md: boolean }) {
  return (
    <p className={`mt-0.5 text-gray-100 ${md ? "text-xs" : "text-[11px]"}`}>
      <span className="text-success">
        recebido {formatBRL(totals.received)}
      </span>
      {" · "}falta {formatBRL(totals.remaining)}
      {totals.missing > 0 &&
        ` · ${totals.missing} ${totals.missing === 1 ? "parcela não lançada" : "parcelas não lançadas"} fora da conta`}
    </p>
  );
}
