import { describe, expect, it } from "vitest";
import {
  carryShared,
  emptyExpenseForm,
  emptyIncomeForm,
  isCancelled,
  expenseFormFrom,
  formatAmountInput,
  incomeFormFrom,
  entryStatus,
  toExpenseRequest,
  toRevenueRequest,
  validateExpenseForm,
  validateIncomeForm,
  validateInstallment,
  validatePaidDate,
  type IncomeFormValues,
} from "./entryForms";
import { parseAmountBRL } from "@/lib/format";
import type { OfficeRevenueResponse } from "@/interfaces/finance/OfficeRevenue.interface";

const TODAY = "2026-09-03";

describe("validatePaidDate", () => {
  it("não exige nada quando não foi liquidado", () => {
    expect(validatePaidDate("", false, TODAY)).toBeNull();
  });

  it("exige a data quando foi liquidado", () => {
    expect(validatePaidDate("", true, TODAY)).not.toBeNull();
  });

  it("recusa data futura — é o que faz o caixa contar dinheiro parado", () => {
    expect(validatePaidDate("2026-09-04", true, TODAY)).not.toBeNull();
    expect(validatePaidDate("2026-09-03", true, TODAY)).toBeNull();
    expect(validatePaidDate("2026-08-31", true, TODAY)).toBeNull();
  });
});

describe("validateInstallment", () => {
  it("aceita ambos vazios", () => {
    expect(validateInstallment("", "")).toBeNull();
  });

  it("recusa só um preenchido", () => {
    expect(validateInstallment("2", "")).toBe("Preencha parcela e total.");
    expect(validateInstallment("", "12")).toBe("Preencha parcela e total.");
  });

  it("recusa parcela maior que o total", () => {
    expect(validateInstallment("3", "2")).toBe(
      "A parcela não pode ser maior que o total.",
    );
    expect(validateInstallment("2", "12")).toBeNull();
  });

  it("recusa zero e fracionário", () => {
    expect(validateInstallment("0", "3")).toBe("A parcela começa em 1.");
    expect(validateInstallment("1,5", "3")).toBe("Use números inteiros.");
    expect(validateInstallment("1.5", "3")).toBe("Use números inteiros.");
  });
});

describe("validateIncomeForm", () => {
  const filled = () => ({
    ...emptyIncomeForm(),
    clientId: "c-1",
    clientName: "Maria",
    description: "Honorários",
    amount: "1.500,00",
    dueDate: "2026-09-10",
  });

  it("aceita o mínimo do backend", () => {
    expect(validateIncomeForm(filled(), TODAY)).toEqual({});
  });

  it("aceita receita sem cliente — nem toda entrada vem de um", () => {
    const errors = validateIncomeForm(
      { ...filled(), clientId: "", clientName: "" },
      TODAY,
    );
    expect(errors.clientName).toBeUndefined();
  });

  it("recusa nome digitado sem escolher da lista: o texto solto sumiria no envio", () => {
    const errors = validateIncomeForm(
      { ...filled(), clientId: "", clientName: "Maria" },
      TODAY,
    );
    expect(errors.clientName).toBeDefined();
  });

  it("exige data quando marcado como recebido", () => {
    const errors = validateIncomeForm({ ...filled(), isSettled: true }, TODAY);
    expect(errors.paidDate).toBeDefined();
  });
});

describe("toRevenueRequest", () => {
  it("leva a data de recebimento junto — receita nossa não precisa de PATCH", () => {
    const body = toRevenueRequest({
      ...emptyIncomeForm(),
      description: "Honorários",
      amount: "1.500,00",
      dueDate: "2026-09-10",
      isSettled: true,
      paidDate: "2026-09-01",
    });
    expect(body.amount).toBe(1500);
    expect(body.paidDate).toBe("2026-09-01");
  });

  it("não manda paidDate quando ainda não foi recebida", () => {
    const body = toRevenueRequest({
      ...emptyIncomeForm(),
      description: "Honorários",
      amount: "1.500,00",
      dueDate: "2026-09-10",
    });
    expect(body.paidDate).toBeUndefined();
  });

  it("omite os opcionais vazios em vez de mandar string vazia", () => {
    const body = toRevenueRequest({
      ...emptyIncomeForm(),
      description: "X",
      amount: "10",
      dueDate: "2026-09-10",
    });
    expect(body.paymentMethod).toBeUndefined();
    expect(body.clientId).toBeUndefined();
    expect(body.notes).toBeUndefined();
  });
});

