import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { apiComSessaoDoNavegador, cpfValido, integracaoPausada, MARCA } from "./apiHelper";

/**
 * A ficha do cliente grava pelas mesmas seções do cadastro.
 *
 * Garantias que só o navegador + o backend provam juntos:
 * - `PUT /clients/{id}` é substituição total: a ficha antiga não carregava
 *   órgão emissor, emissão do RG nem notas, e cada edição os apagava;
 * - a ficha valida como o cadastro: CPF inválido não sai da tela;
 * - a seção Pagamentos só busca o financeiro quando é aberta;
 * - as seções aparecem todas de uma vez, e o painel da esquerda **ancora** a
 *   leitura em vez de esconder as outras.
 */

test.describe.configure({ mode: "serial" });

const NOME = `${MARCA} Ficha ${Date.now().toString(36)}`;
let api: APIRequestContext | null = null;
let clienteId = "";

test.beforeAll(async () => {
  api = await apiComSessaoDoNavegador();
  test.skip(!api, "sem NEXT_PUBLIC_API_URL ou sem sessão gravada");

  const resposta = await api!.post("/api/v1/clients", {
    data: {
      fullName: NOME,
      birthDate: "1970-05-20",
      cpf: cpfValido(),
      motherName: "Maria de Teste",
      mobilePhone: "(31) 99999-0000",
      inssPassword: "senha-inss-e2e",
      gender: "Feminino",
      benefit: "Aposentadoria por idade",
      situation: "Formulário preenchido",
      rgIssuer: "SSP/MG",
      rgIssueDate: "2001-05-10",
      notes: "Prefere contato à tarde",
    },
  });
  expect(resposta.status(), await resposta.text()).toBe(201);
  const criado = (await resposta.json()).data;
  clienteId = criado.clientId ?? criado.id;
});

test.afterAll(async () => {
  if (api && clienteId) await api.delete(`/api/v1/clients/${clienteId}`);
  await api?.dispose();
});

/** Abre a ficha deste cliente já em edição. */
async function editarFicha(page: Page) {
  await page.goto("/clientes");
  await page.getByPlaceholder("Pesquisar beneficiário").fill(NOME);
  await page.waitForResponse((r) => r.url().includes("searchTerm") && r.request().method() === "GET");
  await page.getByRole("button", { name: "Editar este cliente" }).first().click();
  const ficha = page.getByRole("dialog");
  // Carregou: o nome deste cliente (um teste anterior pode tê-lo editado).
  await expect(ficha.getByLabel("Nome completo")).toHaveValue(new RegExp(`^${NOME.replace(/[[\]]/g, "\\$&")}`));
  return ficha;
}

test("editar o nome não apaga o que a ficha não mostra nem o que ela não mexeu", async ({ page }) => {
  const ficha = await editarFicha(page);
  // O que veio do servidor aparece na ficha, e por isso volta no PUT.
  await expect(ficha.getByLabel("Órgão emissor")).toHaveValue("SSP/MG");
  await ficha.getByLabel("Nome completo").fill(`${NOME} editado`);

  const salvou = page.waitForResponse(
    (r) => r.url().endsWith(`/clients/${clienteId}`) && r.request().method() === "PUT",
  );
  await ficha.getByRole("button", { name: "Salvar", exact: true }).click();
  expect((await salvou).status()).toBe(200);

  const gravado = (await (await api!.get(`/api/v1/clients/${clienteId}`)).json()).data;
  expect(gravado.fullName).toBe(`${NOME} editado`);
  expect(gravado.rgIssuer).toBe("SSP/MG");
  expect(gravado.rgIssueDate).toBe("2001-05-10");
  expect(gravado.notes).toBe("Prefere contato à tarde");
});

test("salvar sem mudar nada não manda PUT", async ({ page }) => {
  const ficha = await editarFicha(page);
  const puts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "PUT") puts.push(r.url());
  });
  await ficha.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(ficha.getByRole("button", { name: "Editar cadastro" })).toBeVisible();
  expect(puts).toHaveLength(0);
});

test("CPF inválido é barrado na ficha, como no cadastro", async ({ page }) => {
  const ficha = await editarFicha(page);
  await ficha.getByLabel("CPF").fill("111.111.111-11");

  const puts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "PUT") puts.push(r.url());
  });
  await ficha.getByRole("button", { name: "Salvar", exact: true }).click();

  await expect(ficha.getByRole("alert").filter({ hasText: /Revise os campos destacados: CPF/ })).toBeVisible();
  await expect(ficha.getByText("CPF inválido.")).toBeVisible();
  expect(puts).toHaveLength(0);
});

test("as seções aparecem todas; o painel leva até elas", async ({ page }) => {
  const ficha = await editarFicha(page);

  // Campos de três seções diferentes, todos na tela ao mesmo tempo: é o que
  // distingue a ficha ancorada da ficha em abas, onde dois destes estariam
  // desmontados.
  await expect(ficha.getByLabel("Nome completo")).toBeVisible();
  await expect(ficha.getByLabel("Profissão")).toBeVisible();
  await expect(ficha.getByLabel("Logradouro")).toBeVisible();

  const painel = ficha.getByRole("navigation", { name: "Seções da ficha" });
  const endereco = painel.getByRole("button", { name: "Endereço" });
  await endereco.click();
  // Clicar acende o item: é o painel dizendo onde a leitura está.
  await expect(endereco).toHaveAttribute("aria-current", "location");
  // E a seção continua lá, inteira — ninguém trocou de painel.
  await expect(ficha.getByLabel("Logradouro")).toBeVisible();
});

test("a seção Pagamentos só busca o financeiro do cliente quando é aberta", async ({ page }) => {
  const financeiro: string[] = [];
  page.on("request", (r) => {
    if (/\/api\/v1\/(payments|revenues)/.test(r.url())) financeiro.push(r.url());
  });
  const ficha = await editarFicha(page);
  await page.waitForTimeout(500);
  expect(financeiro, "fechada, a seção não pede nada").toHaveLength(0);

  await ficha.getByRole("navigation", { name: "Seções da ficha" }).getByRole("button", { name: "Pagamentos" }).click();
  const abas = ficha.getByRole("tablist", { name: "Financeiro do cliente" });
  await expect(abas.getByRole("tab", { name: /Benefício/ })).toHaveAttribute("aria-selected", "true");
  await expect(abas.getByRole("tab", { name: /Honorários/ })).toBeVisible();

  if (!integracaoPausada("payments")) {
    await expect.poll(() => financeiro.filter((u) => u.includes(`clientId=${clienteId}`)).length).toBeGreaterThan(0);
    // Cliente novo: nada lançado, e a seção diz isso em vez de ficar em branco.
    await expect(ficha.getByText("Nenhuma parcela de benefício lançada para este cliente.")).toBeVisible();
  }
});
