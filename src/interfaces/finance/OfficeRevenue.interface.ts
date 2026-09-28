import type { PaymentMethodInput } from "@/enums/payment/Payment";

/**
 * Receita do escritório — honorário.
 *
 * ⚠️ Contrato proposto; **não existe no backend**.
 *
 * ## Por que não reaproveita `ClientPaymentRequest`
 *
 * O formato é quase igual — e é justamente o problema. `client_payments`
 * guarda o que o INSS paga ao cliente; honorário é o que o cliente paga ao
 * escritório. Com um tipo só, nada impediria gravar um no outro, e depois não
 * haveria como separar: as colunas são as mesmas.
 *
 * ## O que este contrato ainda não resolve
 *
 * Como o honorário é **contratado** varia — percentual do êxito sobre os
 * atrasados, valor fixo parcelado, e outros arranjos. Isso é um modelo de
 * contrato, com regra própria, que gera estas receitas. Este tipo descreve a
 * receita já apurada, não o contrato que a origina; `clientId` e
 * `sourcePaymentId` existem para amarrar as duas coisas quando o contrato
 * existir.
 */
export interface OfficeRevenueRequest {
  description: string;
  amount: number;
  /** "yyyy-MM-dd". */
  dueDate: string;
  paidDate?: string;
  paymentMethod?: PaymentMethodInput;
  /** Cliente de quem veio o honorário. Opcional: nem toda receita é de cliente. */
  clientId?: string;
  /**
   * Quando o honorário é percentual do êxito, o `client_payments` de onde ele
   * saiu. É o que permite conferir "30% dos atrasados" contra o valor de fato.
   */
  sourcePaymentId?: string;
  notes?: string;
}
