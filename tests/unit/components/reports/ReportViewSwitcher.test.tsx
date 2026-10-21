import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReportViewSwitcher } from "@/components/reports/ReportViewSwitcher";
import { REPORT_VIEWS } from "@/components/reports/views";

/** Evento de arraste com o `dataTransfer` que o jsdom não monta. */
const drag = (type: "dragStart" | "dragOver" | "drop" | "dragEnd", el: Element) =>
  fireEvent[type](el, { dataTransfer: { effectAllowed: "", dropEffect: "", setData: vi.fn(), types: ["text/plain"] } });

function renderSwitcher(isCustomOrder = false) {
  const props = { onChange: vi.fn(), onMove: vi.fn(), onResetOrder: vi.fn() };
  render(<ReportViewSwitcher views={REPORT_VIEWS} value="executivo" isCustomOrder={isCustomOrder} {...props} />);
  return { ...props, user: userEvent.setup() };
}

describe("Seletor de visões", () => {
  it("troca a visão pelo rádio", async () => {
    const { user, onChange } = renderSwitcher();
    expect(screen.getByRole("radio", { name: "Indicadores" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Proporções" }));
    expect(onChange).toHaveBeenCalledWith("aneis");
  });

  it("reordena pelas setas e restaura a ordem padrão", async () => {
    const { user, onMove, onResetOrder } = renderSwitcher(true);
    await user.click(screen.getByRole("button", { name: "Ordenar as abas" }));
    const dialog = await screen.findByRole("dialog", { name: "Ordem das abas" });
    await user.click(within(dialog).getByRole("button", { name: "Descer Visão geral" }));
    expect(onMove).toHaveBeenCalledWith("atual", 1);
    await user.click(within(dialog).getByRole("button", { name: "Subir Proporções" }));
    expect(onMove).toHaveBeenCalledWith("aneis", 3);
    const reset = within(dialog).getAllByRole("button").find((b) => /padrão|Restaurar/i.test(b.textContent ?? ""))!;
    await user.click(reset);
    expect(onResetOrder).toHaveBeenCalled();
  });

  it("arrastar uma visão sobre outra a leva para lá", async () => {
    const { user, onMove } = renderSwitcher();
    await user.click(screen.getByRole("button", { name: "Ordenar as abas" }));
    const dialog = await screen.findByRole("dialog", { name: "Ordem das abas" });
    const items = within(dialog).getAllByRole("listitem");
    drag("dragOver", items[2]);
    expect(onMove).not.toHaveBeenCalled();
    drag("dragStart", items[0]);
    drag("dragOver", items[0]);
    drag("dragOver", items[2]);
    drag("drop", items[2]);
    drag("dragEnd", items[0]);
    expect(onMove).toHaveBeenCalledWith("atual", 2);
  });
});
