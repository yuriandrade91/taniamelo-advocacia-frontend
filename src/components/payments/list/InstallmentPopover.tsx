"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Popover, Skeleton } from "@heroui/react";
import { PulseHalo } from "@/components/wallet/PulseHalo";
import { formatBRL, formatDateBR, plural } from "@/lib/format";
import { useDismiss } from "@/hooks/useDismiss";
import { BUCKET_BADGE, bucketOf, type PaymentBucket } from "../paymentBuckets";
import type { Payment } from "../paymentDisplay";
import { AgreementTotal } from "../AgreementTotal";
import { agreementOf, useInstallmentTrail } from "../installmentTrail";
import { STATUS_FILL } from "./PaymentStatus";
import type { PaymentActions } from "./types";

/**
 * As parcelas do acordo num cartão, no desenho do de mudar situação de
 * Clientes (`StageChanger`): passar o mouse sobre a trilha da parcela (com
 * espera) ou clicar nela abre a esteira em pé, uma parcela por nó.
 *
 * - Dados reais: as parcelas do cliente são buscadas só ao abrir
 *   (`useInstallmentTrail`) e casadas pelo acordo (`agreementOf`).
 * - Recebida em **verde com ✓**, atrasada em vermelho com "!", a vencer em
 *   azul claro, cancelada em cinza; a parcela deste cartão leva o halo.
 *   Número sem lançamento aparece como "não lançada".
 * - Clicar numa parcela abre o detalhe dela.
 * - Clicado, fica aberto até clicar fora ou Esc. Não modal, pela mesma razão
 *   do `StageChanger`: a camada do modal fazia o cartão piscar com o cursor
 *   parado no gatilho.
 */

const HOVER_OPEN_DELAY_MS = 300;
const HOVER_CLOSE_DELAY_MS = 200;

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

export function InstallmentPopover({
  payment,
  actions,
  children,
}: {
  payment: Payment;
  actions: PaymentActions;
  /** O gatilho — o bloco da parcela no cartão. */
  children: ReactNode;
}) {
  const [isPinned, setIsPinned] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const isOpen = isPinned || isHovering;

  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearHoverTimer = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  };
  useEffect(() => clearHoverTimer, []);

  const close = () => {
    clearHoverTimer();
    setIsPinned(false);
    setIsHovering(false);
  };
  // Não modal: clicar fora e Esc ficam por nossa conta (`useDismiss`).
  const triggerRef = useRef<HTMLDivElement>(null);
  /** O fechamento pedido pelo popover veio de um clique no próprio gatilho? */
  const triggerPressed = useRef(false);
  const cardRef = useRef<HTMLElement>(null);
  useDismiss(isOpen, close, [triggerRef, cardRef], (target) => {
    // Clique no gatilho com o cartão aberto (pelo mouse): prende. Se o popover
    // ainda pedir para fechar logo em seguida, o `onOpenChange` lê esta marca
    // e não fecha.
    if (!triggerRef.current?.contains(target)) return;
    triggerPressed.current = true;
    setIsPinned(true);
  });

  const hoverIn = () => {
    clearHoverTimer();
    if (isOpen) return;
    hoverTimer.current = setTimeout(() => setIsHovering(true), HOVER_OPEN_DELAY_MS);
  };
  const hoverOut = () => {
    clearHoverTimer();
    hoverTimer.current = setTimeout(() => setIsHovering(false), HOVER_CLOSE_DELAY_MS);
  };

  const trail = useInstallmentTrail(payment.clientId, isOpen);
  const total = payment.installmentTotal ?? 1;
  const byNumber =
    trail.status === "ready" ? agreementOf(payment, trail.payments) : agreementOf(payment, []);
  const numbers = Array.from({ length: total }, (_, i) => i + 1);
  const counts = { paid: 0, overdue: 0, upcoming: 0 };
  for (const p of byNumber.values()) {
    const bucket = bucketOf(p);
    if (bucket !== "cancelled") counts[bucket] += 1;
  }

  return (
    <Popover
      isOpen={isOpen}
      onOpenChange={(open) => {
        const pressedTrigger = triggerPressed.current;
        triggerPressed.current = false;
        if (open || (pressedTrigger && !isPinned)) setIsPinned(true);
        else close();
      }}
    >
      <Popover.Trigger
        ref={triggerRef}
        aria-label={`Ver as parcelas do acordo de ${payment.clientName}`}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
        className="block w-full cursor-pointer rounded-2xl text-left transition outline-none hover:ring-1 hover:ring-primary/15 focus-visible:ring-2 focus-visible:ring-secondary/60"
      >
        {children}
      </Popover.Trigger>

      <Popover.Content
        ref={cardRef}
        isNonModal
        placement="bottom"
        className="w-80"
        onMouseEnter={clearHoverTimer}
        onMouseLeave={hoverOut}
      >
        <Popover.Arrow />
        <Popover.Dialog aria-label="Parcelas do acordo">
          <span className="inline-flex w-fit items-center rounded-full bg-light-secondary px-2 py-0.5 text-[11px] font-medium text-secondary">
            Parcelas do acordo
          </span>
          <p className="mt-2 truncate text-sm font-semibold text-gray-100">{payment.clientName}</p>
          <p className="mt-0.5 truncate text-xs text-gray-100">
            {payment.description} · parcela {payment.installmentNumber} de {total}
          </p>

          {trail.status === "error" && (
            <p className="mt-2 text-xs text-danger">
              Não foi possível carregar as outras parcelas.
            </p>
          )}

          <ol aria-label="Parcelas" className="mt-3 flex max-h-80 flex-col overflow-y-auto pr-1">
            {numbers.map((n, index) => {
              const item = byNumber.get(n);
              const isThis = n === payment.installmentNumber;
              const isLast = index === numbers.length - 1;
              const bucket = item ? bucketOf(item) : null;
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
                  {trail.status === "loading" && !isThis ? (
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
                      onOpen={item ? () => actions.onView(item) : undefined}
                    />
                  )}
                </li>
              );
            })}
          </ol>

          {trail.status === "ready" && (
            <div className="mt-3 rounded-2xl bg-page p-3">
              <div className="flex gap-1" aria-hidden="true">
                {numbers.map((n) => {
                  const item = byNumber.get(n);
                  return (
                    <span
                      key={n}
                      className={`h-1.5 flex-1 rounded-full ${item ? STATUS_FILL[bucketOf(item)] : "bg-light-gray"}`}
                    />
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-100">
                <span className="text-success">{plural(counts.paid, "recebida", "recebidas")}</span>
                {counts.overdue > 0 && (
                  <>
                    {" · "}
                    <span className="text-danger">{plural(counts.overdue, "atrasada", "atrasadas")}</span>
                  </>
                )}
                {" · "}
                {plural(counts.upcoming, "a vencer", "a vencer")}
              </p>
              <div className="mt-2.5 border-t border-black/5 pt-2.5">
                <AgreementTotal clientId={payment.clientId} payment={payment} />
              </div>
            </div>
          )}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
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
  item?: Payment;
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