describe("toExpenseRequest", () => {
  it("só manda paidDate quando a despesa foi paga", () => {
    const pending = toExpenseRequest({
      ...emptyExpenseForm(),
      description: "Aluguel",
      amount: "3.200",
      dueDate: "2026-09-05",
    });
    expect(pending.paidDate).toBeUndefined();
    expect(pending.amount).toBe(3200);

    const paid = toExpenseRequest({
      ...emptyExpenseForm(),
      description: "Aluguel",
      amount: "3.200",
      dueDate: "2026-09-05",
      isSettled: true,
      paidDate: "2026-09-05",
    });
    expect(paid.paidDate).toBe("2026-09-05");
  });
});

describe("validateExpenseForm", () => {
  it("não exige categoria nem fornecedor — são opcionais no contrato", () => {
    expect(
      validateExpenseForm(
        {
          ...emptyExpenseForm(),
          description: "Aluguel",
          amount: "3.200",
          dueDate: "2026-09-05",
        },
        TODAY,
      ),
    ).toEqual({});
  });
});

describe("carryShared", () => {
  const filled = (): IncomeFormValues => ({
    ...emptyIncomeForm(),
    clientId: "c-1",
    clientName: "Maria",
    description: "Honorários",
    amount: "1.500,00",
    dueDate: "2026-09-10",
    isSettled: true,
    paidDate: "2026-09-01",
    paymentMethod: "PIX",
    notes: "combinado em reunião",
  });

  it("leva os sete campos comuns para o outro tipo", () => {
    const expense = carryShared(emptyExpenseForm(), filled());
    expect(expense.description).toBe("Honorários");
    expect(expense.amount).toBe("1.500,00");
    expect(expense.dueDate).toBe("2026-09-10");
    expect(expense.isSettled).toBe(true);
    expect(expense.paidDate).toBe("2026-09-01");
    expect(expense.paymentMethod).toBe("PIX");
    expect(expense.notes).toBe("combinado em reunião");
  });

  it("não inventa tradução entre campos próprios de cada tipo", () => {
    const expense = carryShared(emptyExpenseForm(), filled());
    // Cliente não vira fornecedor: são coisas diferentes, não sinônimos.
    expect(expense.supplier).toBe("");
    expect(expense.category).toBe("");
  });

  it("preserva o que o destino já tinha nos campos próprios", () => {
    const expense = { ...emptyExpenseForm(), supplier: "Imobiliária", category: "ALUGUEL" };
    const after = carryShared(expense, filled());
    expect(after.supplier).toBe("Imobiliária");
    expect(after.category).toBe("ALUGUEL");
  });

  it("é reversível: voltar não perde o que era do outro lado", () => {
    const income = filled();
    const expense = carryShared(
      { ...emptyExpenseForm(), supplier: "Imobiliária" },
      income,
    );
    const backAgain = carryShared(income, expense);
    expect(backAgain.clientId).toBe("c-1");
    expect(backAgain.clientName).toBe("Maria");
  });
});

// ───────────── Edição: o que o PUT apagaria se ninguém cuidasse ─────────────

describe("statusDoLancamento", () => {
  const base = { ...emptyExpenseForm() };

  it("não liquidado vira Pendente", () => {
    expect(entryStatus({ ...base, isSettled: false })).toBe("Pendente");
  });

  it("liquidado vira Pago", () => {
    expect(entryStatus({ ...base, isSettled: true })).toBe("Pago");
  });

  it("cancelado continua cancelado — o PUT substitui o registro inteiro", () => {
    // Sem isto, corrigir a descrição de um lançamento cancelado o devolveria
    // para "a pagar" e ele voltaria a somar no total do mês.
    expect(
      entryStatus({ ...base, status: "Cancelado", isSettled: false }),
    ).toBe("Cancelado");
  });

  it("marcar liquidado num cancelado reabre como Pago — é decisão explícita", () => {
    expect(
      entryStatus({ ...base, status: "Cancelado", isSettled: true }),
    ).toBe("Pago");
  });

  it("um Pago que perde a marcação volta a Pendente, não fica Pago", () => {
    expect(
      entryStatus({ ...base, status: "Pago", isSettled: false }),
    ).toBe("Pendente");
  });
});

