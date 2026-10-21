import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InstallmentList, InstallmentStrip, InstallmentTally } from "@/components/payments/InstallmentList";
import { clientPayment, isoDay } from "../../support/fixtures";

const total = 5;
const paid = clientPayment({ id: "p1", installmentNumber: 1, installmentTotal: total, status: "Pago", paidDate: isoDay(-30) });
const overdue = clientPayment({ id: "p2", installmentNumber: 2, installmentTotal: total, dueDate: isoDay(-3), overdue: true });
const current = clientPayment({ id: "p3", installmentNumber: 3, installmentTotal: total, dueDate: isoDay(20) });
const cancelled = clientPayment({ id: "p4", installmentNumber: 4, installmentTotal: total, status: "Cancelado", amount: undefined });
// A parcela 5 não foi lançada.
const byNumber = new Map([paid, overdue, current, cancelled].map((p) => [p.installmentNumber!, p]));

describe("InstallmentList", () => {
  it("uma linha por parcela, com situação, prazo e valor", () => {
    render(<InstallmentList current={current} byNumber={byNumber} isLoading={false} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(total);
    expect(screen.getByRole("button", { name: /Parcela 1 \(Recebido/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Parcela 5 (não lançada)" })).toBeInTheDocument();
    expect(screen.getByText("esta")).toBeInTheDocument();
    expect(screen.getAllByText("—")).not.toHaveLength(0);
    expect(screen.getByText(/recebida em/)).toBeInTheDocument();
  });

  it("abre o detalhe das lançadas, menos a atual quando ela já está aberta", async () => {
    const onOpen = vi.fn();
    render(<InstallmentList current={current} byNumber={byNumber} isLoading={false} onOpen={onOpen} canOpenCurrent={false} />);
    await userEvent.click(screen.getByRole("button", { name: /Parcela 2 .* ver detalhes/ }));
    expect(onOpen).toHaveBeenCalledWith(overdue);
    expect(screen.getByRole("button", { name: /Parcela 3/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Parcela 5 (não lançada)" })).toBeDisabled();
  });

  it("carregando: só a atual aparece, as outras em esqueleto", () => {
    render(<InstallmentList current={current} byNumber={new Map([[3, current]])} isLoading className="mt-2" />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("parcela avulsa (sem total) é uma linha só", () => {
    const single = clientPayment({ installmentNumber: undefined, installmentTotal: undefined });
    render(<InstallmentList current={single} byNumber={new Map()} isLoading={false} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });
});

describe("InstallmentStrip e InstallmentTally", () => {
  it("uma barra por parcela", () => {
    const { container } = render(<InstallmentStrip current={current} byNumber={byNumber} />);
    expect(container.querySelectorAll("span")).toHaveLength(total);
  });

  it("conta recebidas, atrasadas (só quando há) e a vencer", () => {
    const { rerender } = render(<InstallmentTally counts={{ paid: 2, overdue: 1, upcoming: 3 }} />);
    expect(screen.getByText("2 recebidas")).toBeInTheDocument();
    expect(screen.getByText("1 atrasada")).toBeInTheDocument();
    rerender(<InstallmentTally counts={{ paid: 1, overdue: 0, upcoming: 1 }} />);
    expect(screen.queryByText(/atrasada/)).not.toBeInTheDocument();
  });
});
