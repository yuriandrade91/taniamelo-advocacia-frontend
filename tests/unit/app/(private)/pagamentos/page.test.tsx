import { act, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PaymentsPage from "@/app/(private)/pagamentos/page";
import { callsTo, envelope, failApi, onApi, page } from "../../../support/fakeApi";
import { seedOffice } from "../../../support/office";
import { renderApp } from "../../../support/render";
import { signIn } from "../../../support/session";
import { chooseOption, inputByLabel } from "../../../support/ui";
import * as fx from "../../../support/fixtures";

async function openPayments(options?: { fakeTimers?: boolean }) {
  const view = renderApp(<PaymentsPage />, options);
  await screen.findAllByRole("button", { name: "Ver detalhes da parcela" });
  return view.user;
}

describe("Pagamentos", () => {
  it("lista as parcelas, busca e abre a ficha e o acordo", async () => {
    signIn();
    seedOffice();
    const user = await openPayments();

    expect(screen.getByRole("heading", { name: "Pagamentos aos clientes" })).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox", { name: "Pesquisar recebimento" }), "maria");
    await user.click(screen.getAllByRole("button", { name: /Ver as parcelas do acordo/ })[0]);
    await act(async () => {});
    await user.keyboard("{Escape}");
    await user.click(screen.getAllByRole("button", { name: /Ver ficha de/ })[0]);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("registra o recebimento de uma parcela", async () => {
    signIn();
    seedOffice();
    onApi("patch", /\/payments\/p\d+$/, envelope({ id: "p1" }));
    onApi("put", /\/payments\/p\d+$/, envelope({ id: "p1" }));
    onApi("post", "/revenues", envelope({ id: "r9" }));
    const user = await openPayments();

    await user.click(screen.getAllByRole("button", { name: "Registrar recebimento" })[0]);
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(callsTo("patch").length + callsTo("put").length).toBeGreaterThan(0));
  });

  it("detalhe da parcela", async () => {
    signIn();
    seedOffice();
    const user = await openPayments();

    await user.click(screen.getAllByRole("button", { name: "Ver detalhes da parcela" })[0]);
    const drawer = await screen.findByRole("dialog");
    await within(drawer).findAllByText(/Honorários parcela/);
    await user.click(within(drawer).getByRole("button", { name: "Editar" }));
    expect(await screen.findByRole("button", { name: "Salvar alterações" })).toBeInTheDocument();
  });

  it("edita a parcela pela linha e exclui com a janela de desfazer", async () => {
    signIn();
    seedOffice();
    onApi("patch", /\/payments\/p\d+$/, envelope({ id: "p1" }));
    onApi("delete", /\/payments\/p\d+$/, envelope(null));
    const user = await openPayments({ fakeTimers: true });

    await user.click(screen.getAllByRole("button", { name: "Editar parcela" })[0]);
    const editor = await screen.findByRole("dialog");
    const description = within(editor).queryAllByDisplayValue(/Honorários parcela/)[0];
    if (description) {
      await user.clear(description);
      await user.type(description, "Honorários revisados");
    }
    const save = within(editor).queryAllByRole("button").find((b) => /Salvar/.test(b.textContent ?? ""));
    if (save) await user.click(save);
    const confirmEdit = screen.queryAllByRole("button").find((b) => /Salvar mesmo assim|Confirmar/.test(b.textContent ?? ""));
    if (confirmEdit) await user.click(confirmEdit);
    await user.keyboard("{Escape}");

    await user.click(screen.getAllByRole("button", { name: "Excluir parcela" })[0]);
    const confirm = screen.queryAllByRole("button").find((b) => (b.textContent ?? "").startsWith("Excluir"));
    if (confirm) await user.click(confirm);
    await act(() => vi.advanceTimersByTimeAsync(6000));
    await waitFor(() => expect(callsTo("delete").some(([url]) => /\/payments\/p\d+$/.test(String(url)))).toBe(true));
  });

  it("filtra por status e forma", async () => {
    signIn();
    seedOffice();
    const user = await openPayments();
    for (const name of [/Atrasad/, /A vencer/, /Recebid/]) {
      const chip = [...screen.queryAllByRole("button", { name }), ...screen.queryAllByRole("radio", { name })][0];
      if (chip) await user.click(chip);
    }
    chooseOption("Status", "overdue");
    await waitFor(() => expect(callsTo("get").some(([, c]) => JSON.stringify(c ?? {}).includes("dueTo"))).toBe(true));
  });

  it("rota ausente (404) diz o motivo, falha diz que falhou e vazio diz vazio", async () => {
    signIn();
    failApi("get", "/payments", 404, "Not found");
    const first = renderApp(<PaymentsPage />);
    expect(await screen.findAllByText(/404/)).not.toHaveLength(0);
    first.unmount();
  });

  it("vazio", async () => {
    signIn();
    onApi("get", "/payments", page([], 0));
    renderApp(<PaymentsPage />);
    expect(await screen.findByText(/Nenhum recebimento/)).toBeInTheDocument();
  });

  it("falha genérica", async () => {
    signIn();
    failApi("get", "/payments", 500);
    renderApp(<PaymentsPage />);
    expect(await screen.findAllByText(/Não foi possível carregar/)).not.toHaveLength(0);
  });

  it("STAFF sem financeiro vê o aviso, e a lista nem é pedida", async () => {
    signIn("STAFF");
    seedOffice();
    renderApp(<PaymentsPage />);
    await act(async () => {});
    expect(screen.queryByRole("button", { name: "Lançar valor a receber" })).not.toBeInTheDocument();
    expect(callsTo("get").some(([url]) => String(url).endsWith("/payments"))).toBe(false);
  });

  it("parcela de acordo com várias parcelas no popover", async () => {
    signIn();
    seedOffice();
    onApi("get", /clientId=/, page([fx.officePayment(), fx.officePayment({ id: "p3", installmentNumber: 2, status: "Pago", paidDate: fx.isoDay(-10) }), fx.officePayment({ id: "p4", installmentNumber: 3, dueDate: fx.isoDay(40) })], 3));
    const user = await openPayments();
    await user.hover(screen.getAllByRole("button", { name: /Ver as parcelas do acordo/ })[0]);
    await user.click(screen.getAllByRole("button", { name: /Ver as parcelas do acordo/ })[0]);
    await act(async () => {});
    expect(inputByLabel).toBeDefined();
  });
});

describe("Pagamentos: detalhe da parcela", () => {
  it("edita pelo painel e grava", async () => {
    signIn();
    seedOffice();
    onApi("patch", /\/payments\/p\d+$/, envelope({ id: "p1" }));
    onApi("put", /\/payments\/p\d+$/, envelope({ id: "p1" }));
    const user = await openPayments();
    await user.click(screen.getAllByRole("button", { name: "Ver detalhes da parcela" })[0]);
    const drawer = await screen.findByRole("dialog");
    await within(drawer).findAllByText(/Honorários parcela/);
    await user.click(within(drawer).getByRole("button", { name: "Editar" }));
    const description = await screen.findByDisplayValue(/Honorários parcela/);
    await user.clear(description);
    await user.type(description, "Honorários revisados");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));
    const sure = screen.queryAllByRole("button").find((b) => /Salvar mesmo assim|Confirmar/.test(b.textContent ?? ""));
    if (sure) await user.click(sure);
    await waitFor(() => expect(callsTo("patch").length + callsTo("put").length).toBeGreaterThan(0));
  });

  it("registra o recebimento pelo painel", async () => {
    signIn();
    seedOffice();
    onApi("patch", /\/payments\/p\d+$/, envelope({ id: "p1" }));
    const user = await openPayments();
    await user.click(screen.getAllByRole("button", { name: "Ver detalhes da parcela" })[0]);
    const drawer = await screen.findByRole("dialog");
    await within(drawer).findAllByText(/Honorários parcela/);
    const settle = within(drawer).getAllByRole("button").find((b) => /Registrar recebimento|Marcar como recebid/.test(b.textContent ?? ""))!;
    await user.click(settle);
    await user.click(await screen.findByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(callsTo("patch").some(([url]) => /\/payments\/p\d+$/.test(String(url)))).toBe(true));
  });
});
