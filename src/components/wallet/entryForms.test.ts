import { describe, expect, it } from "vitest";
import {
  carryShared,
  emptyExpenseForm,
  emptyIncomeForm,
  toExpenseRequest,
  toRevenueRequest,
  validateAmount,
  validateExpenseForm,
  validateIncomeForm,
  validateInstallment,
  validatePaidDate,
  type IncomeFormValues,
} from "./entryForms";

const TODAY = "2026-09-03";

describe("validateAmount", () => {
  it("rejeita zero — o backend exige @DecimalMin(0.01)", () => {
    expect(validateAmount("0")).not.toBeNull();
    expect(validateAmount("0,00")).not.toBeNull();
  });

  it("rejeita negativo: o sinal está em ser saída, não no número", () => {
    expect(validateAmount("-100")).not.toBeNull();
  });

  it("aceita o formato pt-BR com milhar", () => {
    expect(validateAmount("1.234,56")).toBeNull();
  });

  it("rejeita texto", () => {
    expect(validateAmount("abc")).not.toBeNull();
    expect(validateAmount("")).not.toBeNull();
  });
});

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
    expect(validateInstallment("2", "")).not.toBeNull();
    expect(validateInstallment("", "12")).not.toBeNull();
  });

  it("recusa parcela maior que o total", () => {
    expect(validateInstallment("3", "2")).not.toBeNull();
    expect(validateInstallment("2", "12")).toBeNull();
  });

  it("recusa zero e fracionário", () => {
    expect(validateInstallment("0", "3")).not.toBeNull();
    expect(validateInstallment("1,5", "3")).not.toBeNull();
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
  const preenchida = (): IncomeFormValues => ({
    ...emptyIncomeForm(),
    clientId: "c-1",
    clientName: "Maria",
    installmentNumber: "2",
    installmentTotal: "12",
    description: "Honorários",
    amount: "1.500,00",
    dueDate: "2026-09-10",
    isSettled: true,
    paidDate: "2026-09-01",
    paymentMethod: "PIX",
    notes: "combinado em reunião",
  });

  it("leva os sete campos comuns para o outro tipo", () => {
    const saida = carryShared(emptyExpenseForm(), preenchida());
    expect(saida.description).toBe("Honorários");
    expect(saida.amount).toBe("1.500,00");
    expect(saida.dueDate).toBe("2026-09-10");
    expect(saida.isSettled).toBe(true);
    expect(saida.paidDate).toBe("2026-09-01");
    expect(saida.paymentMethod).toBe("PIX");
    expect(saida.notes).toBe("combinado em reunião");
  });

  it("não inventa tradução entre campos próprios de cada tipo", () => {
    const saida = carryShared(emptyExpenseForm(), preenchida());
    // Cliente não vira fornecedor: são coisas diferentes, não sinônimos.
    expect(saida.supplier).toBe("");
    expect(saida.category).toBe("");
  });

  it("preserva o que o destino já tinha nos campos próprios", () => {
    const saida = { ...emptyExpenseForm(), supplier: "Imobiliária", category: "ALUGUEL" };
    const depois = carryShared(saida, preenchida());
    expect(depois.supplier).toBe("Imobiliária");
    expect(depois.category).toBe("ALUGUEL");
  });

  it("é reversível: voltar não perde o que era do outro lado", () => {
    const income = preenchida();
    const saida = carryShared(
      { ...emptyExpenseForm(), supplier: "Imobiliária" },
      income,
    );
    const devolta = carryShared(income, saida);
    expect(devolta.clientId).toBe("c-1");
    expect(devolta.installmentNumber).toBe("2");
  });
});
