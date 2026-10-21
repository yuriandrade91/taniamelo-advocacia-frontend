import { screen, waitFor, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import NewClientPage from "@/app/(private)/clientes/novo/page";
import { callsTo, envelope, failApi, onApi } from "../../../support/fakeApi";
import { router } from "../../../support/next";
import { seedOffice } from "../../../support/office";
import { renderApp } from "../../../support/render";
import { signIn } from "../../../support/session";
import { chooseOption } from "../../../support/ui";
import { completeRequired, pasteExample } from "../../../support/clientForm";

/** Cadastro com aposentadoria por deficiência: a seção de períodos aparece. */
async function openDisability() {
  signIn();
  seedOffice();
  const view = renderApp(<NewClientPage />);
  const { user } = view;
  await screen.findByRole("heading", { name: "Cadastro de Cliente" });
  await pasteExample(user);
  await completeRequired(user);
  await user.click(screen.getByRole("tab", { name: /Atendimento/ }));
  chooseOption("Benefício pretendido", "APOSENTADORIA_POR_DEFICIENCIA");
  // O sexo define a tabela da LC 142: a tela confirma o que já está marcado.
  await user.click(await screen.findByRole("button", { name: /Feminino/ }));
  await user.click(screen.getByRole("tab", { name: /Períodos de deficiência/ }));
  await screen.findByRole("button", { name: "Adicionar novo intervalo de deficiência" });
  return user;
}

/** Preenche o intervalo `index`: grau e início (e cessação, se não se mantém). */
async function fillPeriod(user: UserEvent, index: number, start: string, end?: string) {
  chooseOption("Grau da deficiência", "GRAVE", screen.getAllByText("Grau da deficiência")[index].closest("li, fieldset, section, div[data-period], div")!.parentElement!);
  const days = screen.getAllByRole("spinbutton", { name: /dia/ });
  await user.click(days[index * 2]);
  await user.keyboard(start);
  if (end) {
    await user.click(screen.getAllByRole("switch", { name: "Se mantém até a presente data?" })[index]);
    const after = screen.getAllByRole("spinbutton", { name: /dia/ });
    await user.click(after[index * 2 + 1]);
    await user.keyboard(end);
  }
}

describe("Cadastro com períodos de deficiência", () => {
  it("cria o cliente e grava cada período", async () => {
    const user = await openDisability();
    onApi("post", /\/clients$/, envelope({ id: "c9" }));
    onApi("post", "/addresses/batch", envelope([{ id: "a9" }]));
    onApi("post", "/disability-periods", envelope({ id: "dp9" }));

    await fillPeriod(user, 0, "01012010", "31122015");
    await user.click(screen.getByRole("button", { name: "Adicionar novo intervalo de deficiência" }));
    await fillPeriod(user, 1, "01012016");

    await user.click(screen.getByRole("button", { name: "Salvar cliente" }));
    await waitFor(() => expect(callsTo("post").filter(([url]) => String(url).endsWith("/disability-periods"))).toHaveLength(2));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/clientes"));
  });

  it("período inválido segura o cadastro na seção", async () => {
    const user = await openDisability();
    onApi("post", /\/clients$/, envelope({ id: "c9" }));
    // Começa no futuro: a validação recusa.
    await fillPeriod(user, 0, "01012099");
    await user.click(screen.getByRole("button", { name: "Salvar cliente" }));
    expect(callsTo("post").some(([url]) => String(url).endsWith("/clients"))).toBe(false);
    expect(await screen.findAllByText(/futuro/)).not.toHaveLength(0);
  });

  it("falha ao gravar o período fica para o botão da seção", async () => {
    const user = await openDisability();
    onApi("post", /\/clients$/, envelope({ id: "c9" }));
    onApi("post", "/addresses/batch", envelope([{ id: "a9" }]));
    failApi("post", "/disability-periods", 500);
    await fillPeriod(user, 0, "01012010");
    await user.click(screen.getByRole("button", { name: "Salvar cliente" }));
    await screen.findByRole("button", { name: "Concluir" });
    await user.click(screen.getByRole("tab", { name: /Períodos de deficiência/ }));
    const save = await screen.findByRole("button", { name: "Salvar períodos de deficiência" });
    expect(router.push).not.toHaveBeenCalled();

    onApi("post", "/disability-periods", envelope({ id: "dp9" }));
    await user.click(save);
    await waitFor(() => expect(callsTo("post").filter(([url]) => String(url).endsWith("/disability-periods")).length).toBeGreaterThanOrEqual(2));
  });

  it("acrescenta e remove intervalos ainda não gravados", async () => {
    const user = await openDisability();
    await user.click(screen.getByRole("button", { name: "Adicionar novo intervalo de deficiência" }));
    await user.click(screen.getByRole("button", { name: "Adicionar novo intervalo de deficiência" }));
    const removes = screen.getAllByRole("button", { name: /Remover/ });
    expect(removes.length).toBeGreaterThan(1);
    await user.click(removes[0]);
    await user.click(screen.getAllByRole("button", { name: /Remover/ })[0]);
    expect(within(document.body).queryAllByRole("button", { name: /Remover/ })).toHaveLength(0);
  });
});
