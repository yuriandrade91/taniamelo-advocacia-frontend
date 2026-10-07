import type { OfficePaymentResponse } from "@/interfaces/payment/OfficePayment.interface";
import { formatBRL, formatDateBR } from "@/lib/format";
import { daysBetween } from "@/lib/period";
import { bucketOf } from "./paymentBuckets";

/**
 * Regras de exibição de uma parcela — puras e testadas. As contas de data são
 * sobre o texto `yyyy-MM-dd`, nunca `new Date(dueDate)`, que em UTC-3
 * mostraria o dia anterior.
 */

export type Payment = OfficePaymentResponse;

/** Recebimento só se registra no que está atrasado ou a vencer. */
export const canRegister = (payment: Payment): boolean => {
  const bucket = bucketOf(payment);
  return bucket === "overdue" || bucket === "upcoming";
};

/** Valor exato, ou "—" quando a parcela não tem valor. */
export const moneyOf = (payment: Payment) =>
  payment.amount === undefined ? "—" : formatBRL(payment.amount);

/** Parcela `n` de `total`, ou `null` quando é pagamento único. */
export function installmentOf(payment: Payment) {
  const n = payment.installmentNumber;
  const total = payment.installmentTotal;
  return n && total ? { n, total } : null;
}

/**
 * A frase da situação: "vence em 3 dias", "atrasado há 5 dias", "recebido em
 * 12/03/2026". O balde vem do servidor (`overdue`); a data só escolhe as
 * palavras.
 */
export function dueLabel(payment: Payment, today: string): string {
  const bucket = bucketOf(payment);
  if (bucket === "paid") {
    return payment.paidDate ? `recebido em ${formatDateBR(payment.paidDate)}` : "recebido";
  }
  if (bucket === "cancelled") return "cancelado";
  const diff = daysBetween(today, payment.dueDate);
  if (bucket === "overdue" && diff < 0) {
    return -diff === 1 ? "atrasado há 1 dia" : `atrasado há ${-diff} dias`;
  }
  if (diff <= 0) return "vence hoje";
  return diff === 1 ? "vence amanhã" : `vence em ${diff} dias`;
}
