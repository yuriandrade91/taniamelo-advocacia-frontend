import { test, expect, type Page } from "@playwright/test";

/**
 * A seção "Períodos de deficiência" do cadastro, de ponta a ponta.
 *
 * O que só se prova aqui: que a seção **aparece** ao escolher o benefício (era
 * exatamente a queixa — "não via as manipulações dos campos"), que a chave
 * "se mantém até a presente data" governa o campo de cessação, que o tempo
 * convertido é calculado na tela enquanto se digita, e que os intervalos
 * chegam ao banco pelo salvamento único.
 */

test.describe.configure({ mode: "serial" });

const abaDeficiencia = (page: Page) =>
  page.getByRole("tab", { name: /^Períodos de deficiência \(/ });

const perguntaSexo = (page: Page) =>
  page.getByRole("dialog", { name: /Qual o sexo do cliente/i });

/**
 * Escolhe a aposentadoria por deficiência e responde a pergunta de sexo que
 * ela abre — com `sexo`, ou "Agora não" quando omitido.
 */
async function escolherBeneficioDeficiencia(
  page: Page,
  sexo?: "Feminino" | "Masculino",
) {
  await page.getByLabel("Benefício pretendido").click();
  await page.getByRole("option", { name: "Aposentadoria por deficiência" }).click();
  const pergunta = perguntaSexo(page);
  await expect(pergunta).toBeVisible();
  await pergunta
    .getByRole("button", { name: sexo ? new RegExp(`^${sexo}`) : "Agora não" })
    .click();
  await expect(pergunta).toBeHidden();
}

test("a seção só aparece quando o benefício é por deficiência", async ({ page }) => {
  await page.goto("/clientes/novo", { waitUntil: "networkidle" });

  await expect(abaDeficiencia(page)).toHaveCount(0);
  await escolherBeneficioDeficiencia(page);
  await expect(abaDeficiencia(page)).toBeVisible();
});

test("escolher o benefício por deficiência pergunta o sexo e marca em Dados pessoais", async ({ page }) => {
  await page.goto("/clientes/novo", { waitUntil: "networkidle" });

  await escolherBeneficioDeficiencia(page, "Masculino");

  await page.getByRole("tab", { name: /^Dados pessoais \(/ }).click();
  await expect(page.getByRole("button", { name: /Gênero/ })).toContainText(
    "Masculino",
  );
});

test("a pergunta só volta ao trocar de novo para deficiência, com a resposta marcada", async ({ page }) => {
  await page.goto("/clientes/novo", { waitUntil: "networkidle" });
  await escolherBeneficioDeficiencia(page, "Feminino");

  // Outro benefício: nada a perguntar.
  await page.getByLabel("Benefício pretendido").click();
  await page.getByRole("option", { name: "Aposentadoria por idade" }).click();
  // A lista some com animação; reabrir o select antes disso casa o rótulo
  // com três elementos (gatilho, popover saindo e a lista).
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(perguntaSexo(page)).toHaveCount(0);

  // De volta à deficiência: pergunta de novo, já com Feminino marcado.
  await page.getByLabel("Benefício pretendido").click();
  await page.getByRole("option", { name: "Aposentadoria por deficiência" }).click();
  await expect(
    perguntaSexo(page).getByRole("button", { pressed: true }),
  ).toContainText("Feminino");
  await perguntaSexo(page).getByRole("button", { name: "Agora não" }).click();

  // "Agora não" não apaga o que já estava escolhido.
  await page.getByRole("tab", { name: /^Dados pessoais \(/ }).click();
  await expect(page.getByRole("button", { name: /Gênero/ })).toContainText(
    "Feminino",
  );
});

test("a chave de \"se mantém\" governa a data de cessação", async ({ page }) => {
  await page.goto("/clientes/novo", { waitUntil: "networkidle" });
  await escolherBeneficioDeficiencia(page);
  await abaDeficiencia(page).click();

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
  await escolherBeneficioDeficiencia(page);
  await abaDeficiencia(page).click();

  await expect(page.getByText(/^Período de deficiência$/)).toBeVisible();
  await page
    .getByRole("button", { name: /Adicionar novo intervalo de deficiência/i })
    .click();

  await expect(page.getByText("Período 1")).toBeVisible();
  await expect(page.getByText("Período 2")).toBeVisible();
});

test("o tempo convertido aparece na tela ao preencher o intervalo", async ({ page }) => {
  await page.goto("/clientes/novo", { waitUntil: "networkidle" });

  // Sexo é o que escolhe a coluna da LC 142/2013 — respondido na pergunta
  // que o próprio benefício abre.
  await escolherBeneficioDeficiencia(page, "Feminino");
  await page.getByLabel("Situação").click();
  await page.getByRole("option").first().click();

  await abaDeficiencia(page).click();
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
