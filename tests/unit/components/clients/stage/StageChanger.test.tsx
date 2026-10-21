import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ClientsPage from "@/app/(private)/clientes/page";
import { callsTo, envelope, failApi, onApi, page } from "../../../support/fakeApi";
import { seedOffice } from "../../../support/office";
import { renderApp } from "../../../support/render";
import { signIn } from "../../../support/session";
import * as fx from "../../../support/fixtures";
import type { SituationLabel } from "@/enums/situation/Situation";

/**
 * Mudar a situação pela lista: avançar uma etapa grava na hora; pular ou
 * voltar pede justificativa num diálogo, e a justificativa vai no PATCH.
 */
async function openStageCard(situation: SituationLabel = "Análise documental") {
  signIn();
  seedOffice();
  onApi("get", "/clients", page([fx.clientRow({ situation })], 1));
  onApi("patch", "/clients/c1", envelope({ id: "c1" }));
  const view = renderApp(<ClientsPage />);
  await screen.findByRole("button", { name: "Maria Aparecida da Silva" });
  await view.user.click(screen.getByRole("button", { name: "Mudar a situação de Maria Aparecida da Silva" }));
  return view.user;
}

const stageButton = async (label: RegExp) => (await screen.findAllByRole("button", { name: label }))[0];
const dialogButton = (dialog: HTMLElement, text: RegExp) => within(dialog).getAllByRole("button").find((b) => text.test(b.textContent ?? ""))!;

describe("Mudar a situação", () => {
  it("avançar uma etapa grava sem perguntar", async () => {
    const user = await openStageCard();
    await user.click(await stageButton(/^Planejamento em execução/));
    await user.click(screen.getByRole("button", { name: /Mover para/ }));
    await waitFor(() => expect(callsTo("patch").at(-1)?.[1]).toMatchObject({ situation: "PLANEJAMENTO_EM_EXECUCAO" }));
  });

  it("pular etapas pede justificativa e lista as puladas", async () => {
    const user = await openStageCard();
    await user.click(await stageButton(/^Benefício futuro/));
    await user.click(screen.getByRole("button", { name: /Pular para/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("list", { name: "Etapas puladas" })).toBeInTheDocument();

    const confirm = dialogButton(dialog, /^Pular para/);
    await user.click(confirm);
    expect(callsTo("patch")).toHaveLength(0);

    await user.type(within(dialog).getByRole("textbox"), "Documentação completa já entregue.");
    await user.click(dialogButton(dialog, /^Pular para/));
    await waitFor(() => expect(callsTo("patch").at(-1)?.[1]).toMatchObject({ situation: "BENEFICIO_FUTURO" }));
  });

  it("voltar etapa também pede justificativa; cancelar desiste", async () => {
    const user = await openStageCard("Planejamento concluído");
    await user.click(await stageButton(/^Formulário preenchido/));
    await user.click(screen.getByRole("button", { name: /Voltar para/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(dialogButton(dialog, /Cancelar|Manter/));
    expect(callsTo("patch")).toHaveLength(0);
  });

  it("falha ao gravar mantém a lista como estava", async () => {
    signIn();
    seedOffice();
    onApi("get", "/clients", page([fx.clientRow()], 1));
    failApi("patch", "/clients/c1", 500);
    const { user } = renderApp(<ClientsPage />);
    await screen.findByRole("button", { name: "Maria Aparecida da Silva" });
    await user.click(screen.getByRole("button", { name: "Mudar a situação de Maria Aparecida da Silva" }));
    await user.click(await stageButton(/^Planejamento em execução/));
    await user.click(screen.getByRole("button", { name: /Mover para/ }));
    await waitFor(() => expect(callsTo("patch")).toHaveLength(1));
  });

  it("etapa do INSS: pular para deferimento e voltar de indeferimento para recurso", async () => {
    signIn();
    seedOffice();
    onApi("get", "/clients", page([fx.clientRow({ requestStage: "Indeferimento" })], 1));
    onApi("patch", "/clients/c1", envelope({ id: "c1" }));
    const { user } = renderApp(<ClientsPage />);
    await screen.findByRole("button", { name: "Maria Aparecida da Silva" });
    await user.click(screen.getByRole("button", { name: "Mudar a situação no INSS de Maria Aparecida da Silva" }));
    await user.click(await stageButton(/^Recurso/));
    const justification = screen.queryAllByRole("textbox").at(-1);
    if (justification) await user.type(justification, "Recurso protocolado na JR.");
    await user.click(screen.getByRole("button", { name: /Mover para/ }));
    await waitFor(() => expect(callsTo("patch").at(-1)?.[1]).toMatchObject({ requestStage: "RECURSO" }));
  });
});
