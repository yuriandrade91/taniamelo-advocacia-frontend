import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConflictDecisionModal } from "@/components/agenda/ConflictDecisionModal";
import { appointment } from "../../support/fixtures";

describe("ConflictDecisionModal", () => {
  const conflicts = [appointment(), appointment({ id: "ap2", title: "Perícia", clientName: null })];

  it("marca o que cancelar e confirma; ou agenda mantendo os dois", async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ConflictDecisionModal isOpen conflicts={conflicts} newTitle="" onClose={onClose} onConfirm={onConfirm} />);
    const user = userEvent.setup();
    const dialog = screen.getByRole("dialog");
    const boxes = within(dialog).getAllByRole("checkbox");
    await user.click(boxes[0]);
    expect(within(dialog).getByText(/o novo compromisso/)).toBeInTheDocument();
    await user.click(boxes[1]);
    await user.click(within(dialog).getByRole("button", { name: "Cancelar os 2 e agendar" }));
    expect(onConfirm).toHaveBeenCalledWith(["ap1", "ap2"]);

    // Com algo marcado, "agendar assim mesmo" não vale: desmarca tudo antes.
    await user.click(boxes[0]);
    await user.click(boxes[1]);
    await user.click(within(dialog).getByRole("button", { name: "Agendar assim mesmo" }));
    expect(onConfirm).toHaveBeenLastCalledWith([]);
    await user.click(within(dialog).getByRole("button", { name: "Voltar e ajustar" }));
    expect(onClose).toHaveBeenCalled();
  });
});
