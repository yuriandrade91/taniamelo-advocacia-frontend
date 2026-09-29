/**
 * Edição de uma parcela a receber — regras e payload.
 *
 * Módulo puro, como `wallet/entryForms`: o que se confere sem abrir o
 * navegador mora aqui.
 *
 * ## PATCH, e o que isso muda em relação à Carteira
 *
 * `/clients/{id}/payments/{id}` é **PATCH parcial**: o que não vai no corpo
 * fica como está. Isso torna a edição mais segura que a da Carteira (onde o
 * PUT substitui o registro inteiro e esquecer o status o zerava), mas cria
 * outra armadilha — mandar tudo sempre, inclusive o que ninguém tocou, faz
 * cada salvamento reescrever campos alheios e a trilha de auditoria registrar
 * mudança onde não houve. Por isso `toPaymentPatch` manda **só o que mudou**.
 *
 * ## A regra de status e data, que é do servidor
 *
 * Marcar `status = Pago` sem informar `paidDate` faz o backend assumir hoje;
 * voltar para Pendente ou Cancelado limpa a data — a menos que o próprio
 * patch mande uma. A tela não reimplementa isso: ela manda o par coerente e
 * deixa a regra onde ela mora.
 */

import { parseAmountBRL } from "@/lib/format";
import { validateInstallment, validateIsoDate } from "@/components/wallet/entryForms";
import { validateAmount } from "@/components/wallet/entryForms";
import { validatePaidDate } from "@/lib/validators/validators";
import { todayIso } from "@/lib/period";
import { PaymentStatusLabelByKey } from "@/enums/payment/Payment";
import type {
  ClientPaymentResponse,
  ClientPaymentUpdateRequest,
} from "@/interfaces/client/ClientSubResources.interface";
import type { PaymentMethodInput, PaymentStatusInput } from "@/enums/payment/Payment";

export type PaymentFormValues = {
  description: string;
  amount: string;
  installmentNumber: string;
  installmentTotal: string;
  dueDate: string;
  /** "Já foi recebido?" — a caixa que decide Pendente × Pago. */
  isSettled: boolean;
  paidDate: string;
  paymentMethod: string;
  notes: string;
  /** Situação atual em rótulo, para preservar "Cancelado". */
  status: string;
};

export type PaymentFormErrors = Partial<Record<keyof PaymentFormValues, string>>;

const texto = (valor: string | undefined | null): string => valor ?? "";

const numeroTexto = (valor: number | undefined | null): string =>
  valor === undefined || valor === null || Number.isNaN(valor)
    ? ""
    : String(valor);

/** Mesmo formato do `AmountField`: vírgula decimal, sem separador de milhar. */
export function amountToInput(valor: number | undefined | null): string {
  if (valor === undefined || valor === null || Number.isNaN(valor)) return "";
  return valor.toFixed(2).replace(".", ",");
}

export function paymentFormFrom(
  payment: ClientPaymentResponse,
): PaymentFormValues {
  return {
    description: texto(payment.description),
    amount: amountToInput(payment.amount),
    installmentNumber: numeroTexto(payment.installmentNumber),
    installmentTotal: numeroTexto(payment.installmentTotal),
    dueDate: texto(payment.dueDate),
    // Do status, nunca da data: uma parcela cancelada pode ter paidDate de
    // antes do cancelamento, e ler a data a reabriria como recebida.
    isSettled: payment.status === PaymentStatusLabelByKey.PAGO,
    paidDate: texto(payment.paidDate),
    paymentMethod: texto(payment.paymentMethod),
    notes: texto(payment.notes),
    status: texto(payment.status),
  };
}

export function validatePaymentForm(
  values: PaymentFormValues,
  today: string = todayIso(),
): PaymentFormErrors {
  const errors: PaymentFormErrors = {};

  if (!values.description.trim()) errors.description = "Informe a descrição.";

  const amount = validateAmount(values.amount);
  if (amount) errors.amount = amount;

  const due = validateIsoDate(values.dueDate, "o vencimento");
  if (due) errors.dueDate = due;

  const paid = validatePaidDate(values.paidDate, values.isSettled, today);
  if (paid) errors.paidDate = paid;

  const parcela = validateInstallment(
    values.installmentNumber,
    values.installmentTotal,
  );
  if (parcela) errors.installmentNumber = parcela;

  return errors;
}

/**
 * Qual situação mandar.
 *
 * Igual à Carteira: a caixa manda em Pendente × Pago, e "Cancelado" só se
 * mantém enquanto ninguém marca que o dinheiro entrou.
 */
export function statusDaParcela(
  values: PaymentFormValues,
): PaymentStatusInput {
  if (values.isSettled) return PaymentStatusLabelByKey.PAGO;
  if (values.status === PaymentStatusLabelByKey.CANCELADO) {
    return PaymentStatusLabelByKey.CANCELADO;
  }
  return PaymentStatusLabelByKey.PENDENTE;
}

const opcional = (valor: string): string | undefined =>
  valor.trim() === "" ? undefined : valor.trim();

const inteiro = (valor: string): number | undefined => {
  const limpo = valor.trim();
  if (limpo === "") return undefined;
  const numero = Number(limpo);
  return Number.isInteger(numero) ? numero : undefined;
};

/**
 * Só o que mudou.
 *
 * Um PATCH que manda o registro inteiro toda vez funciona — e enche a
 * auditoria de "alterou" em campos que ninguém tocou, o que faz a trilha
 * deixar de servir para descobrir quem mexeu em quê.
 */
export function toPaymentPatch(
  values: PaymentFormValues,
  original: ClientPaymentResponse,
): ClientPaymentUpdateRequest {
  const antes = paymentFormFrom(original);
  const patch: ClientPaymentUpdateRequest = {};

  if (values.description.trim() !== antes.description.trim()) {
    patch.description = values.description.trim();
  }
  if (values.amount !== antes.amount) {
    patch.amount = parseAmountBRL(values.amount) ?? undefined;
  }
  if (values.dueDate !== antes.dueDate) patch.dueDate = values.dueDate;
  if (values.installmentNumber !== antes.installmentNumber) {
    patch.installmentNumber = inteiro(values.installmentNumber);
  }
  if (values.installmentTotal !== antes.installmentTotal) {
    patch.installmentTotal = inteiro(values.installmentTotal);
  }
  if (values.paymentMethod !== antes.paymentMethod) {
    patch.paymentMethod = opcional(values.paymentMethod) as
      | PaymentMethodInput
      | undefined;
  }
  if (values.notes !== antes.notes) patch.notes = opcional(values.notes);

  const status = statusDaParcela(values);
  const statusAntes = statusDaParcela(antes);
  if (status !== statusAntes) {
    patch.status = status;
    // Só acompanha o status quando ele muda: mandar paidDate sozinho, com a
    // situação intacta, é o caminho de "pendente com data de pagamento".
    if (status === PaymentStatusLabelByKey.PAGO) {
      patch.paidDate = values.paidDate || todayIso();
    }
  } else if (
    status === PaymentStatusLabelByKey.PAGO &&
    values.paidDate !== antes.paidDate
  ) {
    // Continua paga, só corrigiram a data do recebimento.
    patch.paidDate = values.paidDate || todayIso();
  }

  return patch;
}

/** Nada mudou: não vale requisição, nem um toast de sucesso que não houve. */
export const patchVazio = (patch: ClientPaymentUpdateRequest): boolean =>
  Object.keys(patch).length === 0;

export const temErroDeParcela = (errors: PaymentFormErrors): boolean =>
  Object.values(errors).some(Boolean);
