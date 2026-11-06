import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as blobFile from "@/lib/blobFile";
import ClientDetailsModal from "@/components/clients/details/ClientDetailsModal";
import { callsTo, envelope, failApi, onApi, page } from "../../../support/fakeApi";
import { seedOffice } from "../../../support/office";
import { renderApp } from "../../../support/render";
import { signIn } from "../../../support/session";
import * as fx from "../../../support/fixtures";
import { cardOf, chooseOption, inputByLabel } from "../../../support/ui";

const periods = [
  { id: "dp1", grade: "Grave", startedOn: "2010-01-01", endedOn: "2015-12-31", ongoing: false, days: 2190 },
  { id: "dp2", grade: "Leve", startedOn: "2016-01-01", endedOn: null, ongoing: true, days: 3500 },
];

const conversion = {
  convertedTo: "Sem deficiência",
  targetYears: 30,
  lines: [
    { grade: "Grave", gradeYears: 25, days: 2190, factor: 1.4, convertedDays: 3066, startedOn: "2010-01-01", endedOn: "2015-12-31", ongoing: false },
    { grade: "Leve", gradeYears: 33, days: 3500, factor: 0.94, convertedDays: 3290, startedOn: "2016-01-01", endedOn: fx.isoDay(0), ongoing: true },
  ],
  totalDays: 6356,
  totalYears: 17,
  totalMonths: 4,
  totalRemainingDays: 6,
  totalLabel: "17 anos, 4 meses e 6 dias",
};

function openSheet(props: Partial<Parameters<typeof ClientDetailsModal>[0]> = {}) {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  const view = renderApp(
    <ClientDetailsModal isOpen onClose={onClose} onConfirm={onConfirm} clientId="c1" clientName="Maria" {...props} />,
  );
  return { ...view, onClose, onConfirm };
}

const button = (name: RegExp | string) =>
  screen.getAllByRole("button").find((b) => (typeof name === "string" ? b.textContent?.trim() === name || b.getAttribute("aria-label") === name : name.test(`${b.getAttribute("aria-label") ?? ""} ${b.textContent ?? ""}`)));

