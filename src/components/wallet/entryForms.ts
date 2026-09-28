/**
 * Lançamento de entrada e de saída na Carteira — regras e payloads.
 *
 * Módulo puro de propósito: é aqui que mora a parte do formulário que se pode
 * conferir sem abrir o navegador. O modal só renderiza campos e chama serviço;
 * validar e montar corpo de requisição são estas funções.
 *
 * ## O núcleo comum, e por que ele é um tipo
 *
 * Entrada e saída compartilham sete campos que significam a mesma coisa dos
 * dois lados: descrição, valor, vencimento, "já foi liquidado", data da
 * liquidação, forma e observações. Eles vivem em `SharedValues`, e cada lado
 * acrescenta o que é seu — cliente e parcela na entrada; fornecedor e
 * categoria na saída.
 *
 * Isso não é organização por gosto. O modal deixa trocar o tipo depois de
 * começar a digitar, e o que já foi preenchido nos campos comuns tem de
 * sobreviver à troca. Com o núcleo declarado como tipo, `carryShared` copia
 * exatamente esses campos e o compilador cobra quando um for adicionado. A
 * alternativa — uma lista de nomes escrita à mão — silenciosamente deixaria de
 * copiar o campo novo, e o sintoma seria um dado sumindo de vez em quando.
 *
 * ## O que "entrada" quer dizer aqui
 *
 * Receita do **escritório**: honorário. Não é o que o INSS paga ao cliente —
 * isso é `client_payments` e é assunto da tela de Pagamentos.
 *
 * A distinção custou caro para aparecer. As duas coisas têm o mesmo formato
 * (valor, vencimento, data de pagamento, preso a um cliente), e este
 * formulário chegou a gravar honorário em `client_payments`. Não dava erro:
 * gravava, e a tela de Pagamentos passava a somar honorário como benefício do
 * cliente, sem nada na tabela que permitisse separar depois.
 *
 * ## Estado do backend: nenhuma das duas metades existe
 *
 * - **Entrada** → `POST /api/v1/revenues`. Não existe: nem rota, nem tabela.
 * - **Saída** → `POST /api/v1/expenses`. Idem.
 *
 * As duas são o domínio `financial` do ADR-0003. Os payloads estão prontos e
 * vão 404 até ele subir.
 *
 * ## O cliente virou opcional
 *
 * Enquanto isto postava em `client_payments`, o cliente era obrigatório por
 * imposição da FK. Com tabela própria, deixa de ser: honorário de parecer
 * avulso, reembolso ou rendimento são receita sem cliente, e obrigar um
 * levaria a inventar um "cliente genérico" — que é como um cadastro apodrece.
 */

import { parseAmountBRL } from "@/lib/format";
import { todayIso } from "@/lib/period";
import { validatePaidDate } from "@/lib/validators/validators";
import type { OfficeExpenseRequest } from "@/interfaces/finance/OfficeExpense.interface";
import type { OfficeRevenueRequest } from "@/interfaces/finance/OfficeRevenue.interface";
import type { PaymentMethodInput } from "@/enums/payment/Payment";
import type { ExpenseCategoryInput } from "@/enums/expenseCategory/ExpenseCategory";

// ─────────────────────────── Valores ───────────────────────────

/** Entrada ou saída — o que o modal pergunta antes de mostrar os campos. */
export type EntryKind = "entrada" | "saida";

/** O que entrada e saída têm em comum, com o mesmo significado dos dois lados. */
export type SharedValues = {
  description: string;
  amount: string;
  dueDate: string;
  /**
   * "Já foi recebido?" na entrada, "já foi paga?" na saída — a mesma pergunta:
   * o dinheiro já se moveu? Um nome só porque é um conceito só; dois nomes
   * (`isReceived`/`isPaid`) forçariam um `if` em toda função que os tocasse.
   */
  isSettled: boolean;
  paidDate: string;
  paymentMethod: string;
  notes: string;
};

export type IncomeFormValues = SharedValues & {
  clientId: string;
  clientName: string;
  installmentNumber: string;
  installmentTotal: string;
};

export type ExpenseFormValues = SharedValues & {
  supplier: string;
  category: string;
};

const emptyShared = (): SharedValues => ({
  description: "",
  amount: "",
  dueDate: "",
  isSettled: false,
  paidDate: "",
  paymentMethod: "",
  notes: "",
});

export const emptyIncomeForm = (): IncomeFormValues => ({
  ...emptyShared(),
  clientId: "",
  clientName: "",
  installmentNumber: "",
  installmentTotal: "",
});

export const emptyExpenseForm = (): ExpenseFormValues => ({
  ...emptyShared(),
  supplier: "",
  category: "",
});

/**
 * Leva o núcleo comum de um lado para o outro ao trocar o tipo.
 *
 * Só o que significa a mesma coisa atravessa. Cliente e parcela não viram
 * fornecedor e categoria — são campos diferentes, não traduções — e ficam
 * guardados no seu próprio estado, intactos para quem voltar atrás.
 */
export const carryShared = <T extends SharedValues>(
  target: T,
  source: SharedValues,
): T => ({
  ...target,
  description: source.description,
  amount: source.amount,
  dueDate: source.dueDate,
  isSettled: source.isSettled,
  paidDate: source.paidDate,
  paymentMethod: source.paymentMethod,
  notes: source.notes,
});

