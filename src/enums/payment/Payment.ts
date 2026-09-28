// Espelha com.lawfirm.law.firm.model.PaymentMethod e PaymentStatus (backend).
import { createEnum } from "@/lib/enumFactory";

// ── Forma de pagamento ──
const PAYMENT_METHOD_ENTRIES = [
  ["PIX", "Pix"],
  ["BOLETO", "Boleto"],
  ["DINHEIRO", "Dinheiro"],
  ["TRANSFERENCIA", "Transferência"],
  ["CARTAO", "Cartão"],
  ["OUTRO", "Outro"],
] as const;

const paymentMethod = createEnum(PAYMENT_METHOD_ENTRIES);

export type PaymentMethodKey = (typeof PAYMENT_METHOD_ENTRIES)[number][0];
/** Label PT-BR — valor devolvido pela API (@JsonValue). */
export type PaymentMethodLabel = (typeof PAYMENT_METHOD_ENTRIES)[number][1];
/** Aceito em requisições (nome do enum OU label). */
export type PaymentMethodInput = PaymentMethodKey | PaymentMethodLabel;

export const PaymentMethodOptions = paymentMethod.optionsWithId;
export const PaymentMethodLabelByKey = paymentMethod.labelByKey;
export const getPaymentMethodLabelByKey = paymentMethod.getLabelByKey;

// ── Status do pagamento ──
const PAYMENT_STATUS_ENTRIES = [
  ["PENDENTE", "Pendente"],
  ["PAGO", "Pago"],
  ["CANCELADO", "Cancelado"],
] as const;

const paymentStatus = createEnum(PAYMENT_STATUS_ENTRIES);

export type PaymentStatusKey = (typeof PAYMENT_STATUS_ENTRIES)[number][0];
/** Label PT-BR — valor devolvido pela API (@JsonValue). */
export type PaymentStatusLabel = (typeof PAYMENT_STATUS_ENTRIES)[number][1];
/** Aceito em requisições (nome do enum OU label). */
export type PaymentStatusInput = PaymentStatusKey | PaymentStatusLabel;

export const PaymentStatusOptions = paymentStatus.optionsWithId;
export const PaymentStatusLabelByKey = paymentStatus.labelByKey;
export const getPaymentStatusLabelByKey = paymentStatus.getLabelByKey;

export { PAYMENT_METHOD_ENTRIES, PAYMENT_STATUS_ENTRIES };
