import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import RemoveAddressesDialog from "@/components/clients/form/RemoveAddressesDialog";

const options = [
  { index: 0, label: "Endereço 1", hint: "Rua A, 10", isPrimary: true },
  { index: 1, label: "Endereço 2", hint: "Rua B, 20", isPrimary: false },
  { index: 2, label: "Endereço 3", hint: "Rua C, 30", isPrimary: false },
];

function open(list = options) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(<RemoveAddressesDialog isOpen onClose={onClose} onConfirm={onConfirm} options={list} />);
  return { onConfirm, onClose, user: userEvent.setup() };
}

const confirmButton = () => screen.getAllByRole("button").find((b) => (b.textContent ?? "").startsWith("Excluir"))!;

describe("Excluir endereços", () => {
  it("nada marcado: não confirma", () => {
    open();
    expect(confirmButton()).toBeDisabled();
  });

  it("remove um que não é o principal", async () => {
    const { user, onConfirm } = open();
    await user.click(screen.getByRole("checkbox", { name: /Endereço 2/ }));
    expect(confirmButton()).toHaveTextContent("Excluir endereço");
    await user.click(confirmButton());
    expect(onConfirm).toHaveBeenCalledWith([1], undefined);
  });

  it("tirar o principal pede quem assume quando sobra mais de um", async () => {
    const { user, onConfirm } = open();
    await user.click(screen.getByRole("checkbox", { name: /Endereço 1/ }));
    expect(confirmButton()).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: /Endereço 3/ }));
    await user.click(confirmButton());
    expect(onConfirm).toHaveBeenCalledWith([0], 2);
  });

  it("tirar o principal e mais um: o que sobra assume sozinho; um fica sempre", async () => {
    const { user, onConfirm } = open();
    await user.click(screen.getByRole("checkbox", { name: /Endereço 1/ }));
    await user.click(screen.getByRole("checkbox", { name: /Endereço 2/ }));
    expect(screen.getByRole("checkbox", { name: /Endereço 3/ })).toBeDisabled();
    expect(confirmButton()).toHaveTextContent("Excluir 2 endereços");
    await user.click(confirmButton());
    expect(onConfirm).toHaveBeenCalledWith([0, 1], 2);

    await user.click(screen.getByRole("checkbox", { name: /Endereço 2/ }));
  });

  it("manter fecha sem excluir", async () => {
    const { user, onClose, onConfirm } = open();
    await user.click(screen.getByRole("button", { name: "Manter" }));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
