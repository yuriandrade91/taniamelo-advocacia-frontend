import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

import { MARCA, apiComSessaoDoNavegador, cpfValido } from "./apiHelper";

/**
 * Listagem de clientes: o que mudou na revisão da tela.
 *
 * - "Mostrando N de T clientes" à direita;
 * - copiar o CPF confirma em **toast**, não em popover colado na célula;
 * - o ícone do calendário abre o campo de período, à esquerda;
 * - mudar de etapa: sem o selo "atual", etapas cumpridas como concluídas,
 *   pular etapas pede confirmação **nomeando** as puladas, voltar pede
 *   justificativa, avançar uma etapa não pergunta nada;
 * - o selo "Isento" vem do `notBillable`, e o filtro de isenção vai à API.
 *
 * A massa (um cliente na primeira etapa) é preparada pela API, de propósito:
 * o teste é da listagem, e passar pelo cadastro o tornaria refém do
 * formulário. Cada mudança de etapa é conferida pela resposta do PATCH e pela
 * linha — e a que não deveria acontecer, pela ausência de PATCH.
 */

test.describe.configure({ mode: "serial" });

const NOME = `${MARCA} Lista ${Date.now().toString(36)}`;
const CPF = cpfValido();
const CPF_MASCARADO = CPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

let api: APIRequestContext | null = null;
let clienteId = "";

/** Busca pelo nome e devolve a linha do cliente de teste. */
async function linhaDoCliente(page: Page) {
  await page.getByRole("searchbox", { name: "Pesquisar beneficiário" }).fill(NOME);
  const linha = page.getByRole("list", { name: "Clientes" }).getByRole("listitem").filter({ hasText: NOME });
  await expect(linha).toHaveCount(1);
  return linha;
}

/** Abre o cartão "Mudar situação" da linha. */
async function abrirMudancaDeEtapa(page: Page) {
  const linha = await linhaDoCliente(page);
  await linha.getByRole("button", { name: `Mudar a situação de ${NOME}` }).click();
  const cartao = page.getByRole("dialog", { name: "Mudar situação" });
  await expect(cartao).toBeVisible();
  return { linha, cartao };
}

/** Promessa do PATCH de situação do cliente de teste. */
const patchDeSituacao = (page: Page) =>
  page.waitForResponse(
    (r) =>
      r.request().method() === "PATCH" &&
      new URL(r.url()).pathname.endsWith(`/api/v1/clients/${clienteId}`),
  );

test.beforeAll(async () => {
  api = await apiComSessaoDoNavegador();
  if (!api) return;
  const criado = await api.post("/api/v1/clients", {
    data: {
      fullName: NOME,
      birthDate: "1970-05-20",
      cpf: CPF,
      motherName: "Maria de Teste",
      mobilePhone: "+5531999990000",
      inssPassword: "senha-inss-123",
      gender: "Feminino",
      benefit: "Aposentadoria por idade",
      situation: "Formulário preenchido",
      clientType: "Verificado",
    },
  });
  expect(criado.status(), await criado.text()).toBe(201);
  clienteId = (await criado.json()).data.clientId;
});

test.beforeEach(() => {
  test.skip(!api || !clienteId, "sem NEXT_PUBLIC_API_URL ou sem sessão gravada");
});

test.afterAll(async () => {
  if (api && clienteId) await api.delete(`/api/v1/clients/${clienteId}`);
  await api?.dispose();
});

test("a contagem de clientes fica à direita, acima da lista", async ({ page }) => {
  await page.goto("/clientes");
  await linhaDoCliente(page);

  const contagem = page.getByText(/^Mostrando\s+\d+\s+de\s+\d+\s+clientes?$/);
  await expect(contagem).toBeVisible();

  const faixa = contagem.locator("xpath=..");
  const [caixaTexto, caixaFaixa] = await Promise.all([contagem.boundingBox(), faixa.boundingBox()]);
  expect(caixaTexto && caixaFaixa).toBeTruthy();
  // Encostada no lado direito (o respiro é o padding da faixa), e não no esquerdo.
  const folgaDireita = caixaFaixa!.x + caixaFaixa!.width - (caixaTexto!.x + caixaTexto!.width);
  expect(folgaDireita).toBeLessThan(40);
  expect(caixaTexto!.x).toBeGreaterThan(caixaFaixa!.x + caixaFaixa!.width / 2);
});