describe("o status vai no corpo das duas rotas", () => {
  it("receita leva status — omiti-lo faz o servidor voltar para Pendente", () => {
    const body = toRevenueRequest({
      ...emptyIncomeForm(),
      description: "Honorário",
      amount: "1.200,00",
      dueDate: "2026-03-10",
      status: "Cancelado",
    });
    expect(body.status).toBe("Cancelado");
  });

  it("despesa idem", () => {
    const body = toExpenseRequest({
      ...emptyExpenseForm(),
      description: "Aluguel",
      amount: "3.000,00",
      dueDate: "2026-03-05",
      isSettled: true,
      paidDate: "2026-03-05",
    });
    expect(body.status).toBe("Pago");
  });
});

describe("incomeFormFrom", () => {
  const revenue: OfficeRevenueResponse = {
    id: "r-1",
    description: "Honorário de êxito",
    amount: 1234.5,
    status: "Pago",
    paymentMethod: "Pix",
    dueDate: "2026-03-10",
    paidDate: "2026-03-12",
    overdue: false,
    clientId: "c-1",
    clientName: "Maria Silva",
    notes: "30% dos atrasados",
  };

  it("traz o registro para o formulário sem perder nada editável", () => {
    expect(incomeFormFrom(revenue)).toMatchObject({
      description: "Honorário de êxito",
      amount: "1234,50",
      dueDate: "2026-03-10",
      paidDate: "2026-03-12",
      // A API manda o rótulo ("Pix"); o select trabalha com a chave. Esperar
      // o rótulo aqui era o que deixava a Forma em "Selecione" na edição.
      paymentMethod: "PIX",
      notes: "30% dos atrasados",
      status: "Pago",
      clientId: "c-1",
      clientName: "Maria Silva",
    });
  });

  it("isSettled sai do status, não da data de pagamento", () => {
    // Cancelado com data de pagamento antiga é real: cancelou-se depois de
    // registrar. Ler a data faria a edição reabri-lo como pago.
    const cancelled = { ...revenue, status: "Cancelado" as const };
    expect(incomeFormFrom(cancelled).isSettled).toBe(false);
    expect(incomeFormFrom(revenue).isSettled).toBe(true);
  });

  it("campos ausentes viram string vazia, nunca undefined", () => {
    const lean: OfficeRevenueResponse = {
      id: "r-2",
      description: "Parecer",
      amount: 500,
      dueDate: "2026-04-01",
      overdue: false,
    };
    const form = incomeFormFrom(lean);
    expect(form.clientId).toBe("");
    expect(form.clientName).toBe("");
    expect(form.paidDate).toBe("");
    expect(form.paymentMethod).toBe("");
    expect(form.notes).toBe("");
  });
});

describe("expenseFormFrom", () => {
  it("traz fornecedor e categoria, que são o que a saída tem de seu", () => {
    const form = expenseFormFrom({
      id: "e-1",
      description: "Aluguel",
      amount: 3000,
      category: "Aluguel e condomínio",
      status: "Pendente",
      dueDate: "2026-03-05",
      overdue: true,
      supplier: "Imobiliária X",
    });
    expect(form).toMatchObject({
      supplier: "Imobiliária X",
      category: "ALUGUEL", // chave do enum, que é o que o select reconhece
      status: "Pendente",
      isSettled: false,
      amount: "3000,00",
    });
  });
});

describe("formatAmountInput", () => {
  it("usa vírgula decimal, que é o que o AmountField lê de volta", () => {
    expect(formatAmountInput(1234.5)).toBe("1234,50");
  });

  it("não põe separador de milhar — o parse devolveria 1234 no lugar de 1234,56", () => {
    expect(formatAmountInput(1234.56)).not.toContain(".");
  });

  it("ida e volta preserva o valor", () => {
    for (const amount of [0.01, 99.9, 1234.56, 1000000]) {
      expect(parseAmountBRL(formatAmountInput(amount))).toBeCloseTo(amount, 2);
    }
  });

  it("ausente vira vazio, não 'NaN' nem '0,00'", () => {
    expect(formatAmountInput(undefined)).toBe("");
    expect(formatAmountInput(null)).toBe("");
    expect(formatAmountInput(Number.NaN)).toBe("");
  });
});

describe("estaCancelado", () => {
  it("só o rótulo Cancelado conta", () => {
    expect(isCancelled({ ...emptyExpenseForm(), status: "Cancelado" })).toBe(
      true,
    );
    expect(isCancelled({ ...emptyExpenseForm(), status: "Pago" })).toBe(false);
    expect(isCancelled(emptyExpenseForm())).toBe(false);
  });
});
