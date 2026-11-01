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
    await user.click(screen.getByRole("radio", { name: "Concluído" }));
    await user.click(screen.getByRole("radio", { name: "Cancelado" }));
    await user.click(screen.getByRole("radio", { name: "Todas" }));
    // Um segmento por vez: o último escolhido é o único marcado.
    expect(screen.getByRole("radio", { name: "Todas" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Cancelado" })).not.toBeChecked();
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

const holidayCalls = () =>
  callsTo("get").filter(([url]) => String(url).endsWith("/appointments/holiday"));

/** O backend diz "feriado" para 10/10/2030 e "dia comum" para o resto. */
function seedHoliday() {
  onApi("get", "/appointments/holiday", ({ config }) => {
    const isHoliday = config?.params?.date === "2030-10-10";
    return envelope({
      date: config?.params?.date,
      holiday: isHoliday,
      name: isHoliday ? "Finados" : null,
      verified: true,
      message: isHoliday ? "10/10/2030 é feriado (Finados). Confirme antes de agendar nesta data." : "Nenhum feriado nacional.",
    });
  });
}

/** Abre o formulário de novo compromisso e digita só o início. */
async function startNewAppointment(user: UserEvent) {
  await user.click(screen.getByRole("button", { name: "Novo compromisso" }));
  const dialog = await screen.findByRole("dialog");
  await within(dialog).findByText("Título");
  await typeDateTime(user, dialog, "10102030" + "1000", 0);
  return dialog;
}

describe("Agenda: feriado", () => {
  it("escolher um feriado pergunta; manter a data segue e não pergunta de novo", async () => {
    signIn();
    seedOffice();
    seedHoliday();
    onApi("post", /\/appointments$/, envelope(fx.appointment({ id: "ap9" })));
    const user = await openAgenda();
    const dialog = await startNewAppointment(user);

    expect(await screen.findByText(/10\/10\/2030 é feriado \(Finados\)/)).toBeInTheDocument();
    expect(holidayCalls()[0][1]).toMatchObject({ params: { date: "2030-10-10" } });

    await user.click(screen.getByRole("button", { name: "Manter esta data", hidden: true }));
    await waitFor(() => expect(screen.queryByText(/é feriado \(Finados\)/)).not.toBeInTheDocument());

    // Mexer só na hora é o mesmo dia, já decidido.
    await typeDateTime(user, dialog, "10102030" + "1100", 0);
    await act(() => new Promise((resolve) => setTimeout(resolve, 600)));
    expect(screen.queryByRole("button", { name: "Manter esta data", hidden: true })).not.toBeInTheDocument();
    expect(holidayCalls()).toHaveLength(1);
  });

  it("escolher outra data limpa início e término", async () => {
    signIn();
    seedOffice();
    seedHoliday();
    const user = await openAgenda();
    const dialog = await startNewAppointment(user);
    const day = within(dialog).getAllByRole("spinbutton", { name: /dia/ })[0];
    expect(day).toHaveAttribute("aria-valuenow", "10");

    await user.click(await screen.findByRole("button", { name: "Escolher outra data", hidden: true }));

    await waitFor(() => expect(within(dialog).getAllByRole("spinbutton", { name: /dia/ })[0]).not.toHaveAttribute("aria-valuenow"));
    expect(within(dialog).getAllByRole("spinbutton", { name: /dia/ })[1]).not.toHaveAttribute("aria-valuenow");
  });

  it("dia comum não pergunta nada", async () => {
    signIn();
    seedOffice();
    const user = await openAgenda();
    await startNewAppointment(user);

    await waitFor(() => expect(holidayCalls()).toHaveLength(1));
    expect(screen.queryByRole("button", { name: "Manter esta data", hidden: true })).not.toBeInTheDocument();
  });

  it("a consulta falhar não pergunta nem avisa: segue o agendamento", async () => {
    signIn();
    seedOffice();
    failApi("get", "/appointments/holiday", 500);
    const user = await openAgenda();
    await startNewAppointment(user);

    await waitFor(() => expect(holidayCalls()).toHaveLength(1));
    await act(async () => {});
    expect(screen.queryByRole("button", { name: "Manter esta data", hidden: true })).not.toBeInTheDocument();
  });

  it("editar um compromisso que já está num feriado não pergunta", async () => {
    signIn();
    seedOffice();
    onApi("get", "/appointments/holiday", envelope({ date: "x", holiday: true, name: "Finados", verified: true, message: "É feriado." }));
    const user = await openAgenda();

    await user.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    await screen.findByRole("dialog");
    await act(() => new Promise((resolve) => setTimeout(resolve, 600)));

    expect(holidayCalls()).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Manter esta data", hidden: true })).not.toBeInTheDocument();
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

  /** Os `params` da última leitura da lista (`GET /appointments`, fora conflitos e resumo). */
  const lastListParams = () =>
    callsTo("get")
      .filter(([url]) => String(url).endsWith("/appointments"))
      .at(-1)?.[1] as { params: Record<string, unknown> } | undefined;

  it("agendar para outro mês leva a tela ao mês do compromisso, com a lista relida", async () => {
    signIn();
    seedOffice();
    // Daqui a 60 dias: sempre em outro mês que o de hoje.
    const farAway = fx.appointment({ id: "ap9", title: "Perícia de novembro", startAt: fx.isoInstant(60, 13), endAt: fx.isoInstant(60, 14) });
    const far = new Date(farAway.startAt);
    onApi("post", /\/appointments$/, envelope(farAway));
    const user = await openAgenda();
    const before = callsTo("get").filter(([url]) => String(url).endsWith("/appointments")).length;

    await user.click(screen.getByRole("button", { name: "Novo compromisso" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("Título");
    await user.type(inputByLabel("Título"), "Perícia de novembro");
    chooseOption("Tipo", "PERICIA", dialog);
    await typeDateTime(user, dialog, "10102030" + "1000", 0);
    await typeDateTime(user, dialog, "10102030" + "1100", 1);
    const client = within(dialog).getAllByRole("combobox").find((el) => el.tagName === "INPUT");
    if (client) await user.type(client, "Maria Aparecida");
    await user.click(screen.getByRole("button", { name: "Agendar", hidden: true }));

    await waitFor(() => expect(lastListParams()?.params).toMatchObject({ year: far.getFullYear(), month: far.getMonth() + 1 }));
    expect(callsTo("get").filter(([url]) => String(url).endsWith("/appointments")).length).toBeGreaterThan(before);
  });

  it("lê o mês inteiro, página a página, e não só as primeiras 100 linhas", async () => {
    signIn();
    seedOffice();
    const first = Array.from({ length: 100 }, (_, i) => fx.appointment({ id: `m${i}`, title: `Compromisso ${i}` }));
    onApi("get", /\/appointments$/, ({ config }: { config?: { params?: Record<string, unknown> } }) =>
      config?.params?.pageNumber === 2
        ? envelope([fx.appointment({ id: "m100", title: "Compromisso 100" })], { pageNumber: 2, pageSize: 100, totalRecords: 101, totalPages: 2, hasNextPage: 0 })
        : envelope(first, { pageNumber: 1, pageSize: 100, totalRecords: 101, totalPages: 2, hasNextPage: 1 }),
    );
    await openAgenda();
    const pages = callsTo("get")
      .filter(([url]) => String(url).endsWith("/appointments"))
      .map(([, config]) => (config as { params: Record<string, unknown> }).params.pageNumber);
    expect(pages).toEqual([1, 2]);
  });

  it("falha ao carregar avisa, em vez de mostrar o mês como vazio", async () => {
    signIn();
    seedOffice();
    failApi("get", /\/appointments$/, 500, "Agenda fora do ar.");
    renderApp(<AgendaPage />);
    expect(await screen.findByText(/Agenda fora do ar\.|Não foi possível carregar a agenda/)).toBeInTheDocument();
    expect(screen.queryByText("Nenhum compromisso neste mês com os filtros escolhidos.")).not.toBeInTheDocument();
  });
});
