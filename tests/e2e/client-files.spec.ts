import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { apiWithBrowserSession, validCpf, TAG } from "./apiHelper";
import { fillDateSegments } from "./helpers";

/**
 * Os arquivos na ficha do cliente: enviar, ver o que subiu e excluir.
 *
 * O `client-sheet.spec.ts` cobre abrir e baixar; este cobre o resto, onde
 * moravam os defeitos que só aparecem com o backend de verdade:
 * - o que acabava de subir sumia da ficha depois do "Salvar" (a releitura dos
 *   arquivos era desfeita pelo retrato de antes) e só voltava ao reabrir;
 * - a principal marcada na tela era ignorada: o backend faz principal a
 *   última simulação do lote;
 * - um arquivo que o backend recusa (um PNG em simulações) passava pela tela
 *   e derrubava o lote com "Nem todos os arquivos foram enviados";
 * - a ficha lia só os 10 primeiros arquivos de cada lado.
 */

test.describe.configure({ mode: "serial" });

const NAME = `${TAG} Arquivos ${Date.now().toString(36)}`;
/** O nome como expressão regular: os colchetes do sufixo são literais. */
const escapedName = NAME.replaceAll(/[[\]]/g, String.raw`\$&`);
/** Um PDF mínimo, mas de verdade: o backend confere o tipo do conteúdo. */
const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj " +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);
/** Onze: um a mais que a página padrão da API. */
const SEEDED = Array.from({ length: 11 }, (_, i) => `laudo-${String(i + 1).padStart(2, "0")}.pdf`);

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
    },
  });
  expect(response.status(), await response.text()).toBe(201);
  const created = (await response.json()).data;
  clientId = created.clientId ?? created.id;

  // O Playwright repete a parte `files` quando ela é uma lista.
  const form = new FormData();
  for (const name of SEEDED) form.append("files", new Blob([PDF], { type: "application/pdf" }), name);
  form.append(
    "metadata",
    new Blob([JSON.stringify(SEEDED.map(() => ({ documentType: "DOCUMENTOS_MEDICOS" })))], { type: "application/json" }),
  );
  const upload = await api!.post(`/api/v1/clients/${clientId}/files/documents`, { multipart: form });
  expect(upload.status(), await upload.text()).toBe(201);
});

test.afterAll(async () => {
  if (api && clientId) await api.delete(`/api/v1/clients/${clientId}`);
  await api?.dispose();
});

/** Abre a ficha deste cliente (já editando, pelo editar da lista, ou só vendo) na seção Arquivos. */
async function openFiles(page: Page, mode: "view" | "edit") {
  await page.goto("/clientes");
  await page.getByPlaceholder("Pesquisar beneficiário").fill(NAME);
  await page.waitForResponse((r) => r.url().includes("searchTerm") && r.request().method() === "GET");
  await page
    .getByRole("button", { name: mode === "edit" ? "Editar este cliente" : "Visualizar este cliente" })
    .first()
    .click();
  // Só a ficha tem "Nome completo": a confirmação de excluir também é um diálogo.
  const sheet = page.getByRole("dialog").filter({ has: page.getByLabel("Nome completo") });
  await expect(sheet.getByLabel("Nome completo")).toHaveValue(new RegExp(`^${escapedName}`));
  await sheet.getByRole("navigation", { name: "Seções da ficha" }).getByRole("button", { name: "Arquivos" }).click();
  return sheet;
}

const listSimulations = async () =>
  ((await (await api!.get(`/api/v1/clients/${clientId}/files/simulations?pageSize=100`)).json()).data ?? []) as {
    originalFilename: string;
    isPrincipal: boolean;
  }[];

test("a ficha mostra todos os arquivos, não só os 10 primeiros", async ({ page }) => {
  const sheet = await openFiles(page, "view");
  const nav = sheet.getByRole("navigation", { name: "Seções da ficha" });
  await expect(nav.getByRole("button", { name: /Arquivos/ })).toContainText("11 arquivos");
  await expect(sheet.getByText("1 a 10 de 11 documentos")).toBeVisible();
});

