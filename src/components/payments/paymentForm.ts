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
import {
  defineSection,
  initialValues,
  rulesOf,
  validateValues,
  type FieldRules,
  type SectionValues,
} from "@/components/ui/form/schema";
import {
  paidDateRule,
  sharedEntryFields,
  validateInstallment,
} from "@/components/wallet/entryForms";
import { todayIso } from "@/lib/period";
import {
  PaymentStatusLabelByKey,
  getPaymentMethodKeyByLabel,
} from "@/enums/payment/Payment";
import type {
  ClientPaymentResponse,
  ClientPaymentUpdateRequest,
} from "@/interfaces/client/ClientSubResources.interface";
import type {
  PaymentMethodInput,
  PaymentStatusInput,
} from "@/enums/payment/Payment";

/**
 * Os campos da parcela: o mesmo núcleo da Carteira — descrição, valor,
 * vencimento, "já foi recebido", data, forma e observações — mais o que só
 * existe aqui.
 *
 * Reusar `sharedEntryFields` não é economia de linhas: é o que garante que a
 * parcela e o lançamento validem o valor do mesmo jeito. Duas declarações
 * divergiriam no dia em que uma ganhasse uma regra e a outra não.
 */
export const paymentSchema = defineSection({
  ...sharedEntryFields({
    descriptionPlaceholder: "Atrasados da concessão, benefício de março…",
    paymentMethodLabel: "Forma de recebimento",
    settledLabel: "Já foi recebido",
    settledDateLabel: "Data do recebimento",
  }),
  /*
   * Parcela é do contrato do cliente, não do caixa do escritório. Os dois
   * campos andam juntos — "3/2" é o erro que passa despercebido porque parece
   * plausível na tabela —, e a regra fica no primeiro, que é onde o aviso
   * precisa aparecer.
   */
  installmentNumber: {
    kind: "digits",
    label: "Parcela",
    rule: (value: string, values: Record<string, string | boolean>) =>
      validateInstallment(value, String(values.installmentTotal ?? "")),
  },
  installmentTotal: { kind: "digits", label: "Total de parcelas" },
});

export type PaymentFormValues = SectionValues<typeof paymentSchema> & {
  /** Situação atual em rótulo, para preservar "Cancelado". */
  status: string;
};

/** Os valores de uma parcela nova — tudo vazio, nada recebido. */
export const emptyPaymentForm = (): PaymentFormValues => ({
  ...initialValues(paymentSchema),
  status: "",
});

/**
 * As regras da parcela: as do schema, mais a da data do recebimento, que
 * depende da caixa ao lado e do dia de hoje.
 */
export const paymentRules = (
  today: string = todayIso(),
): FieldRules<PaymentFormValues> => ({
  ...rulesOf(paymentSchema),
  paidDate: paidDateRule(today),
});

export type PaymentFormErrors = Partial<
  Record<keyof PaymentFormValues, string>
>;

const text = (valor: string | undefined | null): string => valor ?? "";

const numberText = (valor: number | undefined | null): string =>
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
    ...emptyPaymentForm(),
    description: text(payment.description),
    amount: amountToInput(payment.amount),
    installmentNumber: numberText(payment.installmentNumber),
    installmentTotal: numberText(payment.installmentTotal),
    dueDate: text(payment.dueDate),
    // Do status, nunca da data: uma parcela cancelada pode ter paidDate de
    // antes do cancelamento, e ler a data a reabriria como recebida.
    isSettled: payment.status === PaymentStatusLabelByKey.PAGO,
    paidDate: text(payment.paidDate),
    // A API devolve o rótulo ("Boleto"); o select trabalha com a chave
    // ("BOLETO"). Sem converter, o campo abria em "Selecione" numa parcela
    // que tem forma — o mesmo `toKey` do `incomeFormFrom` da Carteira.
    paymentMethod: payment.paymentMethod
      ? (getPaymentMethodKeyByLabel(payment.paymentMethod) ??
        payment.paymentMethod)
      : "",
    notes: text(payment.notes),
    status: text(payment.status),
  };
}

export function validatePaymentForm(
  values: PaymentFormValues,
  today: string = todayIso(),
): PaymentFormErrors {
  return validateValues(paymentRules(today), values);
}

/**
 * Qual situação mandar.
 *
 * Igual à Carteira: a caixa manda em Pendente × Pago, e "Cancelado" só se
 * mantém enquanto ninguém marca que o dinheiro entrou.
 */
export function installmentStatus(values: PaymentFormValues): PaymentStatusInput {
  if (values.isSettled) return PaymentStatusLabelByKey.PAGO;
  if (values.status === PaymentStatusLabelByKey.CANCELADO) {
    return PaymentStatusLabelByKey.CANCELADO;
  }
  return PaymentStatusLabelByKey.PENDENTE;
}

const optional = (valor: string): string | undefined =>
  valor.trim() === "" ? undefined : valor.trim();

const whole = (valor: string): number | undefined => {
  const clean = valor.trim();
  if (clean === "") return undefined;
  const numero = Number(clean);
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
    patch.installmentNumber = whole(values.installmentNumber);
  }
  if (values.installmentTotal !== antes.installmentTotal) {
    patch.installmentTotal = whole(values.installmentTotal);
  }
  if (values.paymentMethod !== antes.paymentMethod) {
    patch.paymentMethod = optional(values.paymentMethod) as
      PaymentMethodInput | undefined;
  }
  if (values.notes !== antes.notes) patch.notes = optional(values.notes);

  const status = installmentStatus(values);
  const statusBefore = installmentStatus(antes);
  if (status !== statusBefore) {
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
export const emptyPatch = (patch: ClientPaymentUpdateRequest): boolean =>
  Object.keys(patch).length === 0;

