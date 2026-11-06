import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { apiWithBrowserSession } from "./apiHelper";
import { STAFF, signInAsStaff } from "./helpers";

/**
 * A logo do escritório: enviada em "Meus dados", ela passa a ser a marca de
 * toda tela — cabeçalho e site; o login fica sempre com a padrão — e "voltar à marca padrão" desfaz.
 *
 * ## Por que o arquivo pode se pular inteiro
 *
 * A logo é do escritório, não do usuário de teste: se o escritório da suíte já
 * tem a sua, enviar outra e depois voltar à padrão apagaria a dele. Nesse caso
 * o teste se pula com aviso. O `afterAll` volta à marca padrão pela API se
 * algo falhar no meio — senão a logo de teste ficaria no cabeçalho de todos.
 */

test.describe.configure({ mode: "serial" });

/** 120×48, vermelho com traços brancos: impossível confundir com a marca padrão. */
const LOGO_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAHgAAAAwCAYAAADab77TAAAA4klEQVR42u3c0QnCQBBF0c1gMVqDsXpjDdqNqUCMi7CZybnfCZG9vIFB9rUGIC/TloeW+fx2VPtkXl5Tt2Bi84sOcmvwyVeQW1tykFtbcpBbW3I4jtqE9NZOsQQfJcEgGARjb5x6X7zen3//MY/bZch3s7DlfCTYiAbBIBgEg2AMW5MyrQoSDIJBMAgGwSAYhdekzP8mjVjxJNiIBsEgGASDYLTeC+BuNrSSd4Yl2IgGwSAYgwV/a2tBzlIWCT7SiJbiepVK8WuxFnL1ZUVPexrylKFFb0UecjTd6aos3lWJ4qwE0UKIRHMZKAAAAABJRU5ErkJggg==",
  "base64",
);

/** O alt do cabeçalho (`Navbar`). */
const HEADER_LOGO = "Tânia Melo Advocacia Previdenciária";

let api: APIRequestContext | null = null;
let sentByThisFile = false;

test.beforeAll(async () => {
  api = await apiWithBrowserSession();
  const current = await api?.get("/api/v1/tenants/current");
  const logoUrl = current?.ok() ? (await current.json()).data?.logoUrl : undefined;
  test.skip(!api || logoUrl === undefined, "sem sessão de API para conferir o escritório");
  test.skip(Boolean(logoUrl), "o escritório de teste já tem logo; trocá-la apagaria a dele");
});

test.afterAll(async () => {
  try {
    if (sentByThisFile) await api?.delete("/api/v1/tenants/current/logo");
  } catch {
    // Melhor seguir sem limpar do que derrubar a suíte pela limpeza.
  } finally {
    await api?.dispose();
  }
});

/** A imagem carregou de verdade (não é só o `src` certo apontando para um 404). */
async function expectLoaded(page: Page, alt: string) {
  await expect
    .poll(() => page.getByAltText(alt).first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth))
    .toBeGreaterThan(0);
}

test("ADMIN envia a logo e ela vira a marca do cabeçalho e o login segue na padrão", async ({ page, browser }) => {
  await page.goto("/perfil");
  await expect(page.getByRole("heading", { name: "Escritório" })).toBeVisible();

  const sent = page.waitForResponse((r) => r.request().method() === "PUT" && r.url().endsWith("/tenants/current/logo"));
  await page.getByLabel("Escolher a logo").setInputFiles({ name: "logo-e2e.png", mimeType: "image/png", buffer: LOGO_PNG });
  expect((await sent).status()).toBe(200);
  sentByThisFile = true;

  // Na hora, sem recarregar: o cabeçalho e as duas prévias trocam juntos.
  await expect(page.getByAltText(HEADER_LOGO)).toHaveAttribute("src", /\/api\/v1\/tenants\/logo\?slug=.+&v=\d+/);
  await expectLoaded(page, HEADER_LOGO);
  await expect(page.getByAltText("Logo sobre fundo escuro")).toHaveAttribute("src", /\/api\/v1\/tenants\/logo/);
  await expect(page.getByRole("button", { name: "Trocar logo" })).toBeVisible();

  // Recarregada a página, ela continua lá.
  await page.reload();
  await expect(page.getByAltText(HEADER_LOGO)).toHaveAttribute("src", /\/api\/v1\/tenants\/logo/);

  // O login é a marca padrão do sistema, com ou sem logo enviada.
  const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const login = await visitor.newPage();
  await login.goto("/login");
  await expect(login.getByAltText("Logo")).toHaveAttribute("src", "/svg/gold-logo.svg");
  await expectLoaded(login, "Logo");
  await visitor.close();
});

test("SVG é recusado antes de sair da tela", async ({ page }) => {
  await page.goto("/perfil");
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "PUT") requests.push(r.url());
  });

  await page.getByLabel("Escolher a logo").setInputFiles({
    name: "logo.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
  });

  await expect(page.getByRole("alert").filter({ hasText: "PNG, JPEG ou WebP" })).toBeVisible();
  expect(requests).toHaveLength(0);
});

test("voltar à marca padrão desfaz em toda tela", async ({ page }) => {
  test.skip(!sentByThisFile, "depende da logo enviada no primeiro teste");
  await page.goto("/perfil");

  await page.getByRole("button", { name: "Voltar à marca padrão" }).click();
  const removed = page.waitForResponse((r) => r.request().method() === "DELETE" && r.url().endsWith("/tenants/current/logo"));
  await page.getByRole("dialog").getByRole("button", { name: "Voltar à marca padrão" }).click();
  expect((await removed).status()).toBe(204);
  sentByThisFile = false;

  await expect(page.getByAltText(HEADER_LOGO)).toHaveAttribute("src", "/svg/tania/blue-logo.svg");
  await expect(page.getByRole("button", { name: "Enviar logo" })).toBeVisible();
});

test.describe("atendente", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("vê o escritório e a logo, sem como trocá-la", async ({ page }) => {
    test.skip(!STAFF.user || !STAFF.password, "defina E2E_USER_STAFF e E2E_PASSWORD_STAFF para rodar os testes de papel");
    await signInAsStaff(page);
    await page.goto("/perfil");

    await expect(page.getByText("Só a administração do escritório troca a logo.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Enviar logo|Trocar logo|Voltar à marca padrão/ })).toHaveCount(0);
  });
});
