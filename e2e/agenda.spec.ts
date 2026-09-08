import { test, expect, type Page, request as playwrightRequest } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * O fluxo que mais depende de backend e navegador ao mesmo tempo: agendar,
 * ver o aviso de conflito de horário e limpar o que foi criado.
 *
 * Vale como e2e porque nada aqui é verificável isoladamente — o aviso de
 * conflito é uma consulta ao servidor (`GET /appointments/conflicts`) disparada
 * enquanto se digita, e só aparece se o compromisso anterior realmente gravou.
 */

/** Ano à frente: a agenda recusa data no passado sem confirmação explícita. */
const ANO = new Date().getFullYear() + 1;
const TITULO = `E2E compromisso ${Date.now()}`;
const criados: string[] = [];

/**
 * Preenche um campo de data/hora do react-aria segmento a segmento.
 *
 * Não dá para usar `fill`: cada parte (dia, mês, ano, hora, minuto) é um
 * spinbutton próprio, não um input de texto. Clicar em cada um e digitar é o
 * que um usuário faz — e é o que o componente entende.
 */
async function preencherDataHora(page: Page, rotulo: string, partes: string[]) {
  const segmentos = page.getByRole("group", { name: rotulo }).getByRole("spinbutton");
  for (let i = 0; i < partes.length; i++) {
    await segmentos.nth(i).click();
    await page.keyboard.type(partes[i]);
  }
}

async function abrirFormulario(page: Page) {
  await page.goto("/agenda");
  await page.getByRole("button", { name: "Novo compromisso" }).click();
  await expect(page.getByRole("heading", { name: /novo compromisso/i })).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test("agendar um compromisso novo", async ({ page }) => {
  await abrirFormulario(page);

  await page.getByLabel("Título").fill(TITULO);
  await page.getByLabel("Tipo").click();
  await page.getByRole("option", { name: "Entrevista" }).click();

  await preencherDataHora(page, "Início", ["20", "08", String(ANO), "14", "30"]);
  await preencherDataHora(page, "Término", ["20", "08", String(ANO), "15", "30"]);

  // Nome livre (o ComboBox aceita valor fora da lista): não depende de haver
  // cliente cadastrado no banco em que a suíte roda.
  await page.getByPlaceholder("Nome da pessoa").fill("Fulano de Teste E2E");

  const resposta = page.waitForResponse(
    (r) => r.url().endsWith("/api/v1/appointments") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Agendar", exact: true }).click();

  const criado = await resposta;
  expect(criado.status()).toBe(201);
  criados.push((await criado.json()).data.id);

  await expect(page.getByText(TITULO)).toBeVisible();
});

test("o mesmo horário avisa do conflito, sem impedir", async ({ page }) => {
  await abrirFormulario(page);

  await page.getByLabel("Título").fill(`${TITULO} (segundo)`);
  await page.getByLabel("Tipo").click();
  await page.getByRole("option", { name: "Reunião" }).click();

  const conflitos = page.waitForResponse((r) => r.url().includes("/appointments/conflicts"));
  await preencherDataHora(page, "Início", ["20", "08", String(ANO), "14", "30"]);
  await preencherDataHora(page, "Término", ["20", "08", String(ANO), "15", "30"]);
  await conflitos;

  // O aviso diz COM QUEM o horário bate — "existe conflito" sem dizer com o quê
  // obrigaria a abrir outra tela para decidir.
  await expect(page.getByText(TITULO, { exact: false }).first()).toBeVisible();

  // E não bloqueia: perícia e audiência se sobrepõem de propósito.
  await expect(page.getByRole("button", { name: "Agendar", exact: true })).toBeEnabled();
});

/**
 * Limpeza pela API, não pela interface.
 *
 * Um teste que termina falhando no meio deixaria a tela em qualquer estado; a
 * limpeza precisa funcionar mesmo assim. E cancelar pela API não é "trapaça":
 * o que está sendo testado acima é a tela, não a limpeza.
 */
test.afterAll(async () => {
  if (criados.length === 0) return;

  const estado = JSON.parse(readFileSync("e2e/.auth/user.json", "utf-8"));
  const token = estado.cookies?.find((c: { name: string }) => c.name === "token")?.value;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!token || !apiUrl) return;

  const api = await playwrightRequest.newContext({
    baseURL: apiUrl,
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
      ...(process.env.E2E_TENANT_ID ? { "X-Tenant-Id": process.env.E2E_TENANT_ID } : {}),
    },
  });
  for (const id of criados) {
    await api.delete(`/api/v1/appointments/${id}`);
  }
  await api.dispose();
});
