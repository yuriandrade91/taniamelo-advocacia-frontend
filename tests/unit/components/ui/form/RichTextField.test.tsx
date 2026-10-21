import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { RichTextField } from "@/components/ui/form/RichTextField";

/** A área editável do Tiptap (um `contenteditable`, não um `<textarea>`). */
const editable = () => waitFor(() => {
  const node = document.querySelector<HTMLElement>(".ProseMirror");
  if (!node) throw new Error("editor ainda não montou");
  return node;
});

function Controlled({ onChange }: Readonly<{ onChange: (html: string) => void }>) {
  const [value, setValue] = useState("<p>Primeira conversa</p>");
  return (
    <RichTextField
      label="Conteúdo"
      value={value}
      onChange={(html) => {
        setValue(html);
        onChange(html);
      }}
      isRequired
    />
  );
}

describe("RichTextField", () => {
  it("mostra o conteúdo, formata pela barra e devolve HTML ao digitar", async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    const editor = await editable();
    await waitFor(() => expect(editor).toHaveTextContent("Primeira conversa"));
    const user = userEvent.setup();
    await user.click(editor);
    await user.keyboard(" com a cliente");
    for (const name of ["Negrito", "Itálico", "Sublinhado", "Tachado", "Lista com marcadores", "Lista numerada", "Citação"]) {
      await user.click(screen.getByRole("button", { name }));
    }
    await act(async () => {});
    expect(onChange).toHaveBeenCalled();
  });

  it("valor trocado por fora atualiza o editor; desabilitado e com erro", async () => {
    const { rerender } = render(<RichTextField label="Conteúdo" value="" onChange={vi.fn()} />);
    rerender(<RichTextField label="Conteúdo" value="<p>Novo texto</p>" onChange={vi.fn()} isInvalid errorMessage="Obrigatório" isDisabled />);
    const editor = await editable();
    await waitFor(() => expect(editor).toHaveTextContent("Novo texto"));
    expect(screen.getByText("Obrigatório")).toBeInTheDocument();
  });
});
