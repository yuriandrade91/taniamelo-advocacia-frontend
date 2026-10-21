import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/(private)/home/page";
import { callsTo, envelope, failApi, onApi, page } from "../../../support/fakeApi";
import { seedOffice } from "../../../support/office";
import { signIn } from "../../../support/session";
import * as fx from "../../../support/fixtures";

async function renderHome() {
  const user = userEvent.setup();
  render(<HomePage />);
  await screen.findByRole("button", { name: "Abrir a ficha de José Pereira" });
  return user;
}

describe("Home", () => {
  it("monta os cartões com os dados do escritório", async () => {
    signIn();
    seedOffice();
    await renderHome();

    expect(screen.getByRole("heading", { name: "Formulários pendentes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Próximas receitas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Esteira do contribuinte" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Chamar José Pereira no WhatsApp/ })).toBeInTheDocument();
    expect(await screen.findAllByText("Entrevista inicial")).not.toHaveLength(0);
  });

  it("sem permissão de financeiro, não consulta pagamentos nem despesas", async () => {
    signIn("STAFF");
    seedOffice();
    await renderHome();
    const urls = callsTo("get").map(([url]) => String(url));
    expect(urls.some((url) => url.endsWith("/payments"))).toBe(false);
    expect(urls.some((url) => url.includes("/expenses/summary"))).toBe(false);
  });

  it("abre os formulários pendentes e a ficha de quem está na esteira", async () => {
    signIn();
    seedOffice();
    onApi("get", /situation=FORMULARIO_PREENCHIDO|situation%5B%5D=FORMULARIO/, page([fx.clientRow({ id: "c2", fullName: "José Pereira", situation: "Formulário preenchido" })], 1));
    const user = await renderHome();

    await user.click(screen.getByRole("button", { name: "Entrar em contato" }));
    const leads = await screen.findByRole("dialog", { name: /Formulários pendentes/ });
    expect(leads).toBeInTheDocument();
    await waitFor(() => expect(within(leads).queryAllByText(/José Pereira|Maria Aparecida/).length).toBeGreaterThan(0));

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Abrir a ficha de Maria Aparecida da Silva" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await screen.findAllByText(/Maria Aparecida da Silva/);
  });

  it("avança um cliente na esteira pelo botão do cartão", async () => {
    signIn();
    seedOffice();
    onApi("patch", "/clients/c2", { success: true, data: { id: "c2" } });
    const user = await renderHome();

    await user.click(screen.getByRole("button", { name: "Avançar José Pereira para Análise documental" }));
    await waitFor(() => expect(callsTo("patch").some(([url]) => String(url).endsWith("/clients/c2"))).toBe(true));
    expect(callsTo("patch").at(-1)?.[1]).toMatchObject({ situation: "ANALISE_DOCUMENTAL" });
  });

  it("troca o mês do balanço e reconsulta as despesas pagas", async () => {
    signIn();
    seedOffice();
    const user = await renderHome();
    const before = callsTo("get").filter(([url]) => String(url).includes("/expenses/summary")).length;

    await user.click(screen.getByRole("button", { name: "Mês anterior" }));
    await waitFor(() =>
      expect(callsTo("get").filter(([url]) => String(url).includes("/expenses/summary")).length).toBeGreaterThan(before),
    );
    await user.click(screen.getByRole("button", { name: "Próximo mês" }));
  });

  it("abre o novo compromisso e as ações de uma linha da agenda", async () => {
    signIn();
    seedOffice();
    const user = await renderHome();

    await user.click(screen.getByRole("button", { name: "Novo compromisso" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(screen.getAllByRole("button", { name: "Ver detalhes" })[0]);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("mostra os vazios quando as leituras falham", async () => {
    signIn();
    failApi("get", "/clients", 500);
    failApi("get", "/upcoming-birthdays", 500);
    failApi("get", "/appointments", 500);
    failApi("get", "/payments", 500);
    failApi("get", "/expenses/summary", 500);
    render(<HomePage />);
    expect(await screen.findByText(/Não foi possível carregar os aniversariantes/)).toBeInTheDocument();
  });
});

/** Muitos clientes numa etapa: o cartão mostra os primeiros e o "+ N". */
function seedCrowd() {
  const many = Array.from({ length: 16 }, (_, i) =>
    fx.clientRow({ id: `c${i + 10}`, fullName: `Cliente ${i + 10}`, situation: i < 12 ? "Análise documental" : "Formulário preenchido" }),
  );
  onApi("get", "/clients", page(many, many.length));
}

describe("Esteira do contribuinte", () => {

  it("expande a etapa cheia e recolhe", async () => {
    signIn();
    seedOffice();
    seedCrowd();
    const user = userEvent.setup();
    render(<HomePage />);
    const more = (await screen.findAllByRole("button", { name: /^\+ \d+ clientes?$/ }))[0];
    await user.click(more);
    expect(await screen.findAllByText("Cliente 15")).not.toHaveLength(0);
    await user.click(screen.getAllByRole("button", { name: "Mostrar menos" })[0]);
    expect(screen.queryByRole("button", { name: "Mostrar menos" })).not.toBeInTheDocument();
  });

  it("no quadro completo, move um cliente pelo seletor", async () => {
    signIn();
    seedOffice();
    seedCrowd();
    onApi("patch", /\/clients\/c\d+$/, envelope({ id: "c10" }));
    const user = userEvent.setup();
    render(<HomePage />);
    await screen.findAllByText("Cliente 10");
    const seeAll = screen.getAllByRole("button", { name: "Ver todos" }).at(-1)!;
    await user.click(seeAll);
    const dialog = await screen.findByRole("dialog");
    const select = within(dialog).getAllByRole("combobox", { name: /Mover Cliente 10 para/ })[0];
    await user.selectOptions(select, "PLANEJAMENTO_CONCLUIDO");
    await waitFor(() => expect(callsTo("patch").at(-1)?.[1]).toMatchObject({ situation: "PLANEJAMENTO_CONCLUIDO" }));
  });
});
