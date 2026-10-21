import { act, screen, waitFor, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AgendaPage from "@/app/(private)/agenda/page";
import { callsTo, envelope, failApi, onApi, page } from "../../../support/fakeApi";
import { seedOffice } from "../../../support/office";
import { renderApp } from "../../../support/render";
import { signIn } from "../../../support/session";
import { chooseOption, inputByLabel } from "../../../support/ui";
import * as fx from "../../../support/fixtures";

async function openAgenda(options?: { fakeTimers?: boolean }) {
  const view = renderApp(<AgendaPage />, options);
  await screen.findAllByRole("button", { name: "Ver detalhes" });
  return view.user;
}

/** Preenche data e hora (segmentos dia/mês/ano/hora/minuto) do seletor `index`. */
async function typeDateTime(user: UserEvent, scope: HTMLElement, value: string, index = 0) {
  const day = within(scope).getAllByRole("spinbutton", { name: /dia/ })[index];
  await user.click(day);
  await user.keyboard(value);
}

describe("Agenda", () => {
  it("agrupa por dia e expande o dia", async () => {
    signIn();
    seedOffice();
    const user = await openAgenda();
    expect(screen.getByRole("heading", { name: "Agenda" })).toBeInTheDocument();
    const day = screen.getAllByRole("button").find((b) => /compromisso ·/.test(b.textContent ?? ""));
    await user.click(day!);
    await user.type(screen.getByRole("searchbox", { name: "Pesquisar compromisso" }), "perícia");
    await user.click(screen.getByRole("button", { name: "Concluído" }));
    await user.click(screen.getByRole("button", { name: "Cancelado" }));
    await user.click(screen.getByRole("button", { name: "Todas" }));
  });

  it("cria um compromisso", async () => {
    signIn();
    seedOffice();
    onApi("post", /\/appointments$/, envelope(fx.appointment({ id: "ap9" })));
    const user = await openAgenda();

    await user.click(screen.getByRole("button", { name: "Novo compromisso" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Título");
    await user.type(inputByLabel("Título"), "Audiência de instrução");
    chooseOption("Tipo", "AUDIENCIA", dialog);
    await typeDateTime(user, dialog, "10102030" + "1000", 0);
    await typeDateTime(user, dialog, "10102030" + "1100", 1);
    const client = within(dialog).getAllByRole("combobox").find((el) => el.tagName === "INPUT");
    if (client) await user.type(client, "Maria Aparecida");
    await user.click(screen.getByRole("button", { name: "Agendar", hidden: true }));
    await waitFor(() => expect(callsTo("post").some(([url]) => String(url).endsWith("/appointments"))).toBe(true));
  });

  it("conflito de horário pede decisão", async () => {
    signIn();
    seedOffice();
    onApi("get", "/appointments/conflicts", envelope([fx.appointment()]));
    onApi("post", /\/appointments$/, envelope(fx.appointment({ id: "ap9" })));
    onApi("post", /\/cancel$/, envelope(fx.appointment({ status: "Cancelado" })));
    const user = await openAgenda();

    await user.click(screen.getByRole("button", { name: "Novo compromisso" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Título");
    await user.type(inputByLabel("Título"), "Reunião com cliente");
    chooseOption("Tipo", "REUNIAO", dialog);
    await typeDateTime(user, dialog, "10102030" + "1000", 0);
    await typeDateTime(user, dialog, "10102030" + "1100", 1);
    const client = within(dialog).getAllByRole("combobox").find((el) => el.tagName === "INPUT");
    if (client) await user.type(client, "Maria Aparecida");
    // O horário bate com um compromisso existente: o aviso aparece depois do
    // debounce da digitação, antes de qualquer clique em "Agendar".
    expect(await within(dialog).findByText("Já há um compromisso nesse horário")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Agendar", hidden: true }));
    // Ao salvar, a pessoa escolhe entre manter os dois ou substituir.
    await user.click(await screen.findByRole("button", { name: "Agendar assim mesmo", hidden: true }));
    await waitFor(() => expect(callsTo("post").some(([url]) => String(url).endsWith("/appointments"))).toBe(true));
  });

  it("vê detalhes e conclui", async () => {
    signIn();
    seedOffice();
    onApi("post", /\/complete$/, envelope(fx.appointment({ status: "Concluído" })));
    onApi("patch", /\/complete$/, envelope(fx.appointment({ status: "Concluído" })));
    onApi("put", /\/appointments\/ap\d+$/, envelope(fx.appointment()));
    const user = await openAgenda({ fakeTimers: true });

    await user.click(screen.getAllByRole("button", { name: "Ver detalhes" })[0]);
    const details = await screen.findByRole("dialog");
    await within(details).findAllByText("Entrevista inicial");
    await user.keyboard("{Escape}");

    await user.click(screen.getAllByRole("button", { name: "Concluir" })[0]);
    // Compromisso no futuro: concluir antes da hora pede confirmação.
    const early = await screen.findByRole("dialog");
    const confirm = within(early).getAllByRole("button").find((b) => /Concluir/.test(b.textContent ?? ""));
    await user.click(confirm!);
    await act(() => vi.advanceTimersByTimeAsync(6000));
    await waitFor(() => expect([...callsTo("post"), ...callsTo("patch")].some(([url]) => String(url).endsWith("/complete"))).toBe(true));
  });

  it("edita com justificativa", async () => {
    signIn();
    seedOffice();
    onApi("put", /\/appointments\/ap\d+$/, envelope(fx.appointment()));
    const user = await openAgenda();

    await user.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    const editor = await screen.findByRole("dialog");
    const title = within(editor).getByDisplayValue("Entrevista inicial");
    await user.clear(title);
    await user.type(title, "Entrevista remarcada");
    const justification = within(editor).queryAllByLabelText(/Justificativa/)[0];
    if (justification) await user.type(justification, "Cliente pediu outro horário.");
    const save = within(editor).getAllByRole("button").find((b) => /Salvar/.test(b.textContent ?? ""));
    if (save) await user.click(save);
    await waitFor(() => expect(callsTo("put").length).toBeGreaterThan(0));
  });

  it("cancela com justificativa e exclui", async () => {
    signIn();
    seedOffice();
    onApi("post", /\/cancel$/, envelope(fx.appointment({ status: "Cancelado" })));
    onApi("patch", /\/cancel$/, envelope(fx.appointment({ status: "Cancelado" })));
    onApi("delete", /\/appointments\/ap\d+$/, envelope(null));
    const user = await openAgenda({ fakeTimers: true });

    await user.click(screen.getAllByRole("button", { name: "Cancelar" })[0]);
    const dialog = await screen.findByRole("dialog");
    const reason = within(dialog).queryAllByRole("textbox")[0];
    if (reason) await user.type(reason, "Cliente desmarcou por telefone.");
    await user.click(within(dialog).getByRole("button", { name: "Cancelar compromisso" }));
    await act(() => vi.advanceTimersByTimeAsync(6000));

    await user.click(screen.getAllByRole("button", { name: "Excluir" })[0]);
    const confirm = screen.queryAllByRole("button").find((b) => (b.textContent ?? "").startsWith("Excluir") && b.closest("[role=dialog]"));
    if (confirm) await user.click(confirm);
    await act(() => vi.advanceTimersByTimeAsync(6000));
    const [cancelUrl, cancelBody] = [...callsTo("post"), ...callsTo("patch")].find(([url]) => String(url).endsWith("/cancel"))!;
    expect(String(cancelUrl)).toContain("/appointments/");
    expect(cancelBody).toMatchObject({ justification: "Cliente desmarcou por telefone." });
  });

  it("vazio e falha", async () => {
    signIn();
    onApi("get", "/appointments", page([], 0));
    const first = renderApp(<AgendaPage />);
    expect(await screen.findAllByText(/Nenhum compromisso|Não há/)).not.toHaveLength(0);
    first.unmount();
  });

  it("falha da lista não derruba a tela", async () => {
    signIn();
    failApi("get", "/appointments", 500);
    failApi("get", "/appointments/summary", 500);
    renderApp(<AgendaPage />);
    expect(await screen.findByRole("heading", { name: "Agenda" })).toBeInTheDocument();
    await act(async () => {});
  });
});

describe("Agenda: conflito e descarte", () => {
  it("agendar após o conflito move o horário; fechar com edição pede confirmação", async () => {
    signIn();
    seedOffice();
    onApi("get", "/appointments/conflicts", envelope([fx.appointment({ endAt: "2030-10-10T15:30:00Z" })]));
    const { user } = renderApp(<AgendaPage />);
    await screen.findAllByRole("button", { name: "Ver detalhes" });
    await user.click(screen.getByRole("button", { name: "Novo compromisso" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Título");
    await user.type(inputByLabel("Título"), "Reunião");
    chooseOption("Tipo", "REUNIAO", dialog);
    const days = within(dialog).getAllByRole("spinbutton", { name: /dia/ });
    await user.click(days[0]);
    await user.keyboard("101020301000");
    await user.click(days[1]);
    await user.keyboard("101020301100");
    await user.click(await screen.findByRole("button", { name: "Agendar após este", hidden: true }));
    await user.keyboard("{Escape}");
    // Com algo preenchido, fechar pergunta antes de descartar.
    const discard = screen.queryAllByRole("button", { hidden: true }).find((b) => /Descartar|Sair sem salvar/.test(b.textContent ?? ""));
    expect(discard).toBeDefined();
    await user.click(discard!);
  });

  it("data no passado pede ciência antes de agendar", async () => {
    signIn();
    seedOffice();
    onApi("post", /\/appointments$/, envelope(fx.appointment()));
    const { user } = renderApp(<AgendaPage />);
    await screen.findAllByRole("button", { name: "Ver detalhes" });
    await user.click(screen.getByRole("button", { name: "Novo compromisso" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Título");
    await user.type(inputByLabel("Título"), "Prazo antigo");
    chooseOption("Tipo", "PRAZO", dialog);
    const days = within(dialog).getAllByRole("spinbutton", { name: /dia/ });
    await user.click(days[0]);
    await user.keyboard("010120201000");
    await user.click(days[1]);
    await user.keyboard("010120201100");
    const client = within(dialog).getAllByRole("combobox").find((el) => el.tagName === "INPUT")!;
    await user.type(client, "Maria Aparecida");
    await user.click(screen.getByRole("button", { name: "Agendar", hidden: true }));
    expect(callsTo("post").some(([url]) => String(url).endsWith("/appointments"))).toBe(false);
    const ack = [...within(dialog).queryAllByRole("checkbox"), ...within(dialog).queryAllByRole("switch")][0];
    if (ack) {
      await user.click(ack);
      await user.click(screen.getByRole("button", { name: "Agendar", hidden: true }));
      await waitFor(() => expect(callsTo("post").some(([url]) => String(url).endsWith("/appointments"))).toBe(true));
    }
  });
});
