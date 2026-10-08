import { test, expect } from "@playwright/test";

/**
 * O mínimo que precisa estar de pé para qualquer outro teste significar algo:
 * a guarda de rota funciona e cada página principal renderiza com dados do
 * backend, sem erro de console.
 *
 * Deliberadamente sem gravação: se este arquivo falhar, o problema é ambiente
 * (backend fora, tenant errado, build quebrado) e não regra de negócio — e é
 * bom saber disso antes de investigar um formulário.
 */

test.describe("guarda de rota", () => {
  // Sem storageState: este bloco precisa de um navegador anônimo.
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const route of [
    "/home",
    "/clientes",
    "/agenda",
    "/pagamentos",
    "/carteira",
    "/relatorios",
    "/perfil",
  ]) {
    test(`sem sessão, ${route} manda para o login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe("páginas principais carregam autenticadas", () => {
  const pages = [
    { route: "/clientes", titulo: "Clientes" },
    { route: "/agenda", titulo: "Agenda" },
    { route: "/pagamentos", titulo: "Pagamentos" },
    { route: "/carteira", titulo: "Carteira" },
    { route: "/relatorios", titulo: "Relatórios" },
    { route: "/perfil", titulo: "Meus dados" },
  ];

  for (const { route, titulo } of pages) {
    test(`${route} renderiza`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));

      await page.goto(route);
      await expect(page.getByRole("heading", { name: titulo, level: 1 })).toBeVisible();

      // Erro de runtime no React não derruba a página inteira no Next; sem esta
      // asserção, um componente quebrado passaria despercebido.
      expect(errors, `erros de JavaScript em ${route}`).toEqual([]);
    });
  }

  /**
   * A home está fora da lista acima por um motivo que vale registrar: depois da
   * reformulação em cards ela não tem mais NENHUM `h1` — não usa o `PageHeader`
   * como as outras. É uma lacuna de acessibilidade real (leitor de tela abre a
   * página sem título), e não uma particularidade de teste.
   *
   * Enquanto isso não se resolve, o que se afirma aqui é o mesmo que nas
   * outras: a página monta com dados e sem erro de JavaScript. Trocar por uma
   * asserção mais fraca e ficar calado seria esconder a lacuna dentro do teste.
   */
  test("/home renderiza (sem h1 — ver comentário)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/home");
    await expect(page.getByRole("button", { name: /menu de/i })).toBeVisible();
    expect(errors, "erros de JavaScript em /home").toEqual([]);
  });
});

test("a listagem de clientes traz dados do backend", async ({ page }) => {
  const response = page.waitForResponse(
    (r) => r.url().includes("/api/v1/clients") && r.request().method() === "GET",
  );

  await page.goto("/clientes");
  expect((await response).status()).toBe(200);

  await expect(page.getByRole("list", { name: "Clientes" })).toBeVisible();
});
