import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ClientFinancePanel } from "@/components/clients/finance/ClientFinancePanel";
import { envelope, failApi, onApi, page } from "../../../support/fakeApi";
import * as fx from "../../../support/fixtures";

/** Parcelas do benefício em todas as situações: paga, a vencer hoje, amanhã, atrasada, cancelada. */
function seedBenefit(totalRecords?: number) {
  const items = [
    fx.officePayment({ id: "b1", status: "Pago", paidDate: fx.isoDay(-10), dueDate: fx.isoDay(-12) }),
    fx.officePayment({ id: "b2", status: "Pago", paidDate: fx.isoDay(-2), dueDate: fx.isoDay(-3), installmentNumber: undefined }),
    fx.officePayment({ id: "b3", dueDate: fx.isoDay(0) }),
    fx.officePayment({ id: "b4", dueDate: fx.isoDay(1), amount: undefined }),
    fx.officePayment({ id: "b5", dueDate: fx.isoDay(-1), overdue: true }),
    fx.officePayment({ id: "b6", dueDate: fx.isoDay(-6), overdue: true }),
    fx.officePayment({ id: "b7", status: "Cancelado", dueDate: fx.isoDay(4) }),
  ];
  onApi("get", "/payments", page(items, totalRecords ?? items.length));
}

describe("Financeiro do cliente", () => {
  it("benefício: totais do servidor, próximo a vencer, último recebido e filtros", async () => {
    seedBenefit(20);
    onApi("get", "/payments/summary", envelope(fx.summary()));
    onApi("get", "/revenues", page([fx.revenue()]));
    onApi("get", "/revenues/summary", envelope(fx.summary()));
    const user = userEvent.setup();
    render(<ClientFinancePanel clientId="c1" />);

    expect(await screen.findByText(/Mostrando 7 de 20/)).toBeInTheDocument();
    expect(screen.getByText("vence hoje")).toBeInTheDocument();
    expect(screen.getByText("1 dia de atraso")).toBeInTheDocument();
    expect(screen.getByText("6 dias de atraso")).toBeInTheDocument();

    for (const label of [/Atrasad/, /A vencer/, /Recebid/, /Cancelad/, /Tod/]) {
      const chip = screen.queryAllByRole("button", { pressed: false }).find((b) => label.test(b.textContent ?? ""));
      if (chip) await user.click(chip);
    }

    await user.click(screen.getByRole("tab", { name: /Honorários/ }));
    expect(await screen.findAllByText("Honorários de consulta")).not.toHaveLength(0);
  });

  it("sem resumo, os totais somam a lista e avisam", async () => {
    seedBenefit();
    failApi("get", "/payments/summary", 500);
    onApi("get", "/revenues", page([]));
    render(<ClientFinancePanel clientId="c1" />);
    expect(await screen.findByText(/Os totais não carregaram/)).toBeInTheDocument();
  });

  it("lista vazia, nada a vencer e nada recebido", async () => {
    onApi("get", "/payments", page([]));
    onApi("get", "/payments/summary", envelope(fx.summary({ paidAmount: 0, paidCount: 0, upcomingAmount: 0, upcomingCount: 0, overdueAmount: 0, overdueCount: 0 })));
    onApi("get", "/revenues", page([]));
    onApi("get", "/revenues/summary", envelope(fx.summary()));
    render(<ClientFinancePanel clientId="c1" />);
    expect(await screen.findByText(/Nenhuma parcela de benefício/)).toBeInTheDocument();
    expect(screen.getByText("Nada a vencer")).toBeInTheDocument();
    expect(screen.getByText("Nada recebido ainda")).toBeInTheDocument();
  });

  it("falha da lista avisa no lugar do conteúdo", async () => {
    failApi("get", "/payments", 500);
    failApi("get", "/revenues", 500);
    const user = userEvent.setup();
    render(<ClientFinancePanel clientId="c1" />);
    expect(await screen.findByText(/Não foi possível carregar/)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Honorários/ }));
    await waitFor(() => expect(screen.getByText(/Não foi possível carregar/)).toBeInTheDocument());
  });
});
