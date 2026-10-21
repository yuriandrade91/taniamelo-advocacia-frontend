import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DatePickerField, DateTimePickerField, Field, MultiSelectField, PasswordField } from "@/components/ui/form/Field";
import { renderApp } from "../../../support/render";

function ControlledPassword() {
  const [value, setValue] = useState("");
  return <PasswordField label="Senha" value={value} onChange={(e) => setValue(e.target.value)} />;
}

describe("Campos do formulário", () => {
  it("campo com descrição e com erro", () => {
    const { rerender } = render(<Field label="Nome" value="" onChange={() => {}} description="Como no documento" />);
    expect(screen.getByText("Como no documento")).toBeInTheDocument();
    rerender(<Field label="Nome" value="" onChange={() => {}} isInvalid errorMessage="Obrigatório" />);
    expect(screen.getByText("Obrigatório")).toBeInTheDocument();
  });

  it("senha: mostra, copia e esconde", async () => {
    const { user } = renderApp(<ControlledPassword />);
    const input = screen.getByLabelText(/^Senha/, { selector: "input" });
    await user.type(input, "s3gredo");
    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Mostrar senha" }));
    expect(input).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: /Copiar/ }));
    expect(await navigator.clipboard.readText()).toBe("s3gredo");
    await user.click(screen.getByRole("button", { name: "Ocultar senha" }));
  });

  it("senha: área de transferência negada avisa", async () => {
    const { user } = renderApp(<ControlledPassword />);
    await user.type(screen.getByLabelText(/^Senha/, { selector: "input" }), "abc");
    await user.click(screen.getByRole("button", { name: "Mostrar senha" }));
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(new Error("negado"));
    await user.click(screen.getByRole("button", { name: /Copiar/ }));
    await act(async () => {});
    expect(writeText).toHaveBeenCalledWith("abc");
  });

  it("seleção múltipla devolve as chaves e resume a escolha", () => {
    const onSelectionChange = vi.fn();
    render(
      <MultiSelectField
        label="Benefícios"
        options={[{ id: "a", label: "Idade" }, { id: "b", label: "Especial" }]}
        selectedKeys={["a", "b"]}
        onSelectionChange={onSelectionChange}
      />,
    );
    expect(screen.getAllByText(/Idade/).length).toBeGreaterThan(0);
    const select = document.querySelector("select")!;
    for (const option of select.options) option.selected = option.value === "b";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onSelectionChange).toHaveBeenCalledWith(["b"]);
  });

  it("data: abre o calendário e escolhe um dia; data e hora aceitam digitação", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <>
        <DatePickerField label="Nascimento" value="2026-10-10" onChange={onChange} />
        <DateTimePickerField label="Início" value="" onChange={onChange} />
      </>,
    );
    await user.click(screen.getAllByRole("button", { name: /Calendário/ })[0]);
    const day = await screen.findAllByRole("button", { name: /15/ });
    await user.click(day[0]);
    expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-15$/));

    const hour = screen.getAllByRole("spinbutton", { name: /dia/ }).at(-1)!;
    await user.click(hour);
    await user.keyboard("0101203009");
    await user.keyboard("{Backspace}{Backspace}");
  });
});
