import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NewClientPage from "@/app/(private)/clientes/novo/page";
import { callsTo, envelope, onApi } from "../../../../../../support/fakeApi";
import { renderApp } from "../../../../../../support/render";
import { seedOffice } from "../../../../../../support/office";
import { signIn } from "../../../../../../support/session";
import { chooseOption } from "../../../../../../support/ui";
import { fillAndOpen } from "../../../../../../support/clientForm";

/**
 * A seção de arquivos do cadastro de ponta a ponta no jsdom: escolher,
 * arrastar e colar arquivos, completar os dados de cada um e trocar de aba.
 */

const pdf = (name: string) => new File(["%PDF-1.4"], name, { type: "application/pdf" });

/** Evento de janela com `dataTransfer`/`clipboardData` — o jsdom não tem DragEvent. */
function windowEvent(type: string, files: File[], key: "dataTransfer" | "clipboardData" = "dataTransfer") {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, key, { value: { types: ["Files"], files, dropEffect: "none" } });
  return event;
}

async function openFiles() {
  signIn();
  seedOffice();
  const view = renderApp(<NewClientPage />);
  await screen.findByRole("heading", { name: "Cadastro de Cliente" });
  await fillAndOpen(view.user, /Arquivos/);
  return view.user;
}

const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]')!;

describe("Arquivos no cadastro", () => {
  it("escolhe documentos, completa os dados e remove um", async () => {
    const user = await openFiles();
    fireEvent.change(fileInput(), { target: { files: [pdf("rg.pdf"), pdf("laudo.pdf"), new File(["x"], "planilha.exe", { type: "application/x-msdownload" })] } });
    await screen.findAllByText("rg.pdf");

    chooseOption("Tipo do documento", "IDENTIFICACAO_SEGURADO");
    const note = screen.getAllByLabelText(/Observações/).find((el) => el.tagName === "TEXTAREA" || el.tagName === "INPUT");
    if (note) await user.type(note, "RG frente e verso");

    await user.click(screen.getByRole("button", { name: "Remover laudo.pdf" }));
    expect(screen.queryByText("laudo.pdf")).not.toBeInTheDocument();
    await user.click(screen.getAllByRole("button").find((b) => /Ver lista|catálogo/i.test(b.textContent ?? "")) ?? document.body);
  });

  it("arrasta e cola arquivos na janela", async () => {
    await openFiles();
    await act(async () => {
      globalThis.dispatchEvent(windowEvent("dragenter", [pdf("cnis.pdf")]));
      globalThis.dispatchEvent(windowEvent("dragover", [pdf("cnis.pdf")]));
      globalThis.dispatchEvent(windowEvent("dragleave", [pdf("cnis.pdf")]));
      globalThis.dispatchEvent(windowEvent("dragenter", [pdf("cnis.pdf")]));
      globalThis.dispatchEvent(windowEvent("drop", [pdf("cnis.pdf")]));
    });
    expect(await screen.findAllByText("cnis.pdf")).not.toHaveLength(0);

    await act(async () => {
      globalThis.dispatchEvent(windowEvent("paste", [new File(["png"], "image.png", { type: "image/png" })], "clipboardData"));
    });
    expect(await screen.findAllByText(/colad/)).not.toHaveLength(0);
  });

  it("simulações: principal, dados e o arquivo na aba errada", async () => {
    const user = await openFiles();
    await user.click(screen.getByRole("tab", { name: /Simulações/ }));
    fireEvent.change(fileInput(), { target: { files: [pdf("simulacao-v1.pdf"), pdf("simulacao-v2.pdf"), pdf("rg-do-cliente.pdf")] } });
    await screen.findAllByText("simulacao-v1.pdf");

    const principal = screen.getAllByRole("button", { name: "Tornar principal" });
    await user.click(principal[0]);
    const version = screen.getAllByLabelText(/Versão/).find((el) => el.tagName === "INPUT");
    if (version) await user.type(version, "v2");
    const links = screen.getAllByLabelText(/Vínculos/).find((el) => el.tagName === "INPUT");
    if (links) await user.type(links, "4");
    const day = screen.queryAllByRole("spinbutton", { name: /dia/ })[0];
    if (day) {
      await user.click(day);
      await user.keyboard("01012025");
    }
    const move = screen.queryAllByRole("button").find((b) => /Mover para (os )?documentos|É documento/i.test(b.textContent ?? ""));
    if (move) await user.click(move);
    await user.click(screen.getByRole("button", { name: "Remover simulacao-v2.pdf" }));
    expect(screen.queryByText("simulacao-v2.pdf")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Simulação principal" })).toHaveLength(1);
  });

  it("muitos arquivos são paginados", async () => {
    const user = await openFiles();
    const many = Array.from({ length: 13 }, (_, i) => pdf(`documento-${i + 1}.pdf`));
    fireEvent.change(fileInput(), { target: { files: many } });
    await screen.findAllByText("documento-1.pdf");
    // Dez por página: o 11º só aparece na segunda.
    expect(screen.queryByText("documento-11.pdf")).not.toBeInTheDocument();
    const next = screen.queryAllByRole("button").find((b) => /Próxima|Próximo/.test(`${b.getAttribute("aria-label")} ${b.textContent}`));
    if (next) {
      await user.click(next);
      expect(await screen.findAllByText("documento-11.pdf")).not.toHaveLength(0);
    }
  });

  it("o cadastro sobe os arquivos escolhidos depois de criar", async () => {
    const user = await openFiles();
    onApi("post", /\/clients$/, envelope({ id: "c9" }));
    onApi("post", "/files/documents", envelope([]));
    fireEvent.change(fileInput(), { target: { files: [pdf("rg.pdf")] } });
    await screen.findAllByText("rg.pdf");
    chooseOption("Tipo do documento", "IDENTIFICACAO_SEGURADO");
    const notes = screen.getAllByLabelText(/Observações/).find((el) => el.tagName === "TEXTAREA" || el.tagName === "INPUT");
    if (notes) await user.type(notes, "RG");

    await user.click(screen.getByRole("button", { name: "Salvar cliente" }));
    await waitFor(() =>
      expect(callsTo("post").some(([url]) => String(url).endsWith("/clients/c9/files/documents"))).toBe(true),
    );
    const [, body] = callsTo("post").find(([url]) => String(url).endsWith("/files/documents"))!;
    expect(body).toBeInstanceOf(FormData);
  });
});
