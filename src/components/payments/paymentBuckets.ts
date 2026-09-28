import { PaymentStatusLabelByKey } from "@/enums/payment/Payment";
import type { BadgeTone } from "@/components/ui/feedback/Badges";

/**
 * Classificação de um recebimento nos mesmos baldes que o `summary` usa.
 *
 * Precisa concordar com o backend campo a campo: se a linha diz "Previsto" e o
 * total de "Vencidos" a inclui, ninguém vai confiar em nenhum dos dois. Por
 * isso a regra é função pura e testada, e a definição está escrita no mesmo
 * lugar em que o contrato do `summary` está documentado.
 *
 * `overdue` vem calculado do backend — não recalculamos com `new Date()` aqui.
 * O relógio do navegador é do usuário; o do servidor é o do sistema. Duas
 * fontes para "hoje" é como uma linha aparece vencida numa tela e em dia na
 * outra.
 */

export type PaymentBucket = "overdue" | "upcoming" | "paid" | "cancelled";

type Classifiable = {
  status?: string;
  overdue?: boolean;
};

export function bucketOf(payment: Classifiable): PaymentBucket {
  if (payment.status === PaymentStatusLabelByKey.CANCELADO) return "cancelled";
  if (payment.status === PaymentStatusLabelByKey.PAGO) return "paid";
  return payment.overdue ? "overdue" : "upcoming";
}

/** Rótulo e tom do selo. "Atrasado" é o termo que a `StatusBadge` já usa. */
export const BUCKET_BADGE: Record<
  PaymentBucket,
  { label: string; tone: BadgeTone }
> = {
  overdue: { label: "Atrasado", tone: "danger" },
  upcoming: { label: "Previsto", tone: "neutral" },
  // "Recebido" e não "Pago": quem recebe é o cliente, do INSS.
  paid: { label: "Recebido", tone: "success" },
  cancelled: { label: "Cancelado", tone: "neutral" },
};
