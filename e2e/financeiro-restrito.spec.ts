import { test, expect, type Page } from "@playwright/test";

/**
 * O financeiro é só do administrador (D3).
 *
 * O backend impõe: `ClientPaymentController` é `@RequerAdmin` na classe, e
 * advogado toma 403 igual a atendente. Sem a guarda na tela, `/pagamentos`
 * carregava, engolia o 403 e mostrava uma lista vazia — que se lê como "não há
 * pagamentos", e é a pior forma de negar acesso: quem olha conclui a coisa
 * errada sobre os dados, não sobre a própria permissão.
 *
 * O que se prova aqui são as duas metades: o item some do menu para quem não
 * pode, e quem digitar o endereço direto encontra uma explicação em vez de uma
 * tela vazia. A contraprova no fim do arquivo é o que impede isto de passar
 * verde com o menu quebrado para todo mundo.
 */

const usuario = process.env.E2E_USER_STAFF;
const senha = process.env.E2E_PASSWORD_STAFF;

async function entrarComoAtendente(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Usuário").fill(usuario!);
  await page.getByPlaceholder("Senha").fill(senha!);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL("**/home");
}

test.describe("atendente não alcança o financeiro", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    test.skip(
      !usuario || !senha,
      "defina E2E_USER_STAFF e E2E_PASSWORD_STAFF para rodar os testes de papel",
    );
    await entrarComoAtendente(page);
  });

  test("o menu não oferece Pagamentos nem Carteira", async ({ page }) => {
    const menu = page.getByRole("navigation");

    // Os itens do dia a dia continuam — se sumirem, a regra está errada.
    await expect(menu.getByRole("link", { name: "Clientes" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Agenda" })).toBeVisible();

    await expect(menu.getByRole("link", { name: "Pagamentos" })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Carteira" })).toHaveCount(0);
  });

  for (const rota of ["/pagamentos", "/carteira"]) {
    test(`${rota} digitado na barra explica em vez de mostrar vazio`, async ({
      page,
    }) => {
      await page.goto(rota);

      await expect(
        page.getByText(/restrito ao administrador do escritório/i),
      ).toBeVisible();

      // A parte que separa "negado" de "vazio": nenhuma tabela de valores
      // aparece. Uma tela vazia passaria neste teste se olhássemos só o texto.
      await expect(page.getByRole("table")).toHaveCount(0);
    });
  }
});

/**
 * A contraprova. Sem ela, um menu quebrado — ou um `podeVerFinanceiro` que
 * devolve `false` para todo mundo — deixaria os testes acima verdes.
 */
test.describe("para o administrador, o financeiro está lá", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("menu oferece Pagamentos e Carteira, e a página abre", async ({
    page,
  }) => {
    await page.goto("/home");
    const menu = page.getByRole("navigation");
    await expect(menu.getByRole("link", { name: "Pagamentos" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Carteira" })).toBeVisible();

    await page.goto("/pagamentos");
    await expect(
      page.getByText(/restrito ao administrador do escritório/i),
    ).toHaveCount(0);
  });
});
