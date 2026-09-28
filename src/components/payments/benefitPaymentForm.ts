/**
 * Lançamento de um valor que o cliente tem a receber do INSS.
 *
 * ## Que dinheiro é este
 *
 * É o que o INSS paga **ao cliente**: atrasados da concessão, o benefício
 * mensal, a parcela de um acordo. Não é honorário — honorário é receita do
 * escritório e mora na Carteira.
 *
 * A distinção parece óbvia escrita assim, e não é na tela: os dois são "um
 * valor com vencimento e data de pagamento preso a um cliente", que é
 * exatamente o formato de `client_payments`. A tabela não distingue; o
 * significado vem de quem escreve nela. Por isso este módulo existe separado
 * do de lançamento da Carteira, mesmo os dois montando um `ClientPaymentRequest`
 * — se fossem o mesmo formulário, nada impediria lançar honorário aqui.
 *
 * ## O que ficou de fora, de propósito
 *
 * `paymentMethod`. O DTO aceita, mas as opções são Pix, boleto, cartão,
 * dinheiro — formas de alguém pagar. O INSS credita em conta; oferecer
 * "boleto" aqui seria um campo que só produz resposta errada.
 */

import { parseAmountBRL } from "@/lib/format";
import { todayIso } from "@/lib/period";
import { validatePaidDate } from "@/lib/validators/validators";
import type {
  ClientPaymentRequest,
  ClientPaymentUpdateRequest,
} from "@/interfaces/client/ClientSubResources.interface";

export type BenefitPaymentValues = {
  clientId: string;
  clientName: string;
  description: string;
  amount: string;
  /** Data prevista do crédito — `dueDate` no backend. */
  expectedDate: string;
  installmentNumber: string;
  installmentTotal: string;
  /** O cliente já recebeu? Decide se há um PATCH depois do POST. */
  isReceived: boolean;
  receivedDate: string;
  notes: string;
};

export const emptyBenefitPayment = (): BenefitPaymentValues => ({
  clientId: "",
  clientName: "",
  description: "",
  amount: "",
  expectedDate: "",
  installmentNumber: "",
  installmentTotal: "",
  isReceived: false,
  receivedDate: "",
  notes: "",
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type BenefitPaymentErrors = Partial<
  Record<keyof BenefitPaymentValues, string>
>;

export function validateBenefitPayment(
  values: BenefitPaymentValues,
  today: string = todayIso(),
): BenefitPaymentErrors {
  const errors: BenefitPaymentErrors = {};

  // Sem `clientId` não há URL para onde postar: `client_payments` pendura em
  // `clients` por FK. O nome digitado não basta.
  if (!values.clientId) {
    errors.clientName = values.clientName.trim()
      ? "Escolha um cliente da lista."
      : "Informe o cliente.";
  }

  if (!values.description.trim()) errors.description = "Informe a descrição.";

  if (!values.amount.trim()) {
    errors.amount = "Informe o valor.";
  } else {
    const parsed = parseAmountBRL(values.amount);
    if (parsed === null) errors.amount = "Valor inválido.";
    // `@DecimalMin("0.01")` no backend — melhor dizer aqui do que colher um 400.
    else if (parsed <= 0) errors.amount = "O valor deve ser maior que zero.";
  }

  if (!values.expectedDate.trim()) {
    errors.expectedDate = "Informe a data prevista.";
  } else if (!ISO_DATE.test(values.expectedDate)) {
    errors.expectedDate = "Data inválida.";
  }

  const installment = validateInstallment(
    values.installmentNumber,
    values.installmentTotal,
  );
  if (installment) errors.installmentNumber = installment;

  const received = validatePaidDate(values.receivedDate, values.isReceived, today);
  if (received) errors.receivedDate = received;

  return errors;
}

/**
 * Parcela: os dois campos andam juntos ou nenhum. Atrasados costumam vir
 * parcelados, e `3/2` é o erro que passa despercebido — parece plausível na
 * tabela.
 */
export function validateInstallment(
  current: string,
  total: string,
): string | null {
  const hasCurrent = current.trim() !== "";
  const hasTotal = total.trim() !== "";
  if (!hasCurrent && !hasTotal) return null;
  if (!hasCurrent || !hasTotal) return "Preencha parcela e total.";

  const currentNumber = Number(current);
  const totalNumber = Number(total);
  if (!Number.isInteger(currentNumber) || !Number.isInteger(totalNumber)) {
    return "Use números inteiros.";
  }
  if (currentNumber < 1 || totalNumber < 1) return "A parcela começa em 1.";
  if (currentNumber > totalNumber) {
    return "A parcela não pode ser maior que o total.";
  }
  return null;
}

export const hasErrors = (errors: object): boolean =>
  Object.keys(errors).length > 0;

const optionalNumber = (value: string): number | undefined =>
  value.trim() === "" ? undefined : Number(value);

const optional = (value: string): string | undefined =>
  value.trim() === "" ? undefined : value.trim();

/**
 * Corpo do `POST /clients/{clientId}/payments`.
 *
 * Sem `paidDate` e sem `status` — o DTO do POST não os tem, e a parcela
 * "sempre nasce como PENDENTE". Mandar chave desconhecida não faria o backend
 * aceitar: faria o Jackson ignorar em silêncio, que é pior, porque a tela
 * pareceria ter gravado a data.
 */
export function toBenefitPaymentRequest(
  values: BenefitPaymentValues,
): ClientPaymentRequest {
  return {
    description: values.description.trim(),
    amount: parseAmountBRL(values.amount) ?? 0,
    dueDate: values.expectedDate,
    installmentNumber: optionalNumber(values.installmentNumber),
    installmentTotal: optionalNumber(values.installmentTotal),
    notes: optional(values.notes),
  };
}

/** Segundo passo, quando o cliente já recebeu: `PATCH .../{paymentId}`. */
export function toBenefitReceivedPatch(
  values: BenefitPaymentValues,
): ClientPaymentUpdateRequest | null {
  if (!values.isReceived) return null;
  return {
    status: "PAGO",
    paidDate: values.receivedDate || todayIso(),
  };
}
