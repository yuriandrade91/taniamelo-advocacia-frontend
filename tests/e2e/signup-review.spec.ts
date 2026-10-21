import { test, expect, type Page } from "@playwright/test";
import { validCpf } from "./apiHelper";
import { choose, fillDateSegments, openSection } from "./helpers";

/**
 * A aba "Revisão" do cadastro de cliente.
 *
 * As regras (o que é obrigatório, como cada valor aparece) são cobertas por
 * `review.test.ts`. O que só se prova no navegador: que o que falta aparece na
 * barra de ações enquanto falta, que o que foi digitado em abas que já não
 * estão montadas aparece na Revisão (a última aba), e que "Editar" devolve à
 * aba certa.
 *
 * As abas não deixam avançar com obrigatório em branco, então a Revisão só
 * abre com o cadastro completo — é por isso que a pendência se confere antes,
 * na barra. Nada é gravado: o teste não clica em "Salvar cliente".
 */

const tab = (page: Page, title: string) => page.getByRole("tab", { name: new RegExp(`^${title}`) });

test("o que falta fica na barra; a Revisão mostra o que foi digitado e Editar volta à aba", async ({ page }) => {
  await page.goto("/clientes/novo", { waitUntil: "networkidle" });

  await choose(page, "Benefício pretendido", "Aposentadoria por idade");
  await choose(page, "Situação", "Formulário preenchido");

  await openSection(page, "Dados pessoais");
  await page.getByRole("textbox", { name: /^Nome completo/ }).fill("Maria Revisão");
  await fillDateSegments(page, "Data de nascimento", ["20", "05", "1970"]);
  await page.getByRole("textbox", { name: /^Nome da mãe/ }).fill("Maria de Teste");
  await page.getByRole("textbox", { name: /^Celular/ }).fill("(31) 99999-0000");
  await choose(page, "Gênero", "Feminino");

  // CPF ainda em branco: obrigatório, aparece como pendência que leva à aba.
  await expect(page.getByRole("button", { name: "CPF — ir para Dados pessoais" })).toBeVisible();
  await page.getByRole("textbox", { name: /^CPF/ }).fill(validCpf());
  await expect(page.getByRole("button", { name: "CPF — ir para Dados pessoais" })).toHaveCount(0);

  await openSection(page, "Dados profissionais");
  await page.getByLabel("Senha do INSS (meu INSS)").fill("senha-que-nao-aparece");

  // A Revisão é a última aba, como quem terminou de preencher.
  await tab(page, "Revisão").click();
  await expect(tab(page, "Revisão")).toHaveAttribute("aria-selected", "true");

  const personal = page.getByRole("region", { name: "Dados pessoais" });
  await expect(personal.getByText("Maria Revisão")).toBeVisible();
  await expect(personal.getByText("(31) 99999-0000")).toBeVisible();

  // A senha conta como preenchida, mas nunca é exibida.
  const professional = page.getByRole("region", { name: "Dados profissionais" });
  await expect(professional.getByText(/preenchida/)).toBeVisible();
  await expect(page.getByText("senha-que-nao-aparece")).toHaveCount(0);

  await page.getByRole("button", { name: "Editar Dados pessoais" }).click();
  await expect(tab(page, String.raw`Dados pessoais \(`)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("textbox", { name: /^Nome completo/ })).toHaveValue("Maria Revisão");
});

test("o relato da entrevista chega à Revisão com a formatação do editor", async ({ page }) => {
  await page.goto("/clientes/novo", { waitUntil: "networkidle" });
  await choose(page, "Benefício pretendido", "Aposentadoria por idade");
  await choose(page, "Situação", "Formulário preenchido");
  await openSection(page, "Dados pessoais");
  await page.getByRole("textbox", { name: /^Nome completo/ }).fill("Maria Relato");
  await fillDateSegments(page, "Data de nascimento", ["20", "05", "1970"]);
  await page.getByRole("textbox", { name: /^Nome da mãe/ }).fill("Maria de Teste");
  await page.getByRole("textbox", { name: /^Celular/ }).fill("(31) 99999-0000");
  await choose(page, "Gênero", "Feminino");
  await page.getByRole("textbox", { name: /^CPF/ }).fill(validCpf());
  await openSection(page, "Dados profissionais");
  await page.getByLabel("Senha do INSS (meu INSS)").fill("senha-que-nao-aparece");

  // Escreve como a pessoa: texto, negrito pela barra, uma lista.
  await openSection(page, "Entrevista");
  const editor = page.locator(".tiptap");
  await editor.click();
  await page.keyboard.type("Trouxe a ");
  await page.getByRole("button", { name: "Negrito" }).click();
  await page.keyboard.type("CTPS");
  await page.getByRole("button", { name: "Negrito" }).click();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Lista com marcadores" }).click();
  await page.keyboard.type("falta o CNIS");
  await page.keyboard.press("Enter");
  await page.keyboard.type("falta o laudo");

  await tab(page, "Revisão").click();
  // Vale para as duas vistas da Revisão: a formatação está no conteúdo, não no desenho.
  const interview = page.getByRole("region", { name: "Entrevista" });
  await expect(interview.locator("strong")).toHaveText("CTPS");
  await expect(interview.getByRole("listitem")).toHaveText(["falta o CNIS", "falta o laudo"]);
});
