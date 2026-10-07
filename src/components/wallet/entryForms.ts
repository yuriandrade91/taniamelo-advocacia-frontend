/**
 * Lançamento de entrada e de saída na Carteira — campos, regras e payloads.
 *
 * Módulo puro de propósito: é aqui que mora a parte do formulário que se pode
 * conferir sem abrir o navegador. A tela só desenha o schema e chama serviço;
 * descrever campo, validar e montar corpo de requisição são estas funções.
 *
 * ## O núcleo comum, e por que ele é um schema
 *
 * Entrada e saída compartilham sete campos que significam a mesma coisa dos
 * dois lados: descrição, valor, vencimento, "já foi liquidado", data da
 * liquidação, forma e observações. Eles são declarados uma vez em
 * `sharedEntryFields` — rótulo, obrigatoriedade, máscara e validador — e cada
 * lado acrescenta o que é seu: cliente na entrada; fornecedor e categoria na
 * saída. A parcela a receber (`payments/paymentForm`) monta o dela a partir do
 * mesmo núcleo.
 *
 * O que muda entre os lados são três rótulos, que vêm por parâmetro:
 * "recebido" e "pago" são a mesma pergunta com palavras diferentes.
 *
 * Isso não é organização por gosto. O modal deixa trocar o tipo depois de
 * começar a digitar, e o que já foi preenchido nos campos comuns tem de
 * sobreviver à troca. Com o núcleo declarado uma vez, `carryShared` copia
 * exatamente esses campos e os tipos saem do schema. A alternativa — dois
 * formulários escritos à mão — divergiria num `placeholder` melhor de um lado
 * só, e ninguém perceberia porque nunca se vê os dois na mesma tela.
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

import {
  defineSection,
  initialValues,
  rulesOf,
  validateValues,
  type FieldRules,
  type SectionValues,
} from "@/components/ui/form/schema";
import { toSelectOptions } from "@/components/ui/form/options";
import { parseAmountBRL } from "@/lib/format";
import { todayIso } from "@/lib/period";
import { validatePaidDate } from "@/lib/validators";
import type {
  OfficeExpenseRequest,
  OfficeExpenseResponse,
} from "@/interfaces/finance/OfficeExpense.interface";
import type {
  OfficeRevenueRequest,
  OfficeRevenueResponse,
} from "@/interfaces/finance/OfficeRevenue.interface";
import {
  PaymentMethodOptions,
  PaymentStatusLabelByKey,
  getPaymentMethodKeyByLabel,
  type PaymentMethodInput,
  type PaymentStatusInput,
} from "@/enums/payment/Payment";
import {
  ExpenseCategoryOptions,
  getExpenseCategoryKeyByLabel,
  type ExpenseCategoryInput,
} from "@/enums/expenseCategory/ExpenseCategory";

// ─────────────────────────── Campos ───────────────────────────

/** Entrada ou saída — o que o modal pergunta antes de mostrar os campos. */
export type EntryKind = "entrada" | "saida";

/**
 * Os rótulos que mudam de lado. "Já foi recebido?" e "Já foi paga?" são a
 * mesma pergunta — o dinheiro já se moveu? — e vêm por parâmetro para que o
 * núcleo não precise saber que tipos de lançamento existem.
 */
export type EntryTexts = {
  descriptionPlaceholder: string;
  paymentMethodLabel: string;
  settledLabel: string;
  settledDateLabel: string;
};

/**
 * Os sete campos comuns a entrada, saída e parcela a receber.
 *
 * `paidDate` não traz regra: a dela depende da caixa ao lado (e do dia de
 * hoje), e mora no construtor de regras de cada lado — `incomeRules`,
 * `expenseRules`, `paymentRules`.
 */
export const sharedEntryFields = (texts: EntryTexts) =>
  defineSection({
    description: {
      kind: "text",
      label: "Descrição",
      required: true,
      placeholder: texts.descriptionPlaceholder,
    },
    amount: { kind: "amount", label: "Valor", required: true },
    dueDate: {
      kind: "date",
      label: "Vencimento",
      required: true,
      // Vencer no futuro é o caso normal — é o que "a vencer" significa.
      allowFuture: true,
    },
    paymentMethod: {
      kind: "select",
      label: texts.paymentMethodLabel,
      placeholder: "Selecione",
      options: toSelectOptions(PaymentMethodOptions),
    },
    isSettled: { kind: "switch", label: texts.settledLabel },
    paidDate: { kind: "date", label: texts.settledDateLabel },
    /*
     * O teto é da tela, não do backend (o DTO não declara `@Size`): 500
     * caracteres é o que cabe sem a observação virar um relato — e o contador
     * aparece para quem chega perto, não para quem escreve duas linhas.
     */
    notes: { kind: "textarea", label: "Observações", rows: 3, maxLength: 500 },
  });

/** Honorário do escritório. */
export const incomeSchema = sharedEntryFields({
  descriptionPlaceholder: "Honorários — 30% dos atrasados",
  paymentMethodLabel: "Forma de recebimento",
  settledLabel: "Já foi recebido?",
  settledDateLabel: "Data do recebimento",
});

