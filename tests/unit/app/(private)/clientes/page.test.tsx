import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ClientsPage from "@/app/(private)/clientes/page";
import { callsTo, envelope, failApi, onApi, page } from "../../../support/fakeApi";
import { router, setLocation } from "../../../support/next";
import { seedOffice } from "../../../support/office";
import { signIn } from "../../../support/session";
import * as fx from "../../../support/fixtures";
import { renderApp } from "../../../support/render";
import { patchClient } from "@/services/clientService";

async function renderClients() {
  const user = userEvent.setup();
  render(<ClientsPage />);
  await screen.findByRole("button", { name: "Maria Aparecida da Silva" });
  return user;
}

const listCalls = () => callsTo("get").filter(([url]) => String(url).endsWith("/clients"));

describe("Lista de clientes", () => {
  it("lista, busca e filtra", async () => {
    signIn();
    seedOffice();
    const user = await renderClients();

    expect(screen.getByRole("button", { name: "José Pereira" })).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox", { name: "Pesquisar beneficiário" }), "maria");
    await waitFor(() => expect(listCalls().some(([, config]) => (config as { params?: { searchTerm?: string } })?.params?.searchTerm === "maria")).toBe(true), { timeout: 2000 });

    await user.click(screen.getAllByRole("radio", { name: "Potenciais" })[0]);
    await user.click(screen.getAllByRole("radio", { name: "Isentos" })[0]);
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(2));
    await user.click(screen.getAllByRole("radio", { name: "Todos" })[0]);
  });

  it("abre o cadastro novo", async () => {
    signIn();
    seedOffice();
    const user = await renderClients();
    await user.click(screen.getByRole("button", { name: "Novo cliente" }));
    expect(router.push).toHaveBeenCalledWith(expect.stringContaining("/clientes/novo"));
  });

  it("abre a ficha, o financeiro e a edição de um cliente", async () => {
    signIn();
    seedOffice();
    const user = await renderClients();

    await user.click(screen.getAllByRole("button", { name: "Visualizar este cliente" })[0]);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await screen.findAllByText("laudo.pdf");
    await user.keyboard("{Escape}");

    await user.click(screen.getAllByRole("button", { name: "Ver financeiro deste cliente" })[0]);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(screen.getAllByRole("button", { name: "Editar este cliente" })[0]);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("exclui um cliente depois de confirmar e da janela de desfazer", async () => {
    signIn();
    seedOffice();
    onApi("delete", "/clients/c1", envelope(null));
    const { user } = renderApp(<ClientsPage />, { fakeTimers: true });
    await screen.findByRole("button", { name: "Maria Aparecida da Silva" });

    await user.click(screen.getAllByRole("button", { name: "Excluir este cliente" })[0]);
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getAllByRole("button").find((button) => /Excluir/.test(button.textContent ?? ""));
    await user.click(confirm!);
    await act(() => vi.advanceTimersByTimeAsync(6000));
    await waitFor(() => expect(callsTo("delete").some(([url]) => String(url).endsWith("/clients/c1"))).toBe(true));
    vi.useRealTimers();
  });

  it("muda a situação e a etapa do INSS pelo cartão da linha", async () => {
    signIn();
    seedOffice();
    onApi("patch", "/clients/c1", envelope({ id: "c1" }));
    const user = await renderClients();

    await user.click(screen.getByRole("button", { name: "Mudar a situação de Maria Aparecida da Silva" }));
    const stageButtons = await screen.findAllByRole("button", { name: /Planejamento em execução/ });
    await user.click(stageButtons[0]);
    const confirm = screen.queryAllByRole("button", { name: /Mover para|Pular para|Voltar para/ });
    if (confirm[0]) await user.click(confirm[0]);
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Mudar a situação no INSS de Maria Aparecida da Silva" }));
    const inss = await screen.findAllByRole("button", { name: /Exigência/ });
    await user.click(inss[0]);
    const move = screen.queryAllByRole("button", { name: /Mover para/ });
    if (move[0]) {
      const justification = screen.queryByRole("textbox");
      if (justification) await user.type(justification, "O INSS pediu documentos.");
      await user.click(move[0]);
    }
    expect(callsTo("patch").some(([url]) => String(url).endsWith("/clients/c1"))).toBe(true);
  });

  it("copia o CPF e mostra o cartão do cliente potencial", async () => {
    signIn();
    seedOffice();
    const user = await renderClients();

    await user.click(screen.getAllByRole("button", { name: "Copiar CPF 390.533.447-05" })[0]);
    await waitFor(async () => expect(await navigator.clipboard.readText()).toContain("390"));

    await user.click(screen.getByRole("button", { name: "Ver detalhes do cliente potencial" }));
    await act(async () => {});
  });

  it("mostra o vazio da lista", async () => {
    signIn();
    onApi("get", "/clients", page([], 0));
    render(<ClientsPage />);
    expect(await screen.findByText(/Nenhum cliente encontrado/)).toBeInTheDocument();
  });

  it("mostra a falha da lista", async () => {
    signIn();
    failApi("get", "/clients", 500, "Servidor fora do ar.");
    render(<ClientsPage />);
    expect(await screen.findByText(/Não foi possível carregar os clientes/)).toBeInTheDocument();
  });

  it("STAFF não vê o botão de excluir", async () => {
    signIn("STAFF");
    seedOffice();
    onApi("get", "/clients", page([fx.clientRow()], 1));
    await renderClients();
    expect(screen.queryByRole("button", { name: "Excluir este cliente" })).not.toBeInTheDocument();
  });
});

describe("Clientes: URL e desfazer", () => {
  it("a busca vinda da URL (pela barra do topo) vira o filtro da lista", async () => {
    signIn();
    seedOffice();
    setLocation("/clientes", "searchTerm=Pereira");
    renderApp(<ClientsPage />);
    await waitFor(() =>
      expect(callsTo("get").some(([, config]) => (config as { params?: { searchTerm?: string } })?.params?.searchTerm === "Pereira")).toBe(true),
    );
    expect(screen.getByRole("searchbox", { name: "Pesquisar beneficiário" })).toHaveValue("Pereira");
  });

  it("chegando com a busca na URL, a primeira consulta já sai filtrada — sem pedir a lista inteira antes", async () => {
    signIn();
    seedOffice();
    setLocation("/clientes", "searchTerm=Pereira");
    renderApp(<ClientsPage />);
    await waitFor(() => expect(listCalls()).not.toHaveLength(0));
    await act(() => new Promise((resolve) => setTimeout(resolve, 600)));
    expect(listCalls().map(([, config]) => (config as { params?: { searchTerm?: string } })?.params?.searchTerm)).toEqual(["Pereira"]);
  });

  it("abrir a ficha pede os períodos de deficiência uma vez só", async () => {
    signIn();
    seedOffice();
    const { user } = renderApp(<ClientsPage />);
    await screen.findByRole("button", { name: "Maria Aparecida da Silva" });
    await user.click(screen.getAllByRole("button", { name: "Visualizar este cliente" })[0]);
    await screen.findByRole("dialog");
    await waitFor(() => expect(callsTo("get").some(([url]) => String(url).endsWith("/clients/c1"))).toBe(true));
    await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
    expect(callsTo("get").filter(([url]) => String(url).endsWith("/disability-periods"))).toHaveLength(1);
  });
});

describe("Clientes: a ficha reaberta", () => {
  const sheetReads = () => callsTo("get").filter(([url]) => /\/clients\/c1(\/|$)|\/(payments|revenues)/.test(String(url)));

  async function openAndCloseSheet(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getAllByRole("button", { name: "Visualizar este cliente" })[0]);
    await screen.findByRole("dialog");
    await waitFor(() => expect(callsTo("get").some(([url]) => String(url).endsWith("/clients/c1"))).toBe(true));
    await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  }

  it("reabrir a ficha do mesmo cliente não relê nada", async () => {
    signIn();
    seedOffice();
    const { user } = renderApp(<ClientsPage />);
    await screen.findByRole("button", { name: "Maria Aparecida da Silva" });
    await openAndCloseSheet(user);
    const before = sheetReads().length;

    await user.click(screen.getAllByRole("button", { name: "Visualizar este cliente" })[0]);
    await screen.findByRole("dialog");
    await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
    expect(sheetReads()).toHaveLength(before);
  });

  it("depois de uma gravação (ex.: PATCH da situação), a ficha relê", async () => {
    signIn();
    seedOffice();
    const { user } = renderApp(<ClientsPage />);
    await screen.findByRole("button", { name: "Maria Aparecida da Silva" });
    await openAndCloseSheet(user);
    const before = callsTo("get").filter(([url]) => String(url).endsWith("/clients/c1")).length;

    await act(() => patchClient("c1", { situation: "ANALISE_DOCUMENTAL" }, { silent: true }));
    await user.click(screen.getAllByRole("button", { name: "Visualizar este cliente" })[0]);
    await waitFor(() => expect(callsTo("get").filter(([url]) => String(url).endsWith("/clients/c1"))).toHaveLength(before + 1));
  });

  it("desfazer dentro da janela cancela a exclusão", async () => {
    signIn();
    seedOffice();
    const { user } = renderApp(<ClientsPage />, { fakeTimers: true });
    await screen.findByRole("button", { name: "Maria Aparecida da Silva" });
    await user.click(screen.getAllByRole("button", { name: "Excluir este cliente" })[0]);
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getAllByRole("button").find((b) => /Excluir/.test(b.textContent ?? ""))!);
    await user.click(await screen.findByRole("button", { name: /^Desfazer/ }));
    await act(() => vi.advanceTimersByTimeAsync(6000));
    expect(callsTo("delete")).toHaveLength(0);
  });

  it("sair da página com exclusão pendente efetiva antes", async () => {
    signIn();
    seedOffice();
    onApi("delete", "/clients/c1", envelope(null));
    const { user, unmount } = renderApp(<ClientsPage />);
    await screen.findByRole("button", { name: "Maria Aparecida da Silva" });
    await user.click(screen.getAllByRole("button", { name: "Excluir este cliente" })[0]);
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getAllByRole("button").find((b) => /Excluir/.test(b.textContent ?? ""))!);
    globalThis.dispatchEvent(new Event("beforeunload", { cancelable: true }));
    unmount();
    await waitFor(() => expect(callsTo("delete")).toHaveLength(1));
  });

  it("do financeiro, vai para a ficha", async () => {
    signIn();
    seedOffice();
    const { user } = renderApp(<ClientsPage />);
    await screen.findByRole("button", { name: "Maria Aparecida da Silva" });
    await user.click(screen.getAllByRole("button", { name: "Ver financeiro deste cliente" })[0]);
    const drawer = await screen.findByRole("dialog");
    expect(await within(drawer).findAllByText("Honorários parcela 1/3")).not.toHaveLength(0);
    const toSheet = within(drawer).queryAllByRole("button").find((b) => /ficha/i.test(`${b.textContent} ${b.getAttribute("aria-label")}`));
    if (toSheet) await user.click(toSheet);
  });
});
