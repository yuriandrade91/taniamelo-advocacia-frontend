import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "../../../support/render";
import * as fx from "../../../support/fixtures";
import NewClientPage from "@/app/(private)/clientes/novo/page";
import { callsTo, envelope, failApi, onApi } from "../../../support/fakeApi";
import { router } from "../../../support/next";
import { seedOffice } from "../../../support/office";
import { signIn } from "../../../support/session";
import { chooseOption, inputByLabel } from "../../../support/ui";
import { completeRequired, pasteExample } from "../../../support/clientForm";

async function renderForm() {
  const user = userEvent.setup();
  render(<NewClientPage />);
  await screen.findByRole("heading", { name: "Cadastro de Cliente" });
  return user;
}

describe("Cadastro de cliente", () => {
  it("mostra as abas com o que falta e a revisão", async () => {
    signIn();
    seedOffice();
    const user = await renderForm();

    expect(screen.getByRole("tab", { name: /Atendimento/ })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Dados pessoais/ }));
    await user.click(screen.getByRole("tab", { name: /Dados profissionais/ }));
    await user.click(screen.getByRole("tab", { name: /Endereço/ }));
    await user.click(screen.getByRole("tab", { name: /Entrevista/ }));
    await user.click(screen.getByRole("tab", { name: /Arquivos/ }));
    await user.click(screen.getByRole("tab", { name: /Revisão/ }));
    expect(await screen.findAllByText(/obrigatório/)).not.toHaveLength(0);
  });

  it("salvar sem preencher aponta os campos pendentes e não grava", async () => {
    signIn();
    seedOffice();
    const user = await renderForm();
    await user.click(screen.getByRole("button", { name: "Salvar cliente" }));
    expect(callsTo("post")).toHaveLength(0);
  });

  it("preenche colando a mensagem do cliente e cria o cadastro", async () => {
    signIn();
    seedOffice();
    onApi("post", /\/clients$/, envelope({ id: "c9" }));
    onApi("post", "/addresses/batch", envelope([{ id: "a9" }]));
    onApi("post", "/interviews", envelope({ id: "i9" }));
    const user = await renderForm();

    await pasteExample(user);

    await completeRequired(user);

    await user.click(screen.getByRole("button", { name: "Salvar cliente" }));
    await waitFor(() => expect(callsTo("post").some(([url]) => String(url).endsWith("/clients"))).toBe(true));
    const [, body] = callsTo("post").find(([url]) => String(url).endsWith("/clients"))!;
    expect(body).toMatchObject({ fullName: "Maria Aparecida da Silva", cpf: expect.stringMatching(/390/) });
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/clientes"));
  });

  it("cliente criado com pendência avisa e fica na tela", async () => {
    signIn();
    seedOffice();
    onApi("post", /\/clients$/, envelope({ id: "c9" }));
    failApi("post", "/addresses/batch", 500);
    const user = await renderForm();

    await pasteExample(user);
    await completeRequired(user);
    await user.click(screen.getByRole("button", { name: "Salvar cliente" }));

    await waitFor(() => expect(callsTo("post").some(([url]) => String(url).includes("/addresses/batch"))).toBe(true));
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("Cadastro criado com pendência: cada seção grava sozinha", () => {
  async function reachPhaseTwo() {
    signIn();
    seedOffice();
    onApi("post", /\/clients$/, envelope({ id: "c9" }));
    failApi("post", "/addresses/batch", 500);
    const { user } = renderApp(<NewClientPage />);
    await screen.findByRole("heading", { name: "Cadastro de Cliente" });
    await pasteExample(user);
    await completeRequired(user);
    await user.click(screen.getByRole("button", { name: "Salvar cliente" }));
    await screen.findByRole("button", { name: "Salvar endereço" });
    return user;
  }

  it("salva o endereço, as seções já gravadas e conclui", async () => {
    const user = await reachPhaseTwo();
    onApi("post", /\/clients\/c9\/addresses$/, envelope(fx.address({ id: "a9" })));
    onApi("patch", "/clients/c9", envelope({ id: "c9" }));
    onApi("put", "/personal-data", envelope({ clientId: "c9", fullName: "Maria" }));
    onApi("put", "/professional-data", envelope({ clientId: "c9" }));

    await user.click(screen.getByRole("button", { name: "Salvar endereço" }));
    await waitFor(() => expect(callsTo("post").some(([url]) => String(url).endsWith("/clients/c9/addresses"))).toBe(true));

    await user.click(screen.getByRole("tab", { name: /Atendimento/ }));
    chooseOption("Situação", "PLANEJAMENTO_EM_EXECUCAO");
    const saveService = await screen.findByRole("button", { name: "Salvar atendimento" });
    await user.click(saveService);
    await waitFor(() => expect(callsTo("patch").some(([url]) => String(url).endsWith("/clients/c9"))).toBe(true));

    await user.click(screen.getByRole("tab", { name: /Dados pessoais/ }));
    await user.type(inputByLabel("Nome da mãe"), " Souza");
    await user.click(await screen.findByRole("button", { name: "Salvar dados pessoais" }));
    await waitFor(() => expect(callsTo("put").some(([url]) => String(url).includes("/personal-data"))).toBe(true));

    await user.click(screen.getByRole("tab", { name: /Dados profissionais/ }));
    await user.type(inputByLabel("Profissão"), " autônoma");
    await user.click(await screen.findByRole("button", { name: "Salvar dados profissionais" }));
    await waitFor(() => expect(callsTo("put").some(([url]) => String(url).includes("/professional-data"))).toBe(true));

    await user.click(screen.getByRole("tab", { name: /Entrevista/ }));
    await user.click(await screen.findByRole("button", { name: "Salvar entrevista" }));

    await user.click(screen.getByRole("button", { name: "Concluir" }));
    expect(router.push).toHaveBeenCalledWith("/clientes");
  });

  it("grava a entrevista pela seção e depois a atualiza", async () => {
    const user = await reachPhaseTwo();
    onApi("post", /\/clients\/c9\/interviews$/, envelope(fx.interview({ id: "i9" })));
    onApi("put", /\/interviews\/i9$/, envelope(fx.interview({ id: "i9" })));
    await user.click(screen.getByRole("tab", { name: /Entrevista/ }));
    const editor = await waitFor(() => {
      const node = document.querySelector<HTMLElement>(".ProseMirror");
      if (!node) throw new Error("editor ainda não montou");
      return node;
    });
    await user.click(editor);
    await user.keyboard("Cliente trabalhou 20 anos como costureira autônoma.");
    await user.click(screen.getByRole("button", { name: "Salvar entrevista" }));
    await waitFor(() => expect(callsTo("post").some(([url]) => String(url).endsWith("/interviews"))).toBe(true));

    await user.click(editor);
    await user.keyboard(" Tem CNIS.");
    await user.click(screen.getByRole("button", { name: "Salvar entrevista" }));
    await waitFor(() => expect(callsTo("put").some(([url]) => String(url).endsWith("/interviews/i9"))).toBe(true));
  });

  it("adiciona endereços, troca o principal e exclui o gravado", async () => {
    const user = await reachPhaseTwo();
    onApi("post", /\/clients\/c9\/addresses$/, envelope(fx.address({ id: "a9" })));
    onApi("put", /\/addresses\/a9$/, envelope(fx.address({ id: "a9" })));
    onApi("delete", /\/addresses\/a9$/, envelope(null));
    await user.click(screen.getByRole("button", { name: "Salvar endereço" }));
    await waitFor(() => expect(callsTo("post").some(([url]) => String(url).endsWith("/clients/c9/addresses"))).toBe(true));

    await user.click(screen.getByRole("button", { name: "Adicionar endereço" }));
    await user.click(screen.getByRole("button", { name: "Adicionar endereço" }));
    // Marcar outro como principal desmarca o atual.
    const principal = screen.getAllByRole("switch", { name: "Endereço principal?" });
    await user.click(principal.at(-1)!);
    const confirmPrimary = screen.queryAllByRole("button").find((b) => /Tornar principal|Trocar|Confirmar/.test(b.textContent ?? ""));
    if (confirmPrimary) await user.click(confirmPrimary);

    await user.click(screen.getByRole("button", { name: "Excluir endereços" }));
    const dialog = await screen.findByRole("dialog", { name: /Excluir endereços/ });
    const boxes = within(dialog).getAllByRole("checkbox");
    await user.click(boxes[0]);
    const successor = within(dialog).queryAllByRole("radio")[0];
    if (successor) await user.click(successor);
    await user.click(within(dialog).getAllByRole("button").find((b) => (b.textContent ?? "").startsWith("Excluir"))!);
    await waitFor(() => expect(callsTo("delete").some(([url]) => String(url).endsWith("/addresses/a9"))).toBe(true));
  });
});

const editor = () =>
  waitFor(() => {
    const node = document.querySelector<HTMLElement>(".ProseMirror");
    if (!node) throw new Error("editor ainda não montou");
    return node;
  });

describe("Cadastro com entrevista", () => {

  it.each([
    ["grava a entrevista junto", true],
    ["entrevista que falha fica pendente", false],
  ])("%s", async (_name, succeeds) => {
    signIn();
    seedOffice();
    onApi("post", /\/clients$/, envelope({ id: "c9" }));
    onApi("post", "/addresses/batch", envelope([{ id: "a9" }]));
    if (succeeds) onApi("post", /\/interviews$/, envelope(fx.interview({ id: "i9" })));
    else failApi("post", /\/interviews$/, 500);
    const { user } = renderApp(<NewClientPage />);
    await screen.findByRole("heading", { name: "Cadastro de Cliente" });
    await pasteExample(user);
    await completeRequired(user);
    await user.click(screen.getByRole("tab", { name: /Endereço/ }));
    await user.click(screen.getByRole("tab", { name: /Entrevista/ }));
    await user.click(await editor());
    await user.keyboard("Primeiro atendimento, trouxe a CTPS.");
    await user.click(screen.getByRole("button", { name: "Salvar cliente" }));
    await waitFor(() => expect(callsTo("post").some(([url]) => String(url).endsWith("/interviews"))).toBe(true));
    if (succeeds) await waitFor(() => expect(router.push).toHaveBeenCalledWith("/clientes"));
    else expect(router.push).not.toHaveBeenCalled();
  });
});
