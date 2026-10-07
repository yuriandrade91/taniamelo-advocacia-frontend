"use client";

import { Skeleton } from "@heroui/react";
import { LoadingCircle } from "@/components/ui/feedback/Loading";
import { formatDateBR } from "@/lib/format";
import { initials, plural } from "@/lib/format";
import { bucketOf, type PaymentBucket } from "../paymentBuckets";
import { dueLabel, installmentOf, moneyOf, type Payment } from "../paymentDisplay";
import { AgreementTotal } from "../AgreementTotal";
import type { PaymentActions } from "./types";
import { InstallmentPopover } from "./InstallmentPopover";
import { PaymentRowActions } from "./PaymentRowActions";
import { STATUS_FILL, StatusChip } from "./PaymentStatus";

/**
 * O cartão de uma parcela: cliente, valor, prazo, onde a parcela está no
 * acordo, vencimento e forma. Sem sombra no hover — o realce é o contorno.
 *
 * - Texto todo em `gray-100`; só o prazo de atrasado (vermelho) e de recebido
 *   (verde) tem cor.
 * - Iniciais num quadrado arredondado `bg-primary`, iguais para todos.
 * - Situação (selo com ícone) à esquerda, na linha das ações.
 * - Trilha das parcelas: as anteriores em verde, a desta na cor da situação
 *   (vermelho se atrasada), as que faltam em cinza. A página só traz esta
 *   parcela — "anterior = paga" é a leitura pedida, não um dado consultado.
 *   Os dados reais de cada parcela vêm no `InstallmentPopover`, ao passar o
 *   mouse ou clicar no bloco.
 * - O valor grande é o da parcela; o montante do acordo (recebido e o que
 *   falta) fica no bloco da parcela (`AgreementTotal`).
 */

/** Prazo colorido só em atrasado e recebido. */
const DUE_TEXT: Record<PaymentBucket, string> = {
  overdue: "text-danger",
  upcoming: "text-gray-100",
  paid: "text-success",
  cancelled: "text-gray-100",
};
export function PaymentCard({
  payment,
  actions,
  today,
}: {
  payment: Payment;
  actions: PaymentActions;
  today: string;
}) {
  const bucket = bucketOf(payment);
  const installment = installmentOf(payment);
  const cancelled = bucket === "cancelled";

  return (
    <li
      className={`flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-black/5 transition hover:ring-secondary/40 ${
        cancelled ? "opacity-75" : ""
      }`}
    >
      <span className={`h-1 ${STATUS_FILL[bucket]}`} aria-hidden="true" />
      <div className="flex flex-1 flex-col gap-3.5 p-4">
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-[11px] font-semibold tracking-wide text-white select-none"
          >
            {initials(payment.clientName)}
          </span>
          <div className="min-w-0 flex-1">
            <ClientButton
              payment={payment}
              actions={actions}
              className="block text-sm font-medium text-gray-100"
            />
            <p className="truncate text-xs text-gray-100">
              {payment.description}
            </p>
          </div>
        </div>

        <div>
          <p
            className={`text-2xl font-semibold tracking-tight text-gray-100 tabular-nums ${
              cancelled ? "line-through decoration-gray-100/40" : ""
            }`}
          >
            {moneyOf(payment)}
          </p>
          <p className={`text-xs ${DUE_TEXT[bucket]}`}>
            {dueLabel(payment, today)}
          </p>
        </div>

        {installment ? (
          <InstallmentPopover payment={payment} actions={actions}>
            <div className="rounded-2xl bg-page px-3 py-2.5">
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="text-gray-100">Parcela</span>
                <span className="font-semibold text-gray-100 tabular-nums">
                  {installment.n}
                  <span className="font-normal text-gray-100">
                    {" "}
                    de {installment.total}
                  </span>
                </span>
              </div>
              {installment.total <= 24 ? (
                <div className="flex gap-1" aria-hidden="true">
                  {Array.from({ length: installment.total }, (_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        i + 1 < installment.n
                          ? "bg-success"
                          : i + 1 === installment.n
                            ? STATUS_FILL[bucket]
                            : "bg-light-gray"
                      }`}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-light-gray"
                  aria-hidden="true"
                >
                  <span
                    className={`block h-full rounded-full ${STATUS_FILL[bucket]}`}
                    style={{
                      width: `${(installment.n / installment.total) * 100}%`,
                    }}
                  />
                </div>
              )}
              <p className="mt-1.5 text-[11px] text-gray-100">
                {installment.total - installment.n === 0
                  ? "Última parcela do acordo"
                  : `Faltam ${plural(installment.total - installment.n, "parcela", "parcelas")} depois desta`}
              </p>
              <div className="mt-2.5 border-t border-black/5 pt-2.5">
                <AgreementTotal clientId={payment.clientId} payment={payment} />
              </div>
            </div>
          </InstallmentPopover>
        ) : (
          <div className="rounded-2xl bg-page px-3 py-2.5">
            <p className="flex items-center justify-between text-xs">
              <span className="text-gray-100">Pagamento único</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-100 ring-1 ring-black/5">
                1/1
              </span>
            </p>
          </div>
        )}

        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-gray-100">Vencimento</dt>
            <dd className="font-medium text-gray-100 tabular-nums">
              {formatDateBR(payment.dueDate)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-100">Forma</dt>
            <dd className="font-medium text-gray-100">
              {payment.paymentMethod ?? "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-black/5 pt-2">
          <StatusChip bucket={bucket} />
          <PaymentRowActions
            payment={payment}
            actions={actions}
            className="-mr-1"
          />
        </div>
      </div>
    </li>
  );
}

/** Nome do cliente como botão — abre a ficha. */
function ClientButton({
  payment,
  actions,
  className = "",
}: {
  payment: Payment;
  actions: PaymentActions;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={`Ver ficha de ${payment.clientName}`}
      title="Ver ficha do cliente"
      onClick={() => actions.onViewClient(payment)}
      className={`max-w-full truncate text-left underline-offset-2 transition hover:underline focus-visible:underline focus-visible:outline-none ${className}`}
    >
      {payment.clientName}
    </button>
  );
}

/**
 * O cartão carregando: a mesma moldura e os mesmos rótulos fixos, com
 * skeleton só onde vem dado (na largura do dado) e o selo de situação como
 * círculo — o cartão real ocupa exatamente este lugar.
 */
export function PaymentCardSkeleton() {
  return (
    <li aria-hidden="true" className="flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-black/5">
      <span className="h-1 bg-light-gray" />
      <div className="flex flex-1 flex-col gap-3.5 p-4">
        <div className="flex items-start gap-2.5">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-7 w-32 rounded-lg" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
        <div className="rounded-2xl bg-page px-3 py-2.5">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-gray-100">Parcela</span>
            <Skeleton className="h-3 w-10 rounded-md" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
          <Skeleton className="mt-1.5 h-3 w-36 rounded-md" />
        </div>
        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-gray-100">Vencimento</dt>
            <dd className="pt-0.5">
              <Skeleton className="h-3.5 w-16 rounded-md" />
            </dd>
          </div>
          <div>
            <dt className="text-gray-100">Forma</dt>
            <dd className="pt-0.5">
              <Skeleton className="h-3.5 w-14 rounded-md" />
            </dd>
          </div>
        </dl>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-black/5 pt-2">
          <span className="inline-flex h-[22px] w-24 items-center justify-center rounded-full bg-white ring-1 ring-black/10">
            <LoadingCircle size={12} />
          </span>
          <span className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-7 w-7 rounded-md" />
            ))}
          </span>
        </div>
      </div>
    </li>
  );
}