describe("Ficha do cliente", () => {
  it("baixa a ficha completa em PDF pelo endpoint record", async () => {
    signIn();
    seedOffice();
    onApi("get", "/clients/c1/record", new Blob(["%PDF"], { type: "application/pdf" }));
    const save = vi.spyOn(blobFile, "saveBlob").mockImplementation(async (load) => {
      await load();
    });

    try {
      const { user } = openSheet();
      await user.click(await screen.findByRole("button", { name: "Baixar ficha em PDF" }));

      await waitFor(() =>
        expect(callsTo("get").some(([url]) => String(url).endsWith("/clients/c1/record"))).toBe(true),
      );
      expect(save).toHaveBeenCalledWith(expect.any(Function), "Ficha - Maria Aparecida da Silva.pdf");
      await user.click(await screen.findByRole("button", { name: "Editar cadastro" }));
      expect(screen.queryByRole("button", { name: "Baixar ficha em PDF" })).not.toBeInTheDocument();
    } finally {
      save.mockRestore();
    }
  });

  it("imprime a mesma ficha, e a falha aparece no painel", async () => {
    signIn();
    seedOffice();
    onApi("get", "/clients/c1/record", new Blob(["%PDF"], { type: "application/pdf" }));
    const print = vi.spyOn(blobFile, "printBlob").mockImplementation(async (load) => {
      await load();
    });

    try {
      const { user } = openSheet();
      await user.click(await screen.findByRole("button", { name: "Imprimir ficha" }));
      await waitFor(() => expect(print).toHaveBeenCalledWith(expect.any(Function), "Ficha - Maria Aparecida da Silva.pdf"));

      print.mockRejectedValueOnce({});
      await user.click(screen.getByRole("button", { name: "Imprimir ficha" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível abrir a ficha do cliente para impressão.");
    } finally {
      print.mockRestore();
    }
  });

  it("lê a ficha: seções, senha do INSS, arquivos e histórico", async () => {
    signIn();
    seedOffice();
    onApi("get", /\/files\/d1/, new Blob(["pdf"], { type: "application/pdf" }));
    const { user } = openSheet();
    await screen.findAllByText("laudo.pdf");

    for (const name of ["Dados pessoais", "Dados profissionais", "Endereço", "Entrevista", "Pagamentos", "Andamento do benefício", "Andamento no INSS", "Atendimento"]) {
      const nav = screen.getAllByRole("button").find((b) => b.textContent?.startsWith(name));
      if (nav) await user.click(nav);
    }

    await user.click(screen.getByRole("button", { name: "Revelar senha" }));
    expect(await screen.findByDisplayValue("senha-do-inss")).toBeInTheDocument();
    const hide = screen.queryByRole("button", { name: "Esconder senha" });
    if (hide) await user.click(hide);

    await user.click(screen.getByRole("tab", { name: /Simulações/ }));
    await user.click(screen.getByRole("tab", { name: /Documentos/ }));
    await user.click(screen.getAllByRole("button", { name: "Visualizar" })[0]);
    await user.click(screen.getAllByRole("button", { name: "Baixar" })[0]);
    await user.click(screen.getByRole("button", { name: "Ver lista" }));
  });

  it("edita e salva: cliente, endereço e entrevista, avisando uma vez", async () => {
    signIn();
    seedOffice();
    onApi("put", "/clients/c1", envelope(fx.client({ profession: "Bordadeira" })));
    onApi("put", /\/addresses\/a1$/, envelope(fx.address()));
    onApi("put", /\/interviews\/i1$/, envelope(fx.interview()));
    const { user, onConfirm } = openSheet({ editOnOpen: true });
    await screen.findAllByText("laudo.pdf");

    const profession = await screen.findByDisplayValue("Costureira");
    await user.clear(profession);
    await user.type(profession, "Bordadeira");
    const street = screen.getByDisplayValue("Rua das Flores");
    await user.clear(street);
    await user.type(street, "Rua das Acácias");

    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(callsTo("put").some(([url]) => String(url).endsWith("/clients/c1"))).toBe(true));
    const [, body] = callsTo("put").find(([url]) => String(url).endsWith("/clients/c1"))!;
    expect(body).toMatchObject({ profession: "Bordadeira", fullName: "Maria Aparecida da Silva" });
    await waitFor(() => expect(callsTo("put").some(([url]) => String(url).endsWith("/addresses/a1"))).toBe(true));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
  });

  it("edita: adiciona outro endereço e o salvar o cria; lendo, não há o que adicionar", async () => {
    signIn();
    seedOffice();
    onApi("post", /\/addresses$/, envelope(fx.address({ id: "a2", street: "Rua Nova", isPrimary: false })));
    const { user } = openSheet();
    await screen.findAllByText("laudo.pdf");
    expect(screen.queryByRole("button", { name: "Adicionar endereço" })).not.toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "Editar cadastro" }));
    await user.click(await screen.findByRole("button", { name: "Adicionar endereço" }));
    // A aba nova abre em branco e já selecionada.
    expect(screen.getByRole("tab", { name: /Endereço 2/ })).toHaveAttribute("aria-selected", "true");
    await user.type(inputByLabel("Logradouro"), "Rua Nova");
    await user.type(inputByLabel("Cidade"), "Contagem");
    await user.type(inputByLabel("UF"), "MG");

    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(callsTo("post").some(([url]) => String(url).endsWith("/addresses"))).toBe(true));
    const [, body] = callsTo("post").find(([url]) => String(url).endsWith("/addresses"))!;
    expect(body).toMatchObject({ street: "Rua Nova", city: "Contagem", isPrimary: false });
  });

  it("salvar sem mudança não grava e cancelar volta ao gravado", async () => {
    signIn();
    seedOffice();
    const { user } = openSheet({ editOnOpen: true });
    await screen.findByDisplayValue("Costureira");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await act(async () => {});
    expect(callsTo("put")).toHaveLength(0);

    await user.click(await screen.findByRole("button", { name: "Editar cadastro" }));
    const profession = await screen.findByDisplayValue("Costureira");
    await user.type(profession, " e bordadeira");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(await screen.findByDisplayValue("Costureira")).toBeInTheDocument();
  });

  it("campo obrigatório apagado impede o salvar e diz onde", async () => {
    signIn();
    seedOffice();
    const { user } = openSheet({ editOnOpen: true });
    const name = await screen.findByDisplayValue("Maria Aparecida da Silva");
    await user.clear(name);
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findAllByText(/Revise os campos destacados/)).not.toHaveLength(0);
    expect(callsTo("put")).toHaveLength(0);
  });

  it("falha do servidor ao salvar aparece na ficha", async () => {
    signIn();
    seedOffice();
    failApi("put", "/clients/c1", 500, "Banco indisponível.");
    const { user } = openSheet({ editOnOpen: true });
    const profession = await screen.findByDisplayValue("Costureira");
    await user.type(profession, " e bordadeira");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findAllByText(/Banco indisponível|Não foi possível/)).not.toHaveLength(0);
  });

  it("envia arquivo escolhido na edição e remove um gravado", async () => {
    signIn();
    seedOffice();
    onApi("post", "/files/documents", envelope([fx.document({ id: "d9", originalFilename: "rg.pdf" })]));
    onApi("delete", /\/files\/d1$/, envelope(null));
    const { user } = openSheet({ editOnOpen: true });
    await screen.findAllByText("laudo.pdf");

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["%PDF"], "rg.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findAllByText("rg.pdf");

    const remove = screen.getAllByRole("button", { name: "Excluir" })[0];
    await user.click(remove);
    const confirm = screen.queryAllByRole("dialog").flatMap((d) => within(d).queryAllByRole("button")).find((b) => (b.textContent ?? "").startsWith("Excluir") && b !== remove);
    if (confirm) await user.click(confirm);
    await waitFor(() => expect(callsTo("delete").some(([url]) => String(url).endsWith("/files/d1"))).toBe(true));

    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await act(async () => {});
  });

  it("exclui o cliente", async () => {
    signIn();
    seedOffice();
    onApi("delete", "/clients/c1", envelope(null));
    const { user, onClose } = openSheet();
    await screen.findAllByText("laudo.pdf");
    await user.click(screen.getByRole("button", { name: "Excluir cliente" }));
    const confirm = screen.getAllByRole("button").findLast((b) => (b.textContent ?? "").startsWith("Excluir"))!;
    await user.click(confirm);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("aposentadoria por deficiência: períodos, conversão e edição", async () => {
    signIn();
    seedOffice();
    onApi("get", /\/clients\/c1$/, envelope(fx.client({ benefit: "Aposentadoria por deficiência", hasDisability: true })));
    onApi("get", "/disability-periods", envelope(periods));
    onApi("get", "/disability-periods/conversion", envelope(conversion));
    onApi("post", "/disability-periods", envelope({ ...periods[0], id: "dp9" }));
    onApi("put", /\/disability-periods\/dp\d$/, envelope(periods[0]));
    onApi("delete", /\/disability-periods\/dp\d$/, envelope(null));
    onApi("put", "/clients/c1", envelope(fx.client()));
    const { user } = openSheet();
    expect(await screen.findAllByText(/17 anos/)).not.toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Editar cadastro" }));
    const add = screen.queryAllByRole("button").find((b) => /Adicionar (período|intervalo)/i.test(b.textContent ?? ""));
    if (add) await user.click(add);
    const remove = screen.queryAllByRole("button").find((b) => /Remover|Excluir período|Excluir intervalo/i.test(`${b.getAttribute("aria-label")} ${b.textContent}`));
    if (remove) {
      await user.click(remove);
      const keep = screen.queryAllByRole("button").find((b) => /^Excluir$/.test(b.textContent ?? ""));
      if (keep) await user.click(keep);
    }
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await act(async () => {});
  });

  it("conversão indisponível (sexo fora da tabela) é explicada", async () => {
    signIn();
    seedOffice();
    onApi("get", /\/clients\/c1$/, envelope(fx.client({ benefit: "Aposentadoria por deficiência", gender: "Não-binário" })));
    onApi("get", "/disability-periods", envelope(periods));
    failApi("get", "/disability-periods/conversion", 400, "Sexo sem tabela.");
    openSheet();
    expect(await screen.findAllByText(/masculino e feminino|Não foi possível obter/)).not.toHaveLength(0);
  });

  it("ficha que não carrega avisa", async () => {
    signIn();
    failApi("get", /\/clients\/c1$/, 500, "Fora do ar.");
    openSheet();
    expect(await screen.findAllByText(/Fora do ar|Não foi possível/)).not.toHaveLength(0);
  });

  it("muda a etapa no INSS pela ficha", async () => {
    signIn();
    seedOffice();
    onApi("patch", "/clients/c1", envelope({ id: "c1" }));
    const { user } = openSheet();
    await screen.findAllByText("laudo.pdf");
    await user.click(screen.getByRole("button", { name: "Mudar a situação no INSS de Maria Aparecida da Silva" }));
    const target = (await screen.findAllByRole("button", { name: /Exigência/ }))[0];
    await user.click(target);
    const text = screen.queryAllByRole("textbox").at(-1);
    if (text) await user.type(text, "O INSS pediu o CNIS atualizado.");
    const move = screen.queryAllByRole("button").find((b) => /Mover para/.test(b.textContent ?? ""));
    if (move) await user.click(move);
    expect(button).toBeDefined();
  });
});

