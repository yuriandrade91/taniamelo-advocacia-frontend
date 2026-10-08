import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { apiWithBrowserSession, validCpf, integrationPaused, TAG } from "./apiHelper";

/**
 * A ficha do cliente lê e edita no mesmo lugar, pelas mesmas seções do
 * cadastro.
 *
 * Garantias que só o navegador + o backend provam juntos:
 * - aberta para ver, nada se mexe; "Editar cadastro" solta os campos ali
 *   mesmo, sem trocar de tela;
 * - `PUT /clients/{id}` é substituição total: a ficha antiga não carregava
 *   órgão emissor, emissão do RG nem notas, e cada edição os apagava;
 * - a ficha valida como o cadastro: CPF inválido não sai da tela;
 * - a seção Pagamentos só busca o financeiro quando é aberta;
 * - as seções aparecem todas de uma vez, e o painel da esquerda **ancora** a
 *   leitura em vez de esconder as outras.
 */

test.describe.configure({ mode: "serial" });

const NAME = `${TAG} Ficha ${Date.now().toString(36)}`;
let api: APIRequestContext | null = null;
let clientId = "";

test.beforeAll(async () => {
  api = await apiWithBrowserSession();
  test.skip(!api, "sem NEXT_PUBLIC_API_URL ou sem sessão gravada");

  const response = await api!.post("/api/v1/clients", {
    data: {
      fullName: NAME,
      birthDate: "1970-05-20",
      cpf: validCpf(),
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
  expect(response.status(), await response.text()).toBe(201);
  const created = (await response.json()).data;
  clientId = created.clientId ?? created.id;
});

test.afterAll(async () => {
  if (api && clientId) await api.delete(`/api/v1/clients/${clientId}`);
  await api?.dispose();
});

/** Abre a ficha deste cliente, em leitura. */
async function viewSheet(page: Page) {
  await page.goto("/clientes");
  await page.getByPlaceholder("Pesquisar beneficiário").fill(NAME);
  await page.waitForResponse((r) => r.url().includes("searchTerm") && r.request().method() === "GET");
  await page.getByRole("button", { name: "Visualizar este cliente" }).first().click();
  const sheet = page.getByRole("dialog");
  // Carregou: o nome deste cliente (um teste anterior pode tê-lo editado).
  await expect(sheet.getByLabel("Nome completo")).toHaveValue(new RegExp(`^${NAME.replace(/[[\]]/g, "\\$&")}`));
  return sheet;
}

/** Abre a ficha deste cliente já em edição, pelo editar da lista. */
async function editSheet(page: Page) {
  await page.goto("/clientes");
  await page.getByPlaceholder("Pesquisar beneficiário").fill(NAME);
  await page.waitForResponse((r) => r.url().includes("searchTerm") && r.request().method() === "GET");
  await page.getByRole("button", { name: "Editar este cliente" }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByLabel("Nome completo")).toHaveValue(new RegExp(`^${NAME.replace(/[[\]]/g, "\\$&")}`));
  return sheet;
}

test("vista, a ficha não deixa mexer; editar solta os campos no mesmo lugar", async ({ page }) => {
  const sheet = await viewSheet(page);
  await expect(sheet.getByLabel("Nome completo")).not.toBeEditable();
  await expect(sheet.getByRole("button", { name: "Salvar", exact: true })).toHaveCount(0);

  await sheet.getByRole("button", { name: "Editar cadastro" }).click();
  // A mesma ficha, agora editável: nada de trocar de tela.
  await expect(page).toHaveURL(/\/clientes$/);
  await expect(sheet.getByLabel("Nome completo")).toBeEditable();
  await expect(sheet.getByRole("button", { name: "Salvar", exact: true })).toBeVisible();
});

test("editar o nome não apaga o que a ficha não mostra nem o que ela não mexeu", async ({ page }) => {
  const sheet = await editSheet(page);
  // O que veio do servidor aparece na ficha, e por isso volta no PUT.
  await expect(sheet.getByLabel("Órgão emissor")).toHaveValue("SSP/MG");
  await sheet.getByLabel("Nome completo").fill(`${NAME} editado`);

  const saved = page.waitForResponse(
    (r) => r.url().endsWith(`/clients/${clientId}`) && r.request().method() === "PUT",
  );
  await sheet.getByRole("button", { name: "Salvar", exact: true }).click();
  expect((await saved).status()).toBe(200);

  const stored = (await (await api!.get(`/api/v1/clients/${clientId}`)).json()).data;
  expect(stored.fullName).toBe(`${NAME} editado`);
  expect(stored.rgIssuer).toBe("SSP/MG");
  expect(stored.rgIssueDate).toBe("2001-05-10");
  expect(stored.notes).toBe("Prefere contato à tarde");
});

test("salvar sem mudar nada não manda PUT", async ({ page }) => {
  const sheet = await editSheet(page);
  const puts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "PUT") puts.push(r.url());
  });
  await sheet.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(sheet.getByRole("button", { name: "Editar cadastro" })).toBeVisible();
  expect(puts).toHaveLength(0);
});

