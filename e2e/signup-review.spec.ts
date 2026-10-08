import { test, expect, type Page } from "@playwright/test";

/**
 * A aba "Revisão" do cadastro de cliente.
 *
 * As regras (o que é obrigatório, como cada valor aparece) são cobertas por
 * `review.test.ts`. O que só se prova no navegador: que o que foi digitado em
 * abas que já não estão montadas aparece na Revisão (a última aba), e que
 * "Editar" devolve à aba certa.
 *
 * Nada é gravado — o teste não clica em "Salvar cliente".
 */

const tab = (page: Page, titulo: string) =>
  page.getByRole("tab", { name: new RegExp(`^${titulo}`) });

test("a Revisão mostra o que foi digitado e o que falta, e Editar volta à aba", async ({ page }) => {
  await page.goto("/clientes/novo", { waitUntil: "networkidle" });

  await tab(page, "Dados pessoais \\(").click();
  await page.getByRole("textbox", { name: /^Nome completo/ }).fill("Maria Revisão");
  await page.getByRole("textbox", { name: /^Celular/ }).fill("(31) 99999-0000");

  await tab(page, "Dados profissionais \\(").click();
  await page.getByLabel("Senha do INSS (meu INSS)").fill("senha-que-nao-aparece");

  // A Revisão é a última aba, como quem terminou de preencher.
  await tab(page, "Revisão").click();
  await expect(tab(page, "Revisão")).toHaveAttribute("aria-selected", "true");

  const personal = page.getByRole("region", { name: "Dados pessoais" });
  await expect(personal.getByText("Maria Revisão")).toBeVisible();
  await expect(personal.getByText("(31) 99999-0000")).toBeVisible();

  // CPF ficou em branco: obrigatório, aparece como pendência.
  const cpf = personal
    .locator("dt", { hasText: /^CPF$/ })
    .locator("xpath=following-sibling::dd");
  await expect(cpf).toHaveText("Não preenchido");

  // A senha conta como preenchida, mas nunca é exibida.
  const professional = page.getByRole("region", { name: "Dados profissionais" });
  await expect(professional.getByText(/preenchida/)).toBeVisible();
  await expect(page.getByText("senha-que-nao-aparece")).toHaveCount(0);

  await page.getByRole("button", { name: "Editar Dados pessoais" }).click();
  await expect(tab(page, "Dados pessoais \\(")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("textbox", { name: /^Nome completo/ })).toHaveValue(
    "Maria Revisão",
  );
});
