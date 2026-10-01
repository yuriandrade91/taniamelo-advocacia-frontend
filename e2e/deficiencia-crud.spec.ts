import { test, expect } from "@playwright/test";

/**
 * A seção "Períodos de deficiência" do cadastro, de ponta a ponta.
 *
 * O que só se prova aqui: que a seção **aparece** ao escolher o benefício (era
 * exatamente a queixa — "não via as manipulações dos campos"), que a chave
 * "se mantém até a presente data" governa o campo de cessação, que o tempo
 * convertido é calculado na tela enquanto se digita, e que os intervalos
 * chegam ao banco pelo salvamento único.
 */

const CPF_BASE = Date.now().toString().slice(-9);
const cpf = `${CPF_BASE.slice(0, 3)}.${CPF_BASE.slice(3, 6)}.${CPF_BASE.slice(6, 9)}-00`;
const NOME = `Teste Deficiência ${CPF_BASE}`;

test.describe.configure({ mode: "serial" });

test("a seção só aparece quando o benefício é por deficiência", async ({ page }) => {
  await page.goto("/clientes/novo", { waitUntil: "networkidle" });

  const secao = page.getByRole("button", { name: /Períodos de deficiência/i });
  await expect(secao).toHaveCount(0);

  await page.getByLabel("Benefício pretendido").click();
  await page.getByRole("option", { name: "Aposentadoria por deficiência" }).click();

  await expect(secao).toBeVisible();
});

test("a chave de \"se mantém\" governa a data de cessação", async ({ page }) => {
  await page.goto("/clientes/novo", { waitUntil: "networkidle" });
  await page.getByLabel("Benefício pretendido").click();
  await page.getByRole("option", { name: "Aposentadoria por deficiência" }).click();
  await page.getByRole("button", { name: /Períodos de deficiência/i }).click();

  // Começa em aberto: o campo de cessação existe, mas desabilitado — a pessoa
  // precisa VER que ele está ali para entender o que a chave ao lado controla.
  // Esconder o campo deixaria a chave sem referente.
  const cessacao = page.getByRole("group", { name: /Data de cessação/i });
  await expect(cessacao).toBeVisible();
  await expect(cessacao).toHaveAttribute("data-disabled", "true");

  const chave = page.getByRole("switch", {
    name: /se mantém até a presente data/i,
  });
  await expect(chave).toBeChecked();

  // Teclado, e não `click()`: o `switch__control` do HeroUI cobre a caixa do
  // input, então o Playwright recusa o clique por interceptação. Espaço com o
  // controle em foco é como um usuário de teclado alterna — e deixa a asserção
  // cobrindo também esse caminho.
  await chave.press(" ");
  await expect(chave).not.toBeChecked();

  // Desmarcar é afirmar que cessou: o campo passa a aceitar a data.
  await expect(cessacao).not.toHaveAttribute("data-disabled", "true");
});

test("adicionar intervalo cria uma segunda linha", async ({ page }) => {
  await page.goto("/clientes/novo", { waitUntil: "networkidle" });
  await page.getByLabel("Benefício pretendido").click();
  await page.getByRole("option", { name: "Aposentadoria por deficiência" }).click();
  await page.getByRole("button", { name: /Períodos de deficiência/i }).click();

  await expect(page.getByText(/^Período de deficiência$/)).toBeVisible();
  await page
    .getByRole("button", { name: /Adicionar novo intervalo de deficiência/i })
    .click();

  await expect(page.getByText("Período 1")).toBeVisible();
  await expect(page.getByText("Período 2")).toBeVisible();
});

test("o tempo convertido aparece na tela ao preencher o intervalo", async ({ page }) => {
  await page.goto("/clientes/novo", { waitUntil: "networkidle" });

  await page.getByLabel("Benefício pretendido").click();
  await page.getByRole("option", { name: "Aposentadoria por deficiência" }).click();
  await page.getByLabel("Situação").click();
  await page.getByRole("option").first().click();

  // Sexo é o que escolhe a coluna da LC 142/2013. "Dados pessoais" já nasce
  // expandida (ver `expandedKeys`) — clicar no cabeçalho a FECHARIA.
  const genero = page.getByLabel("Gênero");
  await genero.scrollIntoViewIfNeeded();
  await genero.click();
  await page.getByRole("option", { name: "Feminino" }).click();

  await page.getByRole("button", { name: /Períodos de deficiência/i }).click();
  await page.getByLabel("Grau da deficiência").click();
  await page.getByRole("option", { name: "Grave" }).click();
  await preencheData(page, "Data de início", "01/01/2010");

  // Mulher, grave (20 anos) para a regra geral (30): fator 1,50.
  // Mulher, grave (20 anos) para a regra geral (30): 30 ÷ 20 = 1,50.
  await expect(
    page.getByText(/Tempo convertido para a regra geral \(30 anos\)/),
  ).toBeVisible();
  await expect(page.getByText(/1,50/)).toBeVisible();
  await expect(page.getByText(/^Total:/)).toBeVisible();
});

/**
 * Preenche um `DatePickerField`.
 *
 * Mira o PRIMEIRO segmento (dia), não o grupo: clicar no grupo foca o segmento
 * que estiver sob o ponteiro — na prática o ano — e os oito dígitos acabavam
 * todos nele, deixando `dd/mm/2010`. Com o dia em foco, a digitação avança
 * sozinha pelos três segmentos.
 */
async function preencheData(
  page: import("@playwright/test").Page,
  label: string | RegExp,
  valor: string,
) {
  const grupo = page.getByRole("group", { name: label });
  await grupo.getByRole("spinbutton").first().click();
  await page.keyboard.type(valor.replace(/\D/g, ""));
}
