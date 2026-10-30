import { screen, waitFor, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BenefitPaymentModal } from "@/components/payments/BenefitPaymentModal";
import { callsTo, envelope, failApi, onApi, page } from "../../support/fakeApi";
import { renderApp } from "../../support/render";
import { signIn } from "../../support/session";
import { inputByLabel } from "../../support/ui";
import * as fx from "../../support/fixtures";

function openModal() {
  signIn();
  onApi("get", "/clients", page([fx.clientRow()], 1));
  const onSaved = vi.fn();
  const onOpenChange = vi.fn();
  const view = renderApp(<BenefitPaymentModal isOpen onOpenChange={onOpenChange} onSaved={onSaved} />);
  return { ...view, onSaved, onOpenChange };
}

/** Escolhe a cliente na busca, descreve, dá valor, previsão e parcela. */
async function fill(user: UserEvent) {
  const dialog = await screen.findByRole("dialog");
  const client = within(dialog).getAllByRole("combobox").find((el) => el.tagName === "INPUT")!;
  await user.type(client, "Maria");
  await user.click(await screen.findByRole("option", { name: /Maria Aparecida/ }));
  await user.type(inputByLabel("Descrição"), "Atrasados do INSS");
  await user.type(inputByLabel("Valor"), "1200");
  const day = within(dialog).getAllByRole("spinbutton", { name: /dia/ })[0];
  await user.click(day);
  await user.keyboard("10102030");
  await user.click(within(dialog).getByRole("radio", { name: /Parcelado/ }));
  await user.type(inputByLabel("Parcela"), "1");
  await user.type(inputByLabel("De"), "3");
  return dialog;
}

describe("Lançar valor a receber", () => {
  it("grava a parcela do cliente", async () => {
    const { user, onSaved } = openModal();
    onApi("post", /\/clients\/c1\/payments$/, envelope({ id: "p9" }));
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Lançar" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [, body] = callsTo("post").find(([url]) => String(url).endsWith("/clients/c1/payments"))!;
    expect(body).toMatchObject({ description: "Atrasados do INSS", amount: 1200, installmentNumber: 1, installmentTotal: 3 });
  });

  it("já recebido: grava e marca como pago", async () => {
    const { user, onSaved } = openModal();
    onApi("post", /\/clients\/c1\/payments$/, envelope({ id: "p9" }));
    onApi("patch", /\/payments\/p9$/, envelope({ id: "p9" }));
    const dialog = await fill(user);
    await user.click(within(dialog).getByRole("switch", { name: "O cliente já recebeu?" }));
    const days = within(dialog).getAllByRole("spinbutton", { name: /dia/ });
    await user.click(days.at(-1)!);
    await user.keyboard("01012024");
    await user.click(screen.getByRole("button", { name: "Lançar" }));
    await waitFor(() => expect(callsTo("patch").some(([url]) => String(url).endsWith("/payments/p9"))).toBe(true));
    expect(onSaved).toHaveBeenCalled();
  });

  it("falha ao marcar como pago avisa, mas o lançamento fica", async () => {
    const { user, onSaved } = openModal();
    onApi("post", /\/clients\/c1\/payments$/, envelope({ id: "p9" }));
    failApi("patch", /\/payments\/p9$/, 500);
    const dialog = await fill(user);
    await user.click(within(dialog).getByRole("switch", { name: "O cliente já recebeu?" }));
    const days = within(dialog).getAllByRole("spinbutton", { name: /dia/ });
    await user.click(days.at(-1)!);
    await user.keyboard("01012024");
    await user.click(screen.getByRole("button", { name: "Lançar" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("sem os obrigatórios, não grava; parcela maior que o total é recusada", async () => {
    const { user } = openModal();
    await user.click(await screen.findByRole("button", { name: "Lançar" }));
    expect(callsTo("post")).toHaveLength(0);
    // Com o erro, o foco abre a busca do cliente, que esconde o resto da modal dos papéis.
    await user.click(screen.getByRole("radio", { name: /Parcelado/, hidden: true }));
    await user.type(inputByLabel("Parcela"), "5");
    await user.type(inputByLabel("De"), "3");
    await user.type(inputByLabel("Observações"), "conferir com o INSS");
    await user.click(screen.getByRole("button", { name: "Lançar" }));
    expect(callsTo("post")).toHaveLength(0);
  });

  it("falha ao gravar mantém o modal aberto", async () => {
    const { user, onSaved, onOpenChange } = openModal();
    failApi("post", /\/clients\/c1\/payments$/, 500);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Lançar" }));
    await waitFor(() => expect(callsTo("post")).toHaveLength(1));
    expect(onSaved).not.toHaveBeenCalled();
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