test("copiar o CPF confirma em toast", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/clientes");
  const linha = await linhaDoCliente(page);

  await linha.getByRole("button", { name: `Copiar CPF ${CPF_MASCARADO}` }).click();

  await expect(page.getByText("CPF copiado")).toBeVisible();
  // Nada de popover colado na célula: a confirmação é só o toast.
  await expect(linha.getByText("CPF copiado")).toHaveCount(0);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(CPF_MASCARADO);
});

test("o calendário do período abre o campo, à esquerda das datas", async ({ page }) => {
  await page.goto("/clientes");

  const periodo = page.getByRole("group", { name: "Período" });
  const gatilho = page.getByRole("button", { name: "Abrir calendário do período" });
  const primeiraData = periodo.getByRole("spinbutton").first();

  const [caixaGatilho, caixaData] = await Promise.all([gatilho.boundingBox(), primeiraData.boundingBox()]);
  expect(caixaGatilho && caixaData).toBeTruthy();
  expect(caixaGatilho!.x).toBeLessThan(caixaData!.x);

  await gatilho.click();
  await expect(page.getByRole("grid").first()).toBeVisible();
});

test("o cartão de etapa não tem o selo 'atual'", async ({ page }) => {
  await page.goto("/clientes");
  const { cartao } = await abrirMudancaDeEtapa(page);

  await expect(cartao.getByText("atual", { exact: true })).toHaveCount(0);
  // A informação continua para leitor de tela, no nome acessível da etapa.
  await expect(cartao.getByRole("button", { name: "Formulário preenchido (etapa atual)" })).toBeVisible();
});

test("pular etapas pede confirmação nomeando as puladas — e Manter não grava", async ({ page }) => {
  await page.goto("/clientes");
  const { linha, cartao } = await abrirMudancaDeEtapa(page);

  let patches = 0;
  page.on("request", (r) => {
    if (r.method() === "PATCH" && r.url().includes(`/api/v1/clients/${clienteId}`)) patches += 1;
  });

  await cartao.getByRole("button", { name: "Planejamento concluído (próxima)" }).click();
  await cartao.getByRole("button", { name: "Pular para Planejado…" }).click();

  const dialogo = page.getByRole("dialog", { name: "Pular 2 etapas?" });
  await expect(dialogo).toBeVisible();
  await expect(dialogo).toContainText(
    "Você está pulando as etapas Análise documental e Planejamento em execução",
  );
  const puladas = dialogo.getByRole("list", { name: "Etapas puladas" }).getByRole("listitem");
  await expect(puladas).toHaveText(["2Análise documental", "3Planejamento em execução"]);

  await dialogo.getByRole("button", { name: "Manter" }).click();
  await expect(dialogo).toBeHidden();
  expect(patches).toBe(0);
  await expect(linha.getByText("Formulário preenchido")).toBeVisible();
});

test("confirmar o pulo grava a etapa nova", async ({ page }) => {
  await page.goto("/clientes");
  const { linha, cartao } = await abrirMudancaDeEtapa(page);

  await cartao.getByRole("button", { name: "Planejamento concluído (próxima)" }).click();
  await cartao.getByRole("button", { name: "Pular para Planejado…" }).click();

  const dialogo = page.getByRole("dialog", { name: "Pular 2 etapas?" });
  const patch = patchDeSituacao(page);
  await dialogo.getByRole("button", { name: "Pular para Planejamento concluído" }).click();

  const resposta = await patch;
  expect(resposta.ok(), await resposta.text()).toBe(true);
  expect(resposta.request().postDataJSON()).toEqual({ situation: "PLANEJAMENTO_CONCLUIDO" });
  await expect(linha.getByText("Planejamento concluído")).toBeVisible();
});

