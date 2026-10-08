/**
 * O que alimenta o cartão "Próximas receitas" da Home.
 *
 * Módulo puro: a Home só chama o serviço e renderiza; decidir o que é
 * "próxima", em que ordem e com que rótulo é o que se confere sem navegador.
 *
 * ## O que este cartão mostra, e o que ele NÃO mostra
 *
 * São as parcelas que os **clientes** têm a receber do INSS —
 * `client_payments`. Não é faturamento do escritório: isso é `office_revenues`
 * e vive na Carteira. As duas coisas têm o mesmo formato e somá-las já fez a
 * Carteira mostrar saldo falso; o nome "receitas" neste cartão é herança da
 * época em que a distinção não existia, e o subtítulo é que a desfaz.
 */

import { bucketOf } from "@/components/payments/paymentBuckets";
import { formatDateBR } from "@/lib/format";
import type { RevenueItem } from "@/components/home/UpcomingRevenues";
import type { OfficePaymentResponse } from "@/interfaces/payment/OfficePayment.interface";

/** Quantas linhas cabem no cartão sem ele virar uma segunda tela de Pagamentos. */
export const CARD_ROWS = 4;

/**
 * Da resposta da API para as linhas do cartão.
 *
 * O balde vem do mesmo `bucketOf` da tabela de Pagamentos: se a linha diz
 * "Atrasado" aqui e "A vencer" lá, nenhuma das duas telas serve para decidir
 * nada. "Cancelado" não aparece — o cartão responde "o que ainda vai
 * acontecer", e cancelado já não vai.
 */
export function toRevenueItems(
  payments: readonly OfficePaymentResponse[],
): RevenueItem[] {
  return payments
    .map((payment): RevenueItem | null => {
      const bucket = bucketOf(payment);
      if (bucket === "cancelled") return null;
      return {
        id: payment.id,
        // O nome do cliente vem desnormalizado na lista consolidada; sem ele
        // o cartão mostraria descrições soltas sem dizer de quem são.
        name: payment.clientName ?? "—",
        date: formatDateBR(payment.dueDate),
        status:
          bucket === "overdue" ? "ATRASADO" : bucket === "paid" ? "PAGO" : "PENDENTE",
      };
    })
    .filter((item): item is RevenueItem => item !== null)
    .slice(0, CARD_ROWS);
}
