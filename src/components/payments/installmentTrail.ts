"use client";

import { useEffect, useState } from "react";
import type { ClientPaymentResponse } from "@/interfaces/client/ClientSubResources.interface";
import type { OfficePaymentResponse } from "@/interfaces/payment/OfficePayment.interface";
import { bucketOf } from "./paymentBuckets";
import { listOfficePayments } from "@/services/officePaymentService";
import { createSessionCache } from "@/lib/requestCache";

/**
 * As parcelas de um cliente, buscadas **só quando é preciso** — para o total
 * do acordo no cartão e no detalhe, e para o cartão de parcelas — e guardadas
 * por cliente (vários cartões do mesmo cliente dividem uma busca), no mesmo desenho da trilha de
 * situação de Clientes (`situationTrail.ts`):
 *
 * - Reabrir o cartão do mesmo cliente não chama a API de novo.
 * - Duas aberturas antes de a primeira voltar dividem a mesma requisição.
 * - Tudo sai quando a lista da página recarrega (`invalidateInstallmentTrail()`):
 *   registrar, editar ou excluir muda as parcelas.
 *
 * Erro não fica guardado: quem usa diz que não carregou e mostra só a parcela
 * que já está na tela.
 */

/** Um acordo inteiro cabe numa página. */
const TRAIL_PAGE_SIZE = 100;

const trails = createSessionCache<OfficePaymentResponse[]>();

const loadTrail = (clientId: string) =>
  trails.load(clientId, () =>
    listOfficePayments({ clientId, pageSize: TRAIL_PAGE_SIZE }).then((envelope) => envelope?.data ?? []),
  );

export const invalidateInstallmentTrail = () => trails.invalidate();

export type TrailState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; payments: OfficePaymentResponse[] };

/** As parcelas do cliente enquanto `enabled`. */
export function useInstallmentTrail(
  clientId: string,
  enabled: boolean,
): TrailState {
  const [loaded, setLoaded] = useState<{
    id: string;
    state: TrailState;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadTrail(clientId)
      .then((payments) => {
        if (active)
          setLoaded({ id: clientId, state: { status: "ready", payments } });
      })
      .catch(() => {
        if (active) setLoaded({ id: clientId, state: { status: "error" } });
      });
    return () => {
      active = false;
    };
  }, [clientId, enabled]);

  return loaded && loaded.id === clientId
    ? loaded.state
    : { status: "loading" };
}

/**
 * "Parcela 3/12", "(3 de 12)", "- 3/12": o número da parcela que às vezes vai
 * na descrição. Sem ele, as parcelas de um acordo têm a mesma descrição.
 */
const INSTALLMENT_IN_TEXT =
  /\s*[-–(]?\s*(parcela\s*)?\d+\s*(\/|de)\s*\d+\s*\)?/gi;

const normalize = (description: string) =>
  description.replace(INSTALLMENT_IN_TEXT, "").trim().toLowerCase();

/**
 * As parcelas do mesmo acordo que `payment`: mesmo total de parcelas e mesma
 * descrição (sem o número da parcela). Uma por número — se o cliente tiver
 * dois acordos iguais, vale a do vencimento mais próximo do desta.
 */
export function agreementOf<P extends ClientPaymentResponse>(
  payment: P,
  all: readonly P[],
): Map<number, P> {
  const key = normalize(payment.description ?? "");
  const byNumber = new Map<number, P>();
  const distance = (p: P) =>
    Math.abs(Date.parse(p.dueDate) - Date.parse(payment.dueDate));

  for (const p of all) {
    if (!p.installmentNumber || p.installmentTotal !== payment.installmentTotal)
      continue;
    if (normalize(p.description ?? "") !== key) continue;
    const known = byNumber.get(p.installmentNumber);
    if (!known || distance(p) < distance(known))
      byNumber.set(p.installmentNumber, p);
  }
  // A desta parcela é sempre a que está na tela.
  if (payment.installmentNumber)
    byNumber.set(payment.installmentNumber, payment);
  return byNumber;
}

export type AgreementTotals = {
  /** Soma das parcelas lançadas e não canceladas — o que o cliente deve receber. */
  total: number;
  received: number;
  remaining: number;
  /** Números de parcela sem lançamento: o total não as inclui. */
  missing: number;
};

/** O montante do acordo a partir das parcelas casadas por `agreementOf`. */
export function agreementTotals(
  byNumber: ReadonlyMap<number, ClientPaymentResponse>,
  installmentTotal: number,
): AgreementTotals {
  let total = 0;
  let received = 0;
  for (const p of byNumber.values()) {
    const bucket = bucketOf(p);
    if (bucket === "cancelled") continue;
    const amount = p.amount ?? 0;
    total += amount;
    if (bucket === "paid") received += amount;
  }
  return {
    total,
    received,
    remaining: total - received,
    missing: Math.max(0, installmentTotal - byNumber.size),
  };
}

export type AgreementState =
  | { status: "loading" }
  | { status: "error" }
  | ({ status: "ready" } & AgreementTotals);

/**
 * O montante do acordo de uma parcela. Pagamento único não busca nada: o
 * acordo é a própria parcela.
 */
export function useAgreementTotals(
  clientId: string,
  payment: ClientPaymentResponse,
): AgreementState {
  const installmentTotal = payment.installmentTotal ?? 1;
  const isSingle = !payment.installmentNumber || installmentTotal <= 1;
  const trail = useInstallmentTrail(clientId, !isSingle);
  if (isSingle) {
    return {
      status: "ready",
      ...agreementTotals(new Map([[1, payment]]), 1),
    };
  }
  if (trail.status !== "ready") return trail;
  return {
    status: "ready",
    ...agreementTotals(
      agreementOf<ClientPaymentResponse>(payment, trail.payments),
      installmentTotal,
    ),
  };
}