/** Despesa do escritório — mais categoria e fornecedor, opcionais no contrato. */
export const expenseSchema = defineSection({
  ...sharedEntryFields({
    descriptionPlaceholder: "Aluguel da sala — setembro",
    paymentMethodLabel: "Forma de pagamento",
    settledLabel: "Já foi paga?",
    settledDateLabel: "Data do pagamento",
  }),
  category: {
    kind: "select",
    label: "Categoria",
    placeholder: "Selecione",
    options: toSelectOptions(ExpenseCategoryOptions),
  },
  supplier: {
    kind: "text",
    label: "Fornecedor",
    placeholder: "Imobiliária Central",
  },
});

// ─────────────────────────── Valores ───────────────────────────

/**
 * O que entrada e saída têm em comum, com o mesmo significado dos dois lados:
 * os campos do núcleo, mais a situação, que não é campo de tela.
 */
export type SharedValues = SectionValues<ReturnType<typeof sharedEntryFields>> & {
  /**
   * Situação atual, em rótulo ("Pendente" | "Pago" | "Cancelado"). Vazia em
   * lançamento novo.
   *
   * Existe por causa da edição. O PUT das duas rotas **substitui o registro
   * inteiro**: omitir o status faz o servidor voltar para Pendente. Sem
   * guardar o que era, corrigir a descrição de uma despesa cancelada a
   * ressuscitaria como despesa a pagar, silenciosamente, no total do mês.
   */
  status: string;
};

/**
 * A entrada acrescenta o cliente, que é um só campo na tela e dois no estado
 * — o combo grava o nome que aparece e o id que vai no corpo. Por isso ele
 * fica fora do schema: `SchemaField` escreve um valor, não dois.
 */
export type IncomeFormValues = SharedValues & {
  clientId: string;
  clientName: string;
};

export type ExpenseFormValues = SharedValues &
  SectionValues<Pick<typeof expenseSchema, "category" | "supplier">>;

export const emptyIncomeForm = (): IncomeFormValues => ({
  ...initialValues(incomeSchema),
  status: "",
  clientId: "",
  clientName: "",
});

export const emptyExpenseForm = (): ExpenseFormValues => ({
  ...initialValues(expenseSchema),
  status: "",
});

/**
 * Leva o núcleo comum de um lado para o outro ao trocar o tipo.
 *
 * Só o que significa a mesma coisa atravessa. Cliente não vira fornecedor —
 * são campos diferentes, não traduções — e fica guardado no seu próprio
 * estado, intacto para quem voltar atrás.
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
  status: source.status,
});

// ─────────────────────────── Regras ───────────────────────────

/**
 * Parcela: os dois campos andam juntos ou nenhum. `3/2` é o erro que passa
 * despercebido — o número parece plausível na tabela.
 *
 * Mora aqui, e não em `payments`, porque é a regra do par de campos e não da
 * tela: a Carteira não mostra parcela hoje, mas a regra é a mesma se mostrar.
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

/**
 * A regra da data de liquidação, que o schema não alcança: ela só é exigida
 * quando a caixa ao lado está marcada, e "futuro" se mede contra um dia que o
 * teste precisa poder fixar.
 */
export const paidDateRule =
  <V extends SharedValues>(today: string) =>
  (value: string, values: V): string | null =>
    validatePaidDate(value, values.isSettled, today);

export type FormErrors<V> = Partial<Record<keyof V, string>>;

/**
 * As regras da entrada: as do schema, mais as duas que ele não descreve — a
 * data da liquidação e o cliente.
 */
export const incomeRules = (
  today: string = todayIso(),
): FieldRules<IncomeFormValues> => ({
  ...rulesOf(incomeSchema),
  paidDate: paidDateRule(today),
  /**
   * Cliente é opcional, mas nome digitado **sem** escolher da lista não é: o
   * texto solto não vira vínculo nenhum e sumiria no envio, dando a impressão
   * de que a receita ficou amarrada a alguém.
   */
  clientName: (value, values) =>
    !values.clientId && value.trim()
      ? "Escolha um cliente da lista ou deixe em branco."
      : null,
});

export const expenseRules = (
  today: string = todayIso(),
): FieldRules<ExpenseFormValues> => ({
  ...rulesOf(expenseSchema),
  paidDate: paidDateRule(today),
});

/**
 * As mesmas regras que o formulário usa, de uma vez sobre os valores — é por
 * aqui que o teste confere o que a tela vai cobrar, sem montar React.
 */
export function validateIncomeForm(
  values: IncomeFormValues,
  today: string = todayIso(),
): FormErrors<IncomeFormValues> {
  return validateValues(incomeRules(today), values);
}

export function validateExpenseForm(
  values: ExpenseFormValues,
  today: string = todayIso(),
): FormErrors<ExpenseFormValues> {
  return validateValues(expenseRules(today), values);
}

