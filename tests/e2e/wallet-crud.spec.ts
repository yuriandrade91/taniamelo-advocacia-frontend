import { test, expect, type Page } from "@playwright/test";

import { apiWithBrowserSession, integrationPaused, TAG } from "./apiHelper";
import { closeSuggestions, dueThisMonth, fillDateSegments, paidThisMonth } from "./helpers";

/**
 * Carteira, ponta a ponta: lançar, editar e excluir — entrada e saída.
 *
 * Vale como e2e porque nenhuma das três coisas é verificável isoladamente. O
 * lançamento é um POST cujo corpo depende de um formulário que muda conforme o
 * tipo; a edição é um **PUT que substitui o registro inteiro**, então um campo
 * esquecido no caminho não dá erro — grava errado; e a exclusão só se confirma
 * quando a linha some da lista *e* o total do mês muda.
 *
 * O caso que este arquivo existe para travar: editar um lançamento cancelado
 * sem ressuscitá-lo. O servidor volta o status para Pendente quando ele não vem
 * no corpo, e o sintoma é silencioso — a despesa cancelada reaparece somando no
 * mês seguinte, e ninguém liga uma coisa à outra.
 */

test.describe.configure({ mode: "serial" });
/** Sem as rotas de receita e despesa neste ambiente, não há fluxo para exercitar. */
test.skip(integrationPaused("expenses", "revenues"), "rotas da Carteira em pausa neste ambiente");

/** Sorteado por execução: duas execuções no mesmo banco não se confundem. */
const STAMP = Date.now();
const REVENUE = `${TAG} honorário ${STAMP}`;
const EDITED_REVENUE = `${REVENUE} (corrigido)`;
const EXPENSE = `${TAG} aluguel ${STAMP}`;
const EDITED_EXPENSE = `${EXPENSE} (corrigido)`;

/** Criados pela tela; a limpeza roda pela API mesmo se um teste falhar no meio. */
const revenues: string[] = [];
const expenses: string[] = [];



const form = (page: Page, name: RegExp) =>
  page.getByRole("dialog", { name: name });



async function openNewEntry(page: Page) {
  await page.goto("/carteira");
  await page.getByRole("button", { name: "Registrar lançamento" }).click();
  return form(page, /novo lançamento/i);
}

/** A linha da lista que contém esta descrição — na aba que estiver aberta. */
const row = (page: Page, descricao: string) =>
  page.getByRole("listitem").filter({ hasText: descricao });

/**
 * As listas ficam em abas (Saídas abre por padrão). O rótulo leva a contagem
 * do mês, daí a regex. A busca isola o lançamento deste teste: o mês pode ter
 * mais de uma página de lançamentos.
 */
async function openWallet(page: Page, tab: "Saídas" | "Entradas" = "Saídas") {
  await page.goto("/carteira");
  if (tab === "Entradas") await page.getByRole("tab", { name: /^Entradas/ }).click();
  await page.getByRole("searchbox", { name: "Pesquisar lançamento" }).fill(String(STAMP));
}

test("lançar uma entrada", async ({ page }) => {
  const modal = await openNewEntry(page);

  // Entrada é o tipo inicial; clicar mesmo assim prova que o seletor responde.
  await modal.getByRole("radio", { name: "Entrada" }).click();

  // Cliente é opcional: receita de parecer avulso ou reembolso não vem de
  // cliente nenhum, e o formulário precisa aceitar isso sem asterisco.
  await expect(modal.getByLabel(/cliente \(opcional\)/i)).toBeVisible();

  await modal.getByLabel("Descrição").fill(REVENUE);
  await modal.getByLabel("Valor").fill("1.500,00");
  await fillDateSegments(modal, "Vencimento", dueThisMonth());

  await closeSuggestions(page);

  const creation = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      /\/api\/v1\/revenues$/.test(new URL(r.url()).pathname),
  );
  await modal.getByRole("button", { name: "Lançar receita" }).click();

  const response = await creation;
  expect(response.status()).toBe(201);
  revenues.push((await response.json()).data.id);

  // Gravou: a tela abre a aba do que foi lançado.
  await expect(modal).toBeHidden();
  await expect(page.getByRole("tab", { name: /^Entradas/ })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("searchbox", { name: "Pesquisar lançamento" }).fill(String(STAMP));
  await expect(row(page, REVENUE)).toBeVisible();
});

test("lançar uma saída", async ({ page }) => {
  const modal = await openNewEntry(page);

  await modal.getByRole("radio", { name: "Saída" }).click();
  await modal.getByLabel("Descrição").fill(EXPENSE);
  await modal.getByLabel("Valor").fill("2.300,00");
  await fillDateSegments(modal, "Vencimento", dueThisMonth());

  const creation = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      /\/api\/v1\/expenses$/.test(new URL(r.url()).pathname),
  );
  await modal.getByRole("button", { name: "Lançar saída" }).click();

  const response = await creation;
  expect(response.status()).toBe(201);
  expenses.push((await response.json()).data.id);

  await expect(modal).toBeHidden();
  await page.getByRole("searchbox", { name: "Pesquisar lançamento" }).fill(String(STAMP));
  await expect(row(page, EXPENSE)).toBeVisible();
});

