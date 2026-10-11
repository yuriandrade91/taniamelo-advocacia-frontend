import { test, expect } from "@playwright/test";

/**
 * O site do escritório (`/site`): público, sem sessão e sem API.
 *
 * Prova o que só o navegador mostra: a página abre sem erro de JavaScript, as
 * seções que o menu promete existem, o simulador da LC 142 responde à escolha,
 * o menu do celular abre e fecha, e o "falar com a equipe" abre a mensagem já
 * escrita para o WhatsApp.
 */

test.use({ storageState: { cookies: [], origins: [] } });

test("abre sem sessão, sem erro, e o menu leva às seções", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const apiCalls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/")) apiCalls.push(request.url());
  });

  await page.goto("/site");
  await expect(page).toHaveURL(/\/site$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tânia");

  const nav = page.getByRole("navigation", { name: "Principal" });
  for (const section of ["Atuação", "Como funciona", "Simulador PcD", "Dúvidas"]) {
    const href = await nav.getByRole("link", { name: section }).getAttribute("href");
    await expect(page.locator(href!)).toBeAttached();
  }

  await expect(page.locator("#contato")).toBeAttached();
  expect(errors).toEqual([]);
  expect(apiCalls, "o site não fala com a API").toEqual([]);
});

test("o simulador da LC 142 responde ao sexo e ao grau", async ({ page }) => {
  await page.goto("/site#simulador");
  const simulator = page.locator("#simulador");

  // Padrão: mulher, deficiência grave → 20 anos (10 a menos que 30).
  await expect(simulator.getByText("10 anos a menos")).toBeVisible();

  await simulator.getByText("Homem", { exact: true }).click();
  await simulator.getByText("Leve", { exact: true }).click();
  // Homem, leve → 33 anos, 2 a menos que 35.
  await expect(simulator.getByText("2 anos a menos")).toBeVisible();
  await expect(simulator.getByText(/60 anos, com 15 de contribuição/)).toBeVisible();
});

test("no celular, o menu abre, leva à seção e fecha", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/site");

  await page.getByRole("button", { name: "Abrir menu" }).click();
  const menu = page.locator("#site-menu");
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: /Dúvidas/ }).click();
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(/#duvidas$/);
});

test("o \"falar com a equipe\" escreve a mensagem do assunto escolhido", async ({ page }) => {
  await page.goto("/site");
  await page.getByRole("button", { name: "Falar com a equipe pelo WhatsApp" }).click();

  const dialog = page.getByRole("dialog", { name: /Sobre qual aposentadoria/ });
  await expect(dialog).toBeVisible();
  const send = dialog.getByRole("link", { name: "Enviar pelo WhatsApp" });

  await dialog.getByText("Rural", { exact: true }).click();
  await expect(dialog.getByLabel("Sua mensagem")).toHaveValue(/aposentadoria rural/i);
  await expect(send).toHaveAttribute("href", /^https:\/\/wa\.me\/55\d+\?text=/);

  // Escrever do zero começa em branco, e sem texto não há o que enviar.
  await dialog.getByText("Escrever do meu jeito", { exact: true }).click();
  await expect(dialog.getByLabel("Sua mensagem")).toHaveValue("");
  await expect(dialog.getByRole("button", { name: "Enviar pelo WhatsApp" })).toBeDisabled();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