// ─────────────────────────── Payloads ───────────────────────────

/** `""` → `undefined`, para a chave sumir do JSON em vez de virar string vazia. */
const optional = (value: string): string | undefined =>
  value.trim() === "" ? undefined : value.trim();

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
    status: statusDoLancamento(values),
    paidDate: values.isSettled ? values.paidDate || todayIso() : undefined,
    paymentMethod: optional(values.paymentMethod) as
      | PaymentMethodInput
      | undefined,
    clientId: optional(values.clientId),
    notes: optional(values.notes),
  };
}

/** Corpo do `PUT`/`POST` de `/api/v1/expenses`. */
export function toExpenseRequest(values: ExpenseFormValues): OfficeExpenseRequest {
  return {
    description: values.description.trim(),
    amount: parseAmountBRL(values.amount) ?? 0,
    dueDate: values.dueDate,
    status: statusDoLancamento(values),
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


// ───────────────────── Situação, e o cuidado com o PUT ─────────────────────

/**
 * Qual situação mandar no corpo.
 *
 * A caixa "já foi recebido/pago" é a fonte da verdade para Pendente × Pago:
 * ela é o que a pessoa acabou de decidir na tela. **Cancelado é a exceção** —
 * não tem caixa que o represente, e o PUT substitui o registro inteiro; sem
 * preservá-lo, editar a descrição de um lançamento cancelado o devolveria para
 * "a pagar" e ele voltaria a somar no total do mês sem ninguém ter pedido.
 *
 * Marcar "já foi liquidado" num cancelado é uma decisão explícita e ganha:
 * quem marcou está dizendo que o dinheiro se moveu.
 */
export function statusDoLancamento(values: SharedValues): PaymentStatusInput {
  if (values.isSettled) return PaymentStatusLabelByKey.PAGO;
  if (values.status === PaymentStatusLabelByKey.CANCELADO) {
    return PaymentStatusLabelByKey.CANCELADO;
  }
  return PaymentStatusLabelByKey.PENDENTE;
}

/** Um lançamento cancelado não volta sozinho — a tela avisa em vez de esconder. */
export const estaCancelado = (values: SharedValues): boolean =>
  values.status === PaymentStatusLabelByKey.CANCELADO;

// ───────────────────── Da resposta para o formulário ─────────────────────

/**
 * A API devolve **rótulos** (`@JsonValue`: "Cartão", "Marketing e captação");
 * os selects do formulário trabalham com a **chave** do enum. Sem converter,
 * a edição abria com Forma e Categoria em "Selecione" — o valor continuava no
 * estado e ia no PUT, mas a tela dizia que ele não existia.
 *
 * Valor que já é chave (ou desconhecido) passa como está.
 */
const toKey = (
  value: string | undefined | null,
  keyByLabel: (label?: string) => string | undefined,
): string => (value ? (keyByLabel(value) ?? value) : "");

/**
 * Preenche o formulário a partir do que o servidor devolveu.
 *
 * `isSettled` sai do **status**, não da presença de `paidDate`: um lançamento
 * cancelado pode ter data de pagamento de antes do cancelamento, e ler a data
 * faria a edição reabri-lo como pago.
 */
export function incomeFormFrom(
  revenue: OfficeRevenueResponse,
): IncomeFormValues {
  return {
    ...emptyIncomeForm(),
    description: revenue.description ?? "",
    amount: formatAmountInput(revenue.amount),
    dueDate: revenue.dueDate ?? "",
    isSettled: revenue.status === PaymentStatusLabelByKey.PAGO,
    paidDate: revenue.paidDate ?? "",
    paymentMethod: toKey(revenue.paymentMethod, getPaymentMethodKeyByLabel),
    notes: revenue.notes ?? "",
    status: revenue.status ?? "",
    clientId: revenue.clientId ?? "",
    clientName: revenue.clientName ?? "",
  };
}

export function expenseFormFrom(
  expense: OfficeExpenseResponse,
): ExpenseFormValues {
  return {
    ...emptyExpenseForm(),
    description: expense.description ?? "",
    amount: formatAmountInput(expense.amount),
    dueDate: expense.dueDate ?? "",
    isSettled: expense.status === PaymentStatusLabelByKey.PAGO,
    paidDate: expense.paidDate ?? "",
    paymentMethod: toKey(expense.paymentMethod, getPaymentMethodKeyByLabel),
    notes: expense.notes ?? "",
    status: expense.status ?? "",
    supplier: expense.supplier ?? "",
    category: toKey(expense.category, getExpenseCategoryKeyByLabel),
  };
}

/**
 * Número do servidor para o texto do campo de valor.
 *
 * Vírgula decimal e sem separador de milhar: é o que o `AmountField` lê de
 * volta com `parseAmountBRL`. Formatar como "1.234,56" aqui faria o campo
 * mostrar certo e o `parse` devolver 1234 na hora de salvar.
 */
export function formatAmountInput(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return "";
  return amount.toFixed(2).replace(".", ",");
}