test("CPF inválido é barrado na ficha, como no cadastro", async ({ page }) => {
  const sheet = await editSheet(page);
  await sheet.getByLabel("CPF").fill("111.111.111-11");

  const puts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "PUT") puts.push(r.url());
  });
  await sheet.getByRole("button", { name: "Salvar", exact: true }).click();

  await expect(sheet.getByRole("alert").filter({ hasText: /Revise os campos destacados: CPF/ })).toBeVisible();
  await expect(sheet.getByText("CPF inválido.")).toBeVisible();
  expect(puts).toHaveLength(0);
});

test("as seções aparecem todas; o painel leva até elas", async ({ page }) => {
  const sheet = await viewSheet(page);

  // Campos de três seções diferentes, todos na tela ao mesmo tempo: é o que
  // distingue a ficha ancorada da ficha em abas, onde dois destes estariam
  // desmontados.
  await expect(sheet.getByLabel("Nome completo")).toBeVisible();
  await expect(sheet.getByLabel("Profissão")).toBeVisible();
  await expect(sheet.getByLabel("Logradouro")).toBeVisible();

  const panel = sheet.getByRole("navigation", { name: "Seções da ficha" });
  const address = panel.getByRole("button", { name: "Endereço" });
  await address.click();
  // Clicar acende o item: é o painel dizendo onde a leitura está.
  await expect(address).toHaveAttribute("aria-current", "location");
  // E a seção continua lá, inteira — ninguém trocou de painel.
  await expect(sheet.getByLabel("Logradouro")).toBeVisible();
});

test("a seção Pagamentos só busca o financeiro do cliente quando é aberta", async ({ page }) => {
  const finance: string[] = [];
  page.on("request", (r) => {
    if (/\/api\/v1\/(payments|revenues)/.test(r.url())) finance.push(r.url());
  });
  const sheet = await viewSheet(page);
  await page.waitForTimeout(500);
  expect(finance, "fechada, a seção não pede nada").toHaveLength(0);

  await sheet.getByRole("navigation", { name: "Seções da ficha" }).getByRole("button", { name: "Pagamentos" }).click();
  const tabs = sheet.getByRole("tablist", { name: "Financeiro do cliente" });
  await expect(tabs.getByRole("tab", { name: /Benefício/ })).toHaveAttribute("aria-selected", "true");
  await expect(tabs.getByRole("tab", { name: /Honorários/ })).toBeVisible();

  if (!integrationPaused("payments")) {
    await expect.poll(() => finance.filter((u) => u.includes(`clientId=${clientId}`)).length).toBeGreaterThan(0);
    // Cliente novo: nada lançado, e a seção diz isso em vez de ficar em branco.
    await expect(sheet.getByText("Nenhuma parcela de benefício lançada para este cliente.")).toBeVisible();
  }
});