// ─────────────────────────── Regras ───────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valida um valor em dinheiro digitado.
 *
 * Zero é rejeitado porque o backend rejeita (`@DecimalMin("0.01")`) — melhor
 * dizer isso no campo do que colher um 400 depois de preencher o resto.
 * Negativo idem: o sinal de uma saída está no fato de ser saída, não no
 * número. Guardar despesa como valor negativo é o começo de somas que dão
 * certo por acidente.
 */
export const validateAmount = (value: string): string | null => {
  if (!value.trim()) return "Informe o valor.";
  const parsed = parseAmountBRL(value);
  if (parsed === null) return "Valor inválido.";
  if (parsed <= 0) return "O valor deve ser maior que zero.";
  return null;
};

export const validateIsoDate = (value: string, label: string): string | null => {
  if (!value.trim()) return `Informe ${label}.`;
  if (!ISO_DATE.test(value)) return "Data inválida.";
  return null;
};


/**
 * Parcela: os dois campos andam juntos ou nenhum. `3/2` é o erro que passa
 * despercebido — o número parece plausível na tabela.
 */
export const validateInstallment = (
  current: string,
  total: string,
): string | null => {
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
};

export type FormErrors<V> = Partial<Record<keyof V, string>>;

export function validateIncomeForm(
  values: IncomeFormValues,
  today: string = todayIso(),
): FormErrors<IncomeFormValues> {
  const errors: FormErrors<IncomeFormValues> = {};

  /**
   * Cliente é opcional, mas nome digitado **sem** escolher da lista não é: o
   * texto solto não vira vínculo nenhum e sumiria no envio, dando a impressão
   * de que a receita ficou amarrada a alguém.
   */
  if (!values.clientId && values.clientName.trim()) {
    errors.clientName = "Escolha um cliente da lista ou deixe em branco.";
  }
  if (!values.description.trim()) errors.description = "Informe a descrição.";

  const amount = validateAmount(values.amount);
  if (amount) errors.amount = amount;

  const due = validateIsoDate(values.dueDate, "o vencimento");
  if (due) errors.dueDate = due;

  const installment = validateInstallment(
    values.installmentNumber,
    values.installmentTotal,
  );
  if (installment) errors.installmentNumber = installment;

  const paid = validatePaidDate(values.paidDate, values.isSettled, today);
  if (paid) errors.paidDate = paid;

  return errors;
}

export function validateExpenseForm(
  values: ExpenseFormValues,
  today: string = todayIso(),
): FormErrors<ExpenseFormValues> {
  const errors: FormErrors<ExpenseFormValues> = {};

  if (!values.description.trim()) errors.description = "Informe a descrição.";

  const amount = validateAmount(values.amount);
  if (amount) errors.amount = amount;

  const due = validateIsoDate(values.dueDate, "o vencimento");
  if (due) errors.dueDate = due;

  const paid = validatePaidDate(values.paidDate, values.isSettled, today);
  if (paid) errors.paidDate = paid;

  return errors;
}

export const hasErrors = (errors: object): boolean =>
  Object.keys(errors).length > 0;

// ─────────────────────────── Payloads ───────────────────────────

/** `""` → `undefined`, para a chave sumir do JSON em vez de virar string vazia. */
const optional = (value: string): string | undefined =>
  value.trim() === "" ? undefined : value.trim();

const optionalNumber = (value: string): number | undefined =>
  value.trim() === "" ? undefined : Number(value);

/**
 * Corpo do `POST /api/v1/revenues` — a receita do escritório.
 *
 * Uma requisição só, diferente do lado de Pagamentos: aqui a data de
 * recebimento vai junto, porque o contrato é nosso e não tem a restrição do
 * `ClientPaymentRequestDTO` (que não aceita `paidDate` e obriga a um PATCH
 * depois).
 */
export function toRevenueRequest(values: IncomeFormValues): OfficeRevenueRequest {
  return {
    description: values.description.trim(),
    amount: parseAmountBRL(values.amount) ?? 0,
    dueDate: values.dueDate,
    paidDate: values.isSettled ? values.paidDate || todayIso() : undefined,
    paymentMethod: optional(values.paymentMethod) as
      | PaymentMethodInput
      | undefined,
    clientId: optional(values.clientId),
    notes: optional(values.notes),
  };
}

/** Corpo do `POST /api/v1/expenses` — a rota que ainda não existe. */
export function toExpenseRequest(values: ExpenseFormValues): OfficeExpenseRequest {
  return {
    description: values.description.trim(),
    amount: parseAmountBRL(values.amount) ?? 0,
    dueDate: values.dueDate,
    paidDate: values.isSettled ? values.paidDate || todayIso() : undefined,
    category: optional(values.category) as ExpenseCategoryInput | undefined,
    paymentMethod: optional(values.paymentMethod) as
      | PaymentMethodInput
      | undefined,
    supplier: optional(values.supplier),
    notes: optional(values.notes),
  };
}

/**
 * Reexportados por conveniência: os dois nasceram aqui e foram para lugares
 * neutros quando a tela de Pagamentos passou a precisar deles — um módulo de
 * `payments` importando de `wallet` seria dependência na direção errada.
 */
export { todayIso, validatePaidDate };