test("etapas cumpridas aparecem como concluídas, em verde", async ({ page }) => {
  await page.goto("/clientes");
  const { cartao } = await abrirMudancaDeEtapa(page);

  const etapas = cartao.getByRole("list", { name: "Etapas da esteira" }).getByRole("listitem");
  await expect(etapas.nth(0)).toHaveAttribute("data-state", "done");
  await expect(etapas.nth(1)).toHaveAttribute("data-state", "done");
  await expect(etapas.nth(2)).toHaveAttribute("data-state", "done");
  await expect(etapas.nth(3)).toHaveAttribute("data-state", "current");
  await expect(etapas.nth(4)).toHaveAttribute("data-state", "upcoming");

  const concluida = cartao.getByRole("button", { name: "Formulário preenchido (concluída)" });
  await expect(concluida).toContainText("✓");
  // O nó da etapa cumprida é verde (bg-success), não mais o azul da marca.
  await expect(concluida.locator("span.bg-success")).toHaveCount(1);
});

test("voltar etapa pede justificativa antes de gravar", async ({ page }) => {
  await page.goto("/clientes");
  const { linha, cartao } = await abrirMudancaDeEtapa(page);

  await cartao.getByRole("button", { name: "Análise documental (concluída)" }).click();
  await cartao.getByRole("button", { name: "Voltar para Documentos…" }).click();

  const dialogo = page.getByRole("dialog", { name: "Voltar etapa?" });
  await expect(dialogo).toBeVisible();
  const confirmar = dialogo.getByRole("button", { name: "Voltar para Análise documental" });
  await expect(confirmar).toBeDisabled();

  await dialogo.getByLabel("Justificativa").fill("curto");
  await expect(confirmar).toBeDisabled();
  await dialogo.getByLabel("Justificativa").fill("Faltou o CNIS atualizado na análise.");

  const patch = patchDeSituacao(page);
  await confirmar.click();
  expect((await patch).ok()).toBe(true);
  await expect(linha.getByText("Análise documental")).toBeVisible();
});

test("avançar uma etapa grava direto, sem diálogo", async ({ page }) => {
  await page.goto("/clientes");
  const { linha, cartao } = await abrirMudancaDeEtapa(page);

  await cartao.getByRole("button", { name: "Planejamento em execução (próxima)" }).click();
  const patch = patchDeSituacao(page);
  await cartao.getByRole("button", { name: "Mover para Planejando" }).click();

  expect((await patch).ok()).toBe(true);
  await expect(page.getByRole("dialog", { name: /Pular|Voltar etapa/ })).toHaveCount(0);
  await expect(linha.getByText("Planejamento em execução")).toBeVisible();
});

test("isenção: o selo vem do notBillable e o filtro manda true/false à API", async ({ page }) => {
  const marcado = await api!.patch(`/api/v1/clients/${clienteId}`, { data: { notBillable: true } });
  expect(marcado.status(), await marcado.text()).toBe(200);

  /** Promessa da listagem pedida com `notBillable` = `valor`. */
  const listagemCom = (valor: string) =>
    page.waitForResponse((r) => {
      const url = new URL(r.url());
      return (
        r.request().method() === "GET" &&
        url.pathname.endsWith("/api/v1/clients") &&
        url.searchParams.get("notBillable") === valor
      );
    });

  try {
    await page.goto("/clientes");
    const linha = await linhaDoCliente(page);
    await expect(linha.getByText("Isento", { exact: true })).toBeVisible();

    const isencao = page.getByRole("radiogroup", { name: "Isenção" });

    const naoIsentos = listagemCom("false");
    await isencao.getByRole("radio", { name: "Não isentos" }).click();
    expect((await naoIsentos).ok()).toBe(true);
    await expect(linha).toHaveCount(0);

    const isentos = listagemCom("true");
    await isencao.getByRole("radio", { name: "Isentos" }).click();
    expect((await isentos).ok()).toBe(true);
    await expect(linha).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Remover filtro Isentos" })).toBeVisible();
  } finally {
    await api!.patch(`/api/v1/clients/${clienteId}`, { data: { notBillable: false } });
  }
});
