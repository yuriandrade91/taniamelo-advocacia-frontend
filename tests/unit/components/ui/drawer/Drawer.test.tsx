import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Drawer from "@/components/ui/drawer/Drawer";

describe("Drawer", () => {
  function open(props: Partial<Parameters<typeof Drawer>[0]> = {}) {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    const onRequestClose = vi.fn();
    render(
      <Drawer isOpen onOpenChange={onOpenChange} onConfirm={onConfirm} onRequestClose={onRequestClose} title="Painel" confirmLabel="Gravar" {...props}>
        <p>conteúdo</p>
      </Drawer>,
    );
    return { onOpenChange, onConfirm, onRequestClose, user: userEvent.setup() };
  }

  it("botões: confirma e cancela", async () => {
    const { user, onConfirm, onOpenChange } = open();
    await user.click(screen.getByRole("button", { name: "Gravar" }));
    expect(onConfirm).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("pílula: confirma; salvando, o botão espera", async () => {
    const { user, onConfirm } = open();
    await user.click(screen.getByRole("button", { name: "Gravar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("com edição em andamento, fechar pede confirmação a quem abriu", async () => {
    const { user, onRequestClose, onOpenChange } = open({ confirmClose: true });
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onRequestClose).toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("desabilitado ou salvando não confirma; sem rodapé não há botões", () => {
    const { onConfirm } = open({ isSubmitting: true });
    expect(screen.getAllByText("Salvando...")[0]).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("sem rodapé", () => {
    open({ hideFooter: true, description: "explicação" });
    expect(screen.queryByRole("button", { name: "Gravar" })).not.toBeInTheDocument();
  });
});
