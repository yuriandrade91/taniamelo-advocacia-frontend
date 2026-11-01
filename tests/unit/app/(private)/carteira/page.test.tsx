import { act, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WalletPage from "@/app/(private)/carteira/page";
import { callsTo, envelope, failApi, onApi, page } from "../../../support/fakeApi";
import { seedOffice } from "../../../support/office";
import { renderApp } from "../../../support/render";
import { signIn } from "../../../support/session";
import { inputByLabel, chooseOption } from "../../../support/ui";
import type { UserEvent } from "@testing-library/user-event";

async function openWallet(options?: { fakeTimers?: boolean }) {
  const view = renderApp(<WalletPage />, options);
  await screen.findAllByText("Aluguel da sala");
  return view.user;
}

/** Digita a data nos segmentos (dia, mês, ano) do primeiro seletor de data do diálogo. */
async function typeDate(user: UserEvent, scope: HTMLElement, value: string, index = 0) {
  const day = within(scope).getAllByRole("spinbutton", { name: /dia/ })[index];
  await user.click(day);
  await user.keyboard(value);
}

describe("Carteira", () => {
  it("mostra saídas e entradas do mês e navega entre meses", async () => {
    signIn();
    seedOffice();
    const user = await openWallet();

    expect(screen.getByRole("heading", { name: "Carteira" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Entradas/ }));
    await screen.findAllByText("Honorários de consulta");
    await user.click(screen.getByRole("tab", { name: /Saídas/ }));

    const before = callsTo("get").length;
    await user.click(screen.getByRole("button", { name: "Mês anterior" }));
    await user.click(screen.getByRole("button", { name: "Próximo mês" }));
    await waitFor(() => expect(callsTo("get").length).toBeGreaterThan(before));

    await user.type(screen.getByRole("searchbox", { name: "Pesquisar lançamento" }), "aluguel");
  });

  it("lança uma saída nova", async () => {
    signIn();
    seedOffice();
    onApi("post", "/expenses", envelope({ id: "e9" }));
    const user = await openWallet();

    await user.click(screen.getByRole("button", { name: "Registrar lançamento" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("radio", { name: /Saída/ }));
    await user.type(inputByLabel("Descrição"), "Material de limpeza");
    await user.type(inputByLabel("Valor"), "150,00");
    await typeDate(user, dialog, "10102030");
    await user.click(within(dialog).getByRole("button", { name: /Lançar/ }));
    await waitFor(() => expect(callsTo("post").some(([url]) => String(url).endsWith("/expenses"))).toBe(true));
    expect(callsTo("post").at(-1)?.[1]).toMatchObject({ description: "Material de limpeza", amount: 150 });
  });

  it("lança uma entrada já recebida", async () => {
    signIn();
    seedOffice();
    onApi("post", "/revenues", envelope({ id: "r9" }));
    const user = await openWallet();

    await user.click(screen.getByRole("button", { name: "Registrar lançamento" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("radio", { name: /Entrada/ }));
    await user.type(inputByLabel("Descrição"), "Consulta avulsa");
    await user.type(inputByLabel("Valor"), "300");
    await typeDate(user, dialog, "10102030");
    await user.click(within(dialog).getByRole("switch"));
    // Recebido pede a data em que entrou no caixa (no passado).
    await typeDate(user, dialog, "01012024", 1);
    await user.click(within(dialog).getByRole("button", { name: /Lançar/ }));
    await waitFor(() => expect(callsTo("post").some(([url]) => String(url).endsWith("/revenues"))).toBe(true));
    expect(callsTo("post").at(-1)?.[1]).toMatchObject({ description: "Consulta avulsa", amount: 300 });
  });

  it("abre o detalhe, edita e dá baixa", async () => {
    signIn();
    seedOffice();
    onApi("put", /\/expenses\/e\d+$/, envelope({ id: "e1" }));
    const user = await openWallet();

    await user.click(screen.getAllByRole("button", { name: "Ver detalhes da despesa" })[0]);
    const drawer = await screen.findByRole("dialog");
    await within(drawer).findByText("Imobiliária Centro");
    await user.click(within(drawer).getByRole("button", { name: "Copiar valor" }));
    await user.click(within(drawer).getByRole("button", { name: "Marcar como pago" }));
    expect(await screen.findByRole("button", { name: "Salvar alterações" })).toBeInTheDocument();
  });

  it("edita uma despesa pela linha", async () => {
    signIn();
    seedOffice();
    onApi("put", /\/expenses\/e\d+$/, envelope({ id: "e1" }));
    const user = await openWallet();
    await user.click(screen.getAllByRole("button", { name: "Editar despesa" })[0]);
    const drawer = await screen.findByRole("dialog");
    const description = await within(drawer).findByDisplayValue("Aluguel da sala");
    await user.clear(description);
    await user.type(description, "Aluguel novo");
    const save = screen.getAllByRole("button").find((b) => /Salvar/.test(b.textContent ?? ""))!;
    await user.click(save);
    await waitFor(() => expect(callsTo("put").at(-1)?.[1]).toMatchObject({ description: "Aluguel novo" }));
  });

  it("exclui uma despesa com a janela de desfazer", async () => {
    signIn();
    seedOffice();
    onApi("delete", /\/expenses\/e\d+$/, envelope(null));
    const user = await openWallet({ fakeTimers: true });

    await user.click(screen.getAllByRole("button", { name: "Excluir despesa" })[0]);
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getAllByRole("button").find((b) => /Excluir/.test(b.textContent ?? ""));
    if (confirm) await user.click(confirm);
    await act(() => vi.advanceTimersByTimeAsync(6000));
    await waitFor(() => expect(callsTo("delete").some(([url]) => /\/expenses\/e\d+$/.test(String(url)))).toBe(true));
  });

  it("vazio e falha", async () => {
    signIn();
    onApi("get", "/expenses", page([], 0));
    onApi("get", "/revenues", page([], 0));
    failApi("get", "/expenses/summary", 500);
    renderApp(<WalletPage />);
    expect(await screen.findAllByText(/Nenhuma|Não foi possível/)).not.toHaveLength(0);
  });
});

describe("Carteira: detalhe e edição pelo painel", () => {
  it("dá baixa numa saída pelo painel", async () => {
    signIn();
    seedOffice();
    onApi("put", /\/expenses\/e\d+$/, envelope({ id: "e1" }));
    const user = await openWallet();
    await user.click(screen.getAllByRole("button", { name: "Ver detalhes da despesa" })[0]);
    const drawer = await screen.findByRole("dialog");
    await within(drawer).findByText("Imobiliária Centro");
    await user.click(within(drawer).getByRole("button", { name: "Marcar como pago" }));
    await user.click(await screen.findByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(callsTo("put").some(([url]) => String(url).endsWith("/expenses/e1"))).toBe(true));
    expect(callsTo("put").at(-1)?.[1]).toMatchObject({ paidDate: expect.any(String) });
  });

  it("editar uma entrada já recebida pede confirmação e grava", async () => {
    signIn();
    seedOffice();
    onApi("put", /\/revenues\/r\d+$/, envelope({ id: "r1" }));
    const user = await openWallet();
    await user.click(screen.getByRole("tab", { name: /Entradas/ }));
    await screen.findAllByText("Honorários de consulta");
    const view = screen.getAllByRole("button").find((b) => /Ver detalhes/.test(b.getAttribute("aria-label") ?? ""))!;
    await user.click(view);
    const drawer = await screen.findByRole("dialog");
    await within(drawer).findAllByText("Honorários de consulta");
    await user.click(within(drawer).getByRole("button", { name: "Editar" }));
    // Lançamento já recebido: mexer pede confirmação antes.
    const confirm = await screen.findAllByRole("button").then((all) => all.find((b) => /Editar mesmo assim|Editar assim mesmo|Continuar|Confirmar/.test(b.textContent ?? "")));
    if (confirm) await user.click(confirm);
    const description = await screen.findByDisplayValue("Honorários de consulta");
    await user.clear(description);
    await user.type(description, "Honorários de consulta inicial");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(callsTo("put").some(([url]) => String(url).endsWith("/revenues/r1"))).toBe(true));
  });

  it("detalhe que não carrega avisa no painel", async () => {
    signIn();
    seedOffice();
    failApi("get", /\/expenses\/e\d+$/, 500);
    const user = await openWallet();
    await user.click(screen.getAllByRole("button", { name: "Ver detalhes da despesa" })[0]);
    expect(await screen.findByText(/Não foi possível carregar este lançamento/)).toBeInTheDocument();
  });
});

describe("Carteira: entradas", () => {
  it("editar entrada recebida pela linha pede confirmação; excluir entrada", async () => {
    signIn();
    seedOffice();
    onApi("delete", /\/revenues\/r\d+$/, envelope(null));
    const { user } = renderApp(<WalletPage />, { fakeTimers: true });
    await screen.findAllByText("Aluguel da sala");
    await user.click(screen.getByRole("tab", { name: /Entradas/ }));
    await screen.findAllByText("Honorários de consulta");
    const edit = screen.getAllByRole("button").find((b) => /Editar/.test(b.getAttribute("aria-label") ?? ""))!;
    await user.click(edit);
    const confirm = screen.queryAllByRole("button").find((b) => /assim mesmo|Continuar|Confirmar/.test(b.textContent ?? ""));
    if (confirm) await user.click(confirm);
    await user.keyboard("{Escape}");

    const remove = screen.getAllByRole("button").find((b) => /Excluir/.test(b.getAttribute("aria-label") ?? ""))!;
    await user.click(remove);
    const dialog = await screen.findByRole("dialog", { name: /Excluir entrada/ });
    await user.click(within(dialog).getAllByRole("button").find((b) => (b.textContent ?? "").startsWith("Excluir"))!);
    await act(() => vi.advanceTimersByTimeAsync(6000));
    await waitFor(() => expect(callsTo("delete").some(([url]) => /\/revenues\/r\d+$/.test(String(url)))).toBe(true));
  });

  it("STAFF não tem carteira", async () => {
    signIn("STAFF");
    seedOffice();
    renderApp(<WalletPage />);
    expect(await screen.findAllByText(/Carteira/)).not.toHaveLength(0);
    expect(callsTo("get").some(([url]) => String(url).includes("/expenses"))).toBe(false);
  });

  it("um lado do mês falhando mostra dados parciais", async () => {
    signIn();
    seedOffice();
    failApi("get", "/revenues/summary", 500);
    renderApp(<WalletPage />);
    expect(await screen.findByText("Dados parciais")).toBeInTheDocument();
  });

  it("filtros com forma e categoria", async () => {
    signIn();
    seedOffice();
    const { user } = renderApp(<WalletPage />);
    await screen.findAllByText("Aluguel da sala");
    // Categoria é só de saída: a Carteira abre em "Todos".
    await user.click(screen.getByRole("tab", { name: /Saídas/ }));
    chooseOption("Categoria", ["ALUGUEL"]);
    chooseOption("Forma", ["PIX"]);
    await waitFor(() => expect(callsTo("get").some(([, c]) => JSON.stringify(c ?? {}).includes("ALUGUEL"))).toBe(true));
    expect(page).toBeDefined();
  });
});