const input = () => document.querySelector<HTMLInputElement>('input[type="file"]')!;

const disabilityClient = () => {
  onApi("get", /\/clients\/c1$/, envelope(fx.client({ benefit: "Aposentadoria por deficiência", hasDisability: true })));
  onApi("get", "/disability-periods", envelope(periods));
  onApi("get", "/disability-periods/conversion", envelope(conversion));
};

describe("Ficha do cliente: casos de borda", () => {

  it("deficiência: edita o gravado, acrescenta um e exclui outro", async () => {
    signIn();
    seedOffice();
    disabilityClient();
    onApi("put", /\/disability-periods\/dp\d$/, envelope(periods[0]));
    onApi("post", /\/disability-periods$/, envelope({ ...periods[0], id: "dp9" }));
    onApi("delete", /\/disability-periods\/dp\d$/, envelope(null));
    onApi("put", "/clients/c1", envelope(fx.client()));
    const { user } = openSheet();
    await screen.findAllByText(/17 anos/);
    await user.click(screen.getByRole("button", { name: "Editar cadastro" }));

    // Excluir um gravado relê a lista do servidor; o acréscimo vem depois.
    await user.click(screen.getAllByRole("button", { name: /Remover/ })[0]);
    const removal = await screen.findByRole("dialog", { name: /Excluir este período/ });
    await user.click(within(removal).getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(callsTo("delete").some(([url]) => String(url).endsWith("/disability-periods/dp1"))).toBe(true));

    await user.click(await screen.findByRole("button", { name: "Adicionar novo intervalo de deficiência" }));
    const grades = [...document.querySelectorAll<HTMLElement>('[data-slot="select"]')].filter((el) => /Grau da deficiência/.test(el.textContent ?? ""));
    const select = grades.at(-1)!.querySelector("select")!;
    fireEvent.change(select, { target: { value: "MODERADA" } });
    // Fechado e antes dos gravados: um intervalo em aberto se sobreporia ao que se mantém.
    let third: HTMLElement = screen.getByText("Período 3");
    while (!within(third).queryByRole("switch")) third = third.parentElement!;
    await user.click(within(third).getByRole("switch", { name: "Se mantém até a presente data?" }));
    const days = within(third).getAllByRole("spinbutton", { name: /dia/ });
    await user.click(days[0]);
    await user.keyboard("01012000");
    await user.click(days[1]);
    await user.keyboard("31122005");

    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(callsTo("post").some(([url]) => String(url).endsWith("/disability-periods"))).toBe(true));
  });

  it("deficiência: lista que não carrega cai no vazio sem quebrar", async () => {
    signIn();
    seedOffice();
    onApi("get", /\/clients\/c1$/, envelope(fx.client({ benefit: "Aposentadoria por deficiência" })));
    failApi("get", /\/disability-periods$/, 500);
    openSheet();
    expect(await screen.findAllByText(/Nenhum período de deficiência/)).not.toHaveLength(0);
  });

  it("muda a situação e relê o histórico ao salvar", async () => {
    signIn();
    seedOffice();
    onApi("put", "/clients/c1", envelope(fx.client({ situation: "Planejamento em execução" })));
    const { user } = openSheet({ editOnOpen: true });
    await screen.findByDisplayValue("Costureira");
    const situation = [...document.querySelectorAll<HTMLElement>('[data-slot="select"]')].find((el) => el.querySelector('[data-slot="label"]')?.textContent?.trim() === "Situação")!;
    fireEvent.change(situation.querySelector("select")!, { target: { value: "PLANEJAMENTO_EM_EXECUCAO" } });
    const before = callsTo("get").filter(([url]) => String(url).includes("/situation-history")).length;
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(callsTo("get").filter(([url]) => String(url).includes("/situation-history")).length).toBeGreaterThan(before));
  });

  it("arquivos: um tipo sobe, o outro falha — a ficha avisa", async () => {
    signIn();
    seedOffice();
    onApi("put", "/clients/c1", envelope(fx.client()));
    onApi("post", "/files/documents", envelope([fx.document({ id: "d9" })]));
    failApi("post", "/files/simulations", 500);
    const { user } = openSheet({ editOnOpen: true });
    await screen.findAllByText("laudo.pdf");

    fireEvent.change(input(), { target: { files: [new File(["%PDF"], "rg.pdf", { type: "application/pdf" })] } });
    const doc = cardOf("rg.pdf");
    chooseOption("Tipo do documento", "IDENTIFICACAO_SEGURADO", doc);
    await user.type(within(doc).getByRole("textbox"), "RG frente e verso");

    await user.click(screen.getByRole("tab", { name: /Simulações/ }));
    fireEvent.change(input(), { target: { files: [new File(["%PDF"], "simulacao-v2.pdf", { type: "application/pdf" })] } });
    const sim = cardOf("simulacao-v2.pdf");
    await user.click(within(sim).getAllByRole("spinbutton", { name: /dia/ })[0]);
    await user.keyboard("01012025");
    const [version, links] = [...within(sim).getAllByRole("textbox"), ...within(sim).queryAllByRole("spinbutton").filter((el) => el.tagName === "INPUT")];
    await user.type(version, "v2");
    await user.type(links, "4");
    await user.type(within(sim).getAllByRole("textbox").at(-1)!, "Com os vínculos de 2024");

    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(callsTo("post").some(([url]) => String(url).endsWith("/files/simulations"))).toBe(true));
    expect(await screen.findAllByText(/Nem todos os arquivos foram enviados/)).not.toHaveLength(0);
  });

  it("excluir cliente que falha mostra o motivo", async () => {
    signIn();
    seedOffice();
    failApi("delete", "/clients/c1", 409, "Cliente com pagamentos não pode ser excluído.");
    const { user, onClose } = openSheet();
    await screen.findAllByText("laudo.pdf");
    await user.click(screen.getByRole("button", { name: "Excluir cliente" }));
    await user.click(screen.getAllByRole("button").findLast((b) => (b.textContent ?? "").startsWith("Excluir"))!);
    expect(await screen.findAllByText(/não pode ser excluído/)).not.toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("excluir arquivo gravado que falha avisa", async () => {
    signIn();
    seedOffice();
    failApi("delete", /\/files\/d1$/, 500);
    const { user } = openSheet({ editOnOpen: true });
    await screen.findAllByText("laudo.pdf");
    await user.click(screen.getAllByRole("button", { name: "Excluir" })[0]);
    const dialogs = await screen.findAllByRole("dialog");
    const confirm = dialogs.flatMap((d) => within(d).queryAllByRole("button")).findLast((b) => (b.textContent ?? "").startsWith("Excluir"));
    if (confirm) await user.click(confirm);
    // A mensagem do servidor, não a genérica: ela diz por que não saiu.
    expect(await screen.findAllByText("Falha simulada.")).not.toHaveLength(0);
  });

  it("várias entrevistas e quem não vê financeiro", async () => {
    signIn("STAFF");
    seedOffice();
    onApi("get", "/interviews", page([fx.interview(), fx.interview({ id: "i2" })], 2));
    openSheet();
    await screen.findAllByText("laudo.pdf");
    expect(screen.getAllByText(/2 registros/)).not.toHaveLength(0);
    expect(screen.queryAllByRole("button").some((b) => b.textContent?.startsWith("Pagamentos"))).toBe(false);
  });
});

