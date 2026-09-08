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

  for (const rota of ["/home", "/clientes", "/agenda", "/pagamentos", "/carteira"]) {
    test(`sem sessão, ${rota} manda para o login`, async ({ page }) => {
      await page.goto(rota);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test.describe("páginas principais carregam autenticadas", () => {
  const paginas = [
    { rota: "/home", titulo: /início|home|olá/i },
    { rota: "/clientes", titulo: "Clientes" },
    { rota: "/agenda", titulo: "Agenda" },
    { rota: "/pagamentos", titulo: "Pagamentos" },
    { rota: "/carteira", titulo: "Carteira" },
  ];

  for (const { rota, titulo } of paginas) {
    test(`${rota} renderiza`, async ({ page }) => {
      const erros: string[] = [];
      page.on("pageerror", (e) => erros.push(e.message));

      await page.goto(rota);
      await expect(page.getByRole("heading", { name: titulo, level: 1 })).toBeVisible();

      // Erro de runtime no React não derruba a página inteira no Next; sem esta
      // asserção, um componente quebrado passaria despercebido.
      expect(erros, `erros de JavaScript em ${rota}`).toEqual([]);
    });
  }
});

test("a listagem de clientes traz dados do backend", async ({ page }) => {
  const resposta = page.waitForResponse(
    (r) => r.url().includes("/api/v1/clients") && r.request().method() === "GET",
  );

  await page.goto("/clientes");
  expect((await resposta).status()).toBe(200);

  await expect(page.getByRole("grid", { name: /tabela de clientes/i })).toBeVisible();
});