test("enviar pela ficha: o que subiu aparece na hora, e a principal é a escolhida", async ({ page }) => {
  const sheet = await openFiles(page, "edit");
  const input = sheet.locator('input[type="file"]');

  await input.setInputFiles({ name: "rg-frente.pdf", mimeType: "application/pdf", buffer: PDF });
  const document = sheet.getByRole("listitem").filter({ hasText: "rg-frente.pdf" });
  // O tipo sai do nome; a observação é com quem envia.
  await expect(document.getByRole("button", { name: /Tipo do documento/ })).toContainText("identificação");
  await document.getByLabel("Observações").fill("RG frente");

  await sheet.getByRole("tab", { name: /^Simulações/ }).click();
  await input.setInputFiles([
    { name: "simulacao-v1.pdf", mimeType: "application/pdf", buffer: PDF },
    { name: "simulacao-v2.pdf", mimeType: "application/pdf", buffer: PDF },
  ]);
  for (const name of ["simulacao-v1.pdf", "simulacao-v2.pdf"]) {
    const card = sheet.getByRole("listitem").filter({ hasText: name });
    await fillDateSegments(card, "Data da simulação", ["01", "10", "2026"]);
    await card.getByLabel("Vínculos").fill("3");
    await card.getByLabel("Observações").fill("cenário");
  }
  // A primeira do lote: sem a marca pela rota própria, o backend escolheria a última.
  await sheet.getByRole("listitem").filter({ hasText: "simulacao-v1.pdf" }).getByRole("button", { name: "Tornar principal" }).click();

  const documentsSent = page.waitForResponse((r) => r.url().endsWith("/files/documents") && r.request().method() === "POST");
  const simulationsSent = page.waitForResponse((r) => r.url().endsWith("/files/simulations") && r.request().method() === "POST");
  const principalMarked = page.waitForResponse((r) => r.url().endsWith("/principal") && r.request().method() === "PATCH");
  await sheet.getByRole("button", { name: "Salvar", exact: true }).click();
  expect((await documentsSent).status()).toBe(201);
  expect((await simulationsSent).status()).toBe(201);
  expect((await principalMarked).status()).toBe(200);
  await expect(page.getByText("Ficha atualizada.")).toHaveCount(1);

  // Sem reabrir: os cartões gravados (com Visualizar) já estão lá.
  await expect(sheet.getByRole("listitem").filter({ hasText: "simulacao-v1.pdf" })).toContainText("Principal");
  await expect(
    sheet.getByRole("listitem").filter({ hasText: "simulacao-v2.pdf" }).getByRole("button", { name: "Visualizar" }),
  ).toBeVisible();
  await sheet.getByRole("tab", { name: /^Documentos/ }).click();
  await expect(
    sheet.getByRole("listitem").filter({ hasText: "rg-frente.pdf" }).getByRole("button", { name: "Visualizar" }),
  ).toBeVisible();
  const nav = sheet.getByRole("navigation", { name: "Seções da ficha" });
  await expect(nav.getByRole("button", { name: /Arquivos/ })).toContainText("14 arquivos");

  const principal = (await listSimulations()).filter((item) => item.isPrincipal).map((item) => item.originalFilename);
  expect(principal).toEqual(["simulacao-v1.pdf"]);
});

test("arquivo que o backend recusa é barrado na tela, antes de enviar", async ({ page }) => {
  const sheet = await openFiles(page, "edit");
  await sheet.getByRole("tab", { name: /^Simulações/ }).click();
  const input = sheet.locator('input[type="file"]');
  // O seletor já oferece só o que serve; colar ou arrastar ainda trazem qualquer coisa.
  await expect(input).toHaveAttribute("accept", "application/pdf");

  await input.setInputFiles({ name: "print.png", mimeType: "image/png", buffer: Buffer.from("png") });
  const card = sheet.getByRole("listitem").filter({ hasText: "print.png" });
  // O problema aparece no cartão, na hora — não depois de um 400.
  await expect(card.getByRole("alert")).toHaveText("Simulação só aceita PDF.");

  await fillDateSegments(card, "Data da simulação", ["01", "10", "2026"]);
  await card.getByLabel("Versão").fill("1");
  await card.getByLabel("Vínculos").fill("3");
  await card.getByLabel("Observações").fill("cenário");

  const uploads: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes("/files/")) uploads.push(r.url());
  });
  await sheet.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(sheet.getByText(/Revise os campos destacados/)).toBeVisible();
  expect(uploads).toEqual([]);

  // Tirando o arquivo, não sobra pendência.
  await card.getByRole("button", { name: "Remover print.png" }).click();
  await expect(card).toHaveCount(0);
});

test("clicar na zona abre o seletor, nas duas abas, mesmo depois de trocar de aba", async ({ page }) => {
  // O clique de verdade, não o input preenchido direto: com um seletor em
  // cada aba dividindo o mesmo ref, trocar de aba o zerava e a zona parava
  // de abrir o seletor — o `setInputFiles` dos outros testes não via isso.
  const sheet = await openFiles(page, "edit");
  const zone = sheet.getByRole("button", { name: /ou clique para escolher/ });
  const choose = async () => {
    const chooser = page.waitForEvent("filechooser", { timeout: 5_000 });
    await zone.click();
    return chooser;
  };

  await (await choose()).setFiles([]);

  await sheet.getByRole("tab", { name: /^Simulações/ }).click();
  const simulations = await choose();
  expect(simulations.isMultiple()).toBe(true);
  await simulations.setFiles({ name: "calculo-v3.pdf", mimeType: "application/pdf", buffer: PDF });
  const card = sheet.getByRole("listitem").filter({ hasText: "calculo-v3.pdf" });
  await expect(card.getByLabel("Versão")).toHaveValue("3");

  await sheet.getByRole("tab", { name: /^Documentos/ }).click();
  await (await choose()).setFiles([]);
});

test("excluir um arquivo gravado tira ele da ficha", async ({ page }) => {
  const sheet = await openFiles(page, "edit");
  const card = sheet.getByRole("listitem").filter({ hasText: "rg-frente.pdf" });
  await card.getByRole("button", { name: "Excluir" }).click();

  const removed = page.waitForResponse((r) => r.request().method() === "DELETE" && r.url().includes("/files/"));
  await page.getByRole("dialog", { name: "Excluir este arquivo?" }).getByRole("button", { name: "Excluir" }).click();
  expect((await removed).status()).toBe(204);
  await expect(card).toHaveCount(0);

  const documents = (await (await api!.get(`/api/v1/clients/${clientId}/files/documents?pageSize=100`)).json()).data;
  expect(documents.map((item: { originalFilename: string }) => item.originalFilename)).not.toContain("rg-frente.pdf");
});

test("vista, a ficha só abre e baixa: nada de adicionar nem excluir", async ({ page }) => {
  const sheet = await openFiles(page, "view");
  await expect(sheet.locator('input[type="file"]')).toHaveCount(0);
  const card = sheet.getByRole("listitem").filter({ hasText: /laudo-\d+\.pdf/ }).first();
  await expect(card.getByRole("button", { name: "Baixar" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Excluir" })).toHaveCount(0);
});