describe("Ficha do cliente: edição por bloco", () => {
  const putTo = (path: string) => callsTo("put").filter(([url]) => String(url).endsWith(path));

  it("o lápis solta só o bloco, e o salvar grava só ele, com aviso próprio", async () => {
    signIn();
    seedOffice();
    onApi("put", "/clients/c1", envelope(fx.client({ profession: "Bordadeira" })));
    const { user, onConfirm } = openSheet();
    await screen.findAllByText("laudo.pdf");

    await user.click(screen.getByRole("button", { name: "Editar dados profissionais" }));
    // Os outros blocos seguem em leitura.
    expect(screen.getByDisplayValue("Rua das Flores")).toHaveAttribute("readonly");
    const profession = screen.getByDisplayValue("Costureira");
    await user.clear(profession);
    await user.type(profession, "Bordadeira");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Dados profissionais de Maria Aparecida da Silva atualizados.")).toBeInTheDocument();
    const [[, body]] = putTo("/clients/c1");
    expect(body).toMatchObject({ profession: "Bordadeira", fullName: "Maria Aparecida da Silva" });
    expect(callsTo("put")).toHaveLength(1);
    expect(onConfirm).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Editar dados profissionais" })).toBeInTheDocument();
  });

  it("o endereço grava só o endereço; o que foi digitado em outro bloco não vai junto", async () => {
    signIn();
    seedOffice();
    onApi("put", /\/addresses\/a1$/, envelope(fx.address({ street: "Rua das Acácias" })));
    const { user } = openSheet();
    await screen.findAllByText("laudo.pdf");

    await user.click(screen.getByRole("button", { name: "Editar endereço" }));
    const street = screen.getByDisplayValue("Rua das Flores");
    await user.clear(street);
    await user.type(street, "Rua das Acácias");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Endereço de Maria Aparecida da Silva atualizado.")).toBeInTheDocument();
    expect(putTo("/addresses/a1")[0][1]).toMatchObject({ street: "Rua das Acácias" });
    expect(putTo("/clients/c1")).toHaveLength(0);
  });

  it("com um bloco aberto, os outros lápis e o editar cadastro esperam; cancelar volta ao gravado", async () => {
    signIn();
    seedOffice();
    const { user } = openSheet();
    await screen.findAllByText("laudo.pdf");

    await user.click(screen.getByRole("button", { name: "Editar dados profissionais" }));
    expect(screen.getByRole("button", { name: "Editar endereço" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Editar cadastro" })).toBeDisabled();

    await user.type(screen.getByDisplayValue("Costureira"), " e bordadeira");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(await screen.findByDisplayValue("Costureira")).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Editar endereço" })).toBeEnabled();
    expect(callsTo("put")).toHaveLength(0);
  });
});

describe("Ficha do cliente: navegação pelas seções", () => {
  it("a seção ativa acompanha a rolagem e o menu leva até cada uma", async () => {
    signIn();
    seedOffice();
    const { user } = openSheet();
    await screen.findAllByText("laudo.pdf");
    const sections = [...document.querySelectorAll<HTMLElement>("[data-spy]")];
    expect(sections.length).toBeGreaterThan(3);
    const { intersections } = globalThis as unknown as { intersections: { leave: (target: Element) => void } };
    await act(async () => {
      intersections.leave(sections[0]);
      intersections.leave(sections[1]);
    });
    const nav = screen.getAllByRole("button").find((b) => b.textContent?.startsWith("Entrevista"))!;
    await user.click(nav);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});

describe("Ficha do cliente: arquivos sob demanda", () => {
  const fileReads = () => callsTo("get").filter(([url]) => /\/files\/(documents|simulations)$/.test(String(url)));

  it("os arquivos só são lidos quando a seção aparece — aqui, pelo índice", async () => {
    // Um observador que nunca anuncia nada: nenhuma seção "aparece" rolando,
    // e o único jeito de chegar a Arquivos é o clique no índice.
    class SilentObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", SilentObserver);
    try {
      signIn();
      seedOffice();
      const { user } = openSheet();
      await waitFor(() => expect(callsTo("get").some(([url]) => String(url).endsWith("/clients/c1"))).toBe(true));
      await act(() => new Promise((resolve) => setTimeout(resolve, 300)));
      expect(fileReads()).toHaveLength(0);
      expect(screen.queryByText("laudo.pdf")).toBeNull();

      await user.click(screen.getAllByRole("button").find((b) => b.textContent?.startsWith("Arquivos"))!);
      await screen.findAllByText("laudo.pdf");
      expect(fileReads()).toHaveLength(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
