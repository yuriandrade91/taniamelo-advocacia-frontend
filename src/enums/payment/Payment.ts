// Espelha com.lawfirm.law.firm.model.PaymentMethod e PaymentStatus (backend).

// ── Forma de pagamento ──
const PAYMENT_METHOD_ENTRIES = [
  ["PIX", "Pix"],
  ["BOLETO", "Boleto"],
  ["DINHEIRO", "Dinheiro"],
  ["TRANSFERENCIA", "Transferência"],
  ["CARTAO", "Cartão"],
  ["OUTRO", "Outro"],
] as const;

export type PaymentMethodKey = (typeof PAYMENT_METHOD_ENTRIES)[number][0];
/** Label PT-BR — valor devolvido pela API (@JsonValue). */
export type PaymentMethodLabel = (typeof PAYMENT_METHOD_ENTRIES)[number][1];
/** Aceito em requisições (nome do enum OU label). */
export type PaymentMethodInput = PaymentMethodKey | PaymentMethodLabel;

export const PaymentMethodOptions = Array.from(PAYMENT_METHOD_ENTRIES).map(
  ([value, label], index) => ({
    id: index + 1,
    value: value as PaymentMethodKey,
    label,
  }),
);

export const PaymentMethodLabelByKey = Object.fromEntries(
  Array.from(PAYMENT_METHOD_ENTRIES).map(([k, v]) => [k, v]),
) as Record<PaymentMethodKey, string>;

export const getPaymentMethodLabelByKey = (
  key?: PaymentMethodKey,
): string | undefined => (key ? PaymentMethodLabelByKey[key] : undefined);

// ── Status do pagamento ──
const PAYMENT_STATUS_ENTRIES = [
  ["PENDENTE", "Pendente"],
  ["PAGO", "Pago"],
  ["CANCELADO", "Cancelado"],
] as const;

export type PaymentStatusKey = (typeof PAYMENT_STATUS_ENTRIES)[number][0];
/** Label PT-BR — valor devolvido pela API (@JsonValue). */
export type PaymentStatusLabel = (typeof PAYMENT_STATUS_ENTRIES)[number][1];
/** Aceito em requisições (nome do enum OU label). */
export type PaymentStatusInput = PaymentStatusKey | PaymentStatusLabel;

export const PaymentStatusOptions = Array.from(PAYMENT_STATUS_ENTRIES).map(
  ([value, label], index) => ({
    id: index + 1,
    value: value as PaymentStatusKey,
    label,
  }),
);

export const PaymentStatusLabelByKey = Object.fromEntries(
  Array.from(PAYMENT_STATUS_ENTRIES).map(([k, v]) => [k, v]),
) as Record<PaymentStatusKey, string>;

export const getPaymentStatusLabelByKey = (
  key?: PaymentStatusKey,
): string | undefined => (key ? PaymentStatusLabelByKey[key] : undefined);

export { PAYMENT_METHOD_ENTRIES, PAYMENT_STATUS_ENTRIES };
