import { describe, expect, it } from "vitest";
import {
  amountForClipboard,
  currentStep,
  dueLine,
  dueProgress,
} from "@/components/wallet/entryDetails";

const today = "2026-10-01";

describe("dueLine", () => {
  it("previsto conta os dias que faltam", () => {
    expect(
      dueLine(
        { status: "Pendente", overdue: false, dueDate: "2026-10-08" },
        today,
      ),
    ).toEqual({ bucket: "upcoming", text: "Vence em 7 dias" });
  });

  it("hoje e amanhã têm nome próprio", () => {
    expect(
      dueLine({ status: "Pendente", overdue: false, dueDate: today }, today)
        .text,
    ).toBe("Vence hoje");
    expect(
      dueLine(
        { status: "Pendente", overdue: false, dueDate: "2026-10-02" },
        today,
      ).text,
    ).toBe("Vence amanhã");
  });

  it("atrasado conta os dias desde o vencimento, atravessando o mês", () => {
    expect(
      dueLine(
        { status: "Pendente", overdue: true, dueDate: "2026-09-30" },
        today,
      ),
    ).toEqual({ bucket: "overdue", text: "Atrasado há 1 dia" });
  });

  it("o balde é o do servidor, não o das datas", () => {
    // Vencido pela data, mas o servidor diz que não: vale o servidor.
    expect(
      dueLine(
        { status: "Pendente", overdue: false, dueDate: "2026-09-20" },
        today,
      ).bucket,
    ).toBe("upcoming");
  });

  it("pago mostra a data do pagamento", () => {
    expect(
      dueLine(
        {
          status: "Pago",
          overdue: false,
          dueDate: "2026-09-10",
          paidDate: "2026-09-12",
        },
        today,
      ).text,
    ).toBe("Pago em 12/09/2026");
  });

  it("cancelado não fala de prazo", () => {
    expect(
      dueLine(
        { status: "Cancelado", overdue: true, dueDate: "2026-09-01" },
        today,
      ).text,
    ).toBe("Lançamento cancelado");
  });
});


describe("dueProgress", () => {
  const base = {
    status: "Pendente",
    overdue: false,
    createdAt: "2026-09-21T10:00:00Z",
  };

  it("conta do lançamento ao vencimento", () => {
    // 10 dias de prazo, 10 corridos (hoje = 01/10): faltando 0 → "hoje"
    expect(
      dueProgress({ ...base, dueDate: "2026-10-01" }, today),
    ).toMatchObject({
      fraction: 1,
      center: "hoje",
    });
    // 20 dias de prazo, 10 corridos: metade
    expect(
      dueProgress({ ...base, dueDate: "2026-10-11" }, today),
    ).toMatchObject({
      fraction: 0.5,
      center: "10",
      caption: "dias restantes",
    });
  });

  it("atrasado fecha o anel e conta o atraso", () => {
    expect(
      dueProgress({ ...base, overdue: true, dueDate: "2026-09-28" }, today),
    ).toMatchObject({
      bucket: "overdue",
      fraction: 1,
      center: "3",
      caption: "dias de atraso",
    });
  });

  it("pago fecha, cancelado esvazia", () => {
    expect(
      dueProgress({ ...base, status: "Pago", dueDate: "2026-10-11" }, today)
        .fraction,
    ).toBe(1);
    expect(
      dueProgress(
        { ...base, status: "Cancelado", dueDate: "2026-10-11" },
        today,
      ).fraction,
    ).toBe(0);
  });

  it("sem data de lançamento, não quebra", () => {
    expect(
      dueProgress(
        { status: "Pendente", overdue: false, dueDate: "2026-10-05" },
        today,
      ).fraction,
    ).toBe(0);
  });
});

describe("currentStep", () => {
  it("em aberto é o vencimento; pago, o pagamento; cancelado, nenhuma", () => {
    expect(currentStep("upcoming")).toBe("due");
    expect(currentStep("overdue")).toBe("due");
    expect(currentStep("paid")).toBe("paid");
    expect(currentStep("cancelled")).toBeNull();
  });
});

describe("amountForClipboard", () => {
  it("sem moeda nem milhar, com vírgula decimal — cola como número na planilha", () => {
    expect(amountForClipboard(599.16)).toBe("599,16");
    expect(amountForClipboard(4332.49)).toBe("4332,49");
  });

  it("sempre duas casas", () => {
    expect(amountForClipboard(3200)).toBe("3200,00");
    expect(amountForClipboard(1234.5)).toBe("1234,50");
  });
});
