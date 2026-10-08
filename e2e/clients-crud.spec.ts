import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

import { apiWithBrowserSession, validCpf, TAG } from "./apiHelper";

/**
 * Cliente, ponta a ponta: cadastrar, editar e excluir pela tela.
 *
 * O cadastro em si já é exercitado em `cadastro-endereco-em-lote`, com foco no
 * lote de endereços. Aqui o foco é o **ciclo**: o registro criado pela tela é
 * encontrável, editável pela tela, e a exclusão o tira da lista de verdade —
 * não só da renderização.
 *
 * A diferença importa. "Sumiu da lista" é fácil de conseguir por acidente: um
 * filtro que casou, uma lista otimista que removeu a linha sem esperar a
 * resposta. Por isso a exclusão é conferida recarregando e buscando de novo.
 */

test.describe.configure({ mode: "serial" });

const STAMP = Date.now();
const NAME = `${TAG} Ciclo ${STAMP}`;
const EDITED_NAME = `${NAME} (editado)`;

let api: APIRequestContext | null = null;
let clientId = "";

const row = (page: Page, text: string) =>
  page.getByRole("list", { name: "Clientes" }).getByRole("listitem").filter({ hasText: text });

async function search(page: Page, termo: string) {
  await page.goto("/clientes");
  await page.getByRole("searchbox", { name: "Pesquisar beneficiário" }).fill(termo);
}

/**
 * O cadastro é em abas: só a aba ativa está montada. O nome acessível da aba
 * é "Título (estado)" — daí o `^`, que não deixa "Endereço" casar com outra
 * coisa. Clicar na aba já ativa não muda nada.
 */
async function openSection(page: Page, titulo: string) {
  await page.getByRole("tab", { name: new RegExp(`^${titulo} \\(`) }).click();
}

async function choose(page: Page, rotulo: string, opcao: string) {
  await page.getByLabel(rotulo).click();
  await page.getByRole("option", { name: opcao }).click();
}

async function fillDate(page: Page, rotulo: string, partes: string[]) {
  const segments = page
    .getByRole("group", { name: rotulo })
    .getByRole("spinbutton");
  for (let i = 0; i < partes.length; i++) {
    await segments.nth(i).click();
    await page.keyboard.type(partes[i]);
  }
}

test.beforeAll(async () => {
  api = await apiWithBrowserSession();
});

test("cadastrar um cliente pela tela", async ({ page }) => {
  await page.goto("/clientes/novo");

  await openSection(page, "Atendimento");
  await choose(page, "Benefício pretendido", "Aposentadoria por idade");
  await choose(page, "Situação", "Formulário preenchido");

  await openSection(page, "Dados pessoais");
  await page.getByLabel("Nome completo").fill(NAME);
  await fillDate(page, "Data de nascimento", ["20", "05", "1970"]);
  await page.getByLabel("Nome da mãe").fill("Maria de Teste");
  await page.getByLabel("CPF").fill(validCpf());
  await page.getByLabel("Celular").fill("(31) 99999-0000");
  await choose(page, "Gênero", "Feminino");

  // Obrigatória no backend (@NotBlank em inssPassword) e mora em outra seção.
  // Sem ela o "Salvar cliente" fica desabilitado, e o teste morre esperando um
  // POST que nunca sai — culpando o botão.
  await openSection(page, "Dados profissionais");
  await page.getByLabel("Senha do INSS (meu INSS)").fill("senha-inss-e2e");

  const creation = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      /\/api\/v1\/clients$/.test(new URL(r.url()).pathname),
  );
  await page.getByRole("button", { name: "Salvar cliente" }).click();

  const response = await creation;
  expect(response.status()).toBe(201);
  clientId = (await response.json()).data.clientId;
  expect(clientId, "o POST deveria devolver clientId").toBeTruthy();
});

test("o cliente cadastrado aparece na lista", async ({ page }) => {
  await search(page, NAME);
  await expect(row(page, NAME).first()).toBeVisible();
});

test("editar o nome pela ficha", async ({ page }) => {
  await search(page, NAME);
  await row(page, NAME)
    .first()
    .getByRole("button", { name: "Editar este cliente" })
    .click();

  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();

  const field = sheet.getByLabel("Nome completo");
  // Vem preenchido: ficha de edição que abre vazia e salva assim apaga o
  // cadastro sem avisar.
  await expect(field).toHaveValue(NAME);
  await field.fill(EDITED_NAME);

  const edit = page.waitForResponse(
    (r) =>
      ["PUT", "PATCH"].includes(r.request().method()) &&
      r.url().includes(`/api/v1/clients/${clientId}`),
  );
  await sheet.getByRole("button", { name: /salvar/i }).first().click();

  expect((await edit).ok()).toBe(true);

  // A confirmação é a lista, não o toast: recarregar e achar pelo nome novo
  // prova que gravou, e não que a tela desenhou o que foi digitado.
  await search(page, EDITED_NAME);
  await expect(row(page, EDITED_NAME).first()).toBeVisible();
});

test("excluir pela lista, com confirmação que nomeia o cliente", async ({
  page,
}) => {
  await search(page, EDITED_NAME);
  await row(page, EDITED_NAME)
    .first()
    .getByRole("button", { name: "Excluir este cliente" })
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/excluir cliente\?/i)).toBeVisible();
  await expect(dialog.getByText(EDITED_NAME)).toBeVisible();

  const removal = page.waitForResponse(
    (r) =>
      r.request().method() === "DELETE" &&
      r.url().includes(`/api/v1/clients/${clientId}`),
  );
  await dialog.getByRole("button", { name: "Excluir", exact: true }).click();

  // 200 com envelope, não 204: o DELETE de cliente devolve corpo (é o único
  // do sistema que devolve). Fixar o número aqui faria o teste quebrar por um
  // detalhe de contrato que não é o que se está verificando.
  expect((await removal).ok()).toBe(true);

  // Buscar de novo, do zero. "Sumiu da lista" também acontece por filtro que
  // casou ou por remoção otimista antes da resposta.
  //
  // A exclusão é lógica no banco e o registro fica para auditoria, mas isso
  // **não** tem superfície na interface — não existe tela de restaurar, então
  // não há o que afirmar depois daqui.
  await search(page, EDITED_NAME);
  await expect(row(page, EDITED_NAME)).toHaveCount(0);
});

test.afterAll(async () => {
  if (!api) return;
  // Já excluído pela tela; o delete aqui cobre o caso de um teste ter falhado
  // antes de chegar lá.
  if (clientId) await api.delete(`/api/v1/clients/${clientId}`);
  await api.dispose();
});