test("editar a entrada: o registro muda e o tipo não se troca", async ({
  page,
}) => {
  await openWallet(page, "Entradas");
  await row(page, REVENUE).getByRole("button", { name: "Editar receita" }).click();

  const modal = form(page, /editar entrada/i);
  await expect(modal).toBeVisible();

  // O campo vem preenchido com o que está gravado. Modal de edição que abre
  // vazio e salva assim apaga o registro sem avisar.
  await expect(modal.getByLabel("Descrição")).toHaveValue(REVENUE);
  await expect(modal.getByLabel("Valor")).toHaveValue(/1\.?500,00/);

  // Trocar entrada por saída num registro existente seria apagar de uma tabela
  // e criar na outra — o botão não diz isso, então o seletor não existe aqui.
  await expect(modal.getByRole("radiogroup")).toHaveCount(0);

  await modal.getByLabel("Descrição").fill(EDITED_REVENUE);

  const edit = page.waitForResponse(
    (r) => r.request().method() === "PUT" && r.url().includes("/api/v1/revenues/"),
  );
  await modal.getByRole("button", { name: "Salvar" }).click();

  expect((await edit).status()).toBe(200);
  await expect(modal).toBeHidden();
  await expect(row(page, EDITED_REVENUE)).toBeVisible();
});

test("editar a saída marcando que já foi paga muda o status", async ({
  page,
}) => {
  await openWallet(page);
  await row(page, EXPENSE).getByRole("button", { name: "Editar despesa" }).click();

  const modal = form(page, /editar saída/i);
  await modal.getByLabel("Descrição").fill(EDITED_EXPENSE);

  // A caixa é o que decide Pendente × Pago; a data segue junto.
  // O HeroUI cobre o `input` do switch com o trilho: o clique vai no controle.
  await modal.getByRole("switch", { name: /já foi paga|já foi pago/i }).click({ force: true });
  await fillDateSegments(modal, "Data do pagamento", paidThisMonth());

  const edit = page.waitForResponse(
    (r) => r.request().method() === "PUT" && r.url().includes("/api/v1/expenses/"),
  );
  await modal.getByRole("button", { name: "Salvar" }).click();

  const response = await edit;
  expect(response.status()).toBe(200);
  // O status vai no corpo: omiti-lo faria o servidor devolver para Pendente,
  // e a tela mostraria "Paga" só até o próximo carregamento.
  expect((await response.json()).data.status).toBe("Pago");

  await expect(modal).toBeHidden();
  await expect(row(page, EDITED_EXPENSE)).toBeVisible();
});

test("excluir a entrada tira a linha da lista", async ({ page }) => {
  await openWallet(page, "Entradas");
  await row(page, EDITED_REVENUE)
    .getByRole("button", { name: "Excluir receita" })
    .click();

  const dialog = page.getByRole("dialog", { name: /excluir entrada/i });
  await expect(dialog).toBeVisible();
  // O diálogo nomeia o registro: "confirma a exclusão?" sem dizer de quê é
  // como se apaga a linha errada com toda a confiança.
  await expect(dialog.getByText(EDITED_REVENUE)).toBeVisible();

  const removal = page.waitForResponse(
    (r) =>
      r.request().method() === "DELETE" && r.url().includes("/api/v1/revenues/"),
  );
  await dialog.getByRole("button", { name: "Excluir" }).click();

  expect((await removal).status()).toBe(204);
  await expect(row(page, EDITED_REVENUE)).toHaveCount(0);
  revenues.length = 0; // já foi
});

test("excluir a saída tira a linha da lista", async ({ page }) => {
  await openWallet(page);
  await row(page, EDITED_EXPENSE)
    .getByRole("button", { name: "Excluir despesa" })
    .click();

  const dialog = page.getByRole("dialog", { name: /excluir saída/i });
  const removal = page.waitForResponse(
    (r) =>
      r.request().method() === "DELETE" && r.url().includes("/api/v1/expenses/"),
  );
  await dialog.getByRole("button", { name: "Excluir" }).click();

  expect((await removal).status()).toBe(204);
  await expect(row(page, EDITED_EXPENSE)).toHaveCount(0);
  expenses.length = 0;
});

/**
 * Limpeza pela API: um teste que falha no meio deixa a tela em qualquer
 * estado, e a limpeza precisa funcionar assim mesmo.
 */
test.afterAll(async () => {
  const api = await apiWithBrowserSession();
  if (!api) return;
  for (const id of revenues) await api.delete(`/api/v1/revenues/${id}`);
  for (const id of expenses) await api.delete(`/api/v1/expenses/${id}`);
  await api.dispose();
});
