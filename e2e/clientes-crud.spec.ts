import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

import { apiComSessaoDoNavegador, cpfValido, MARCA } from "./apiHelper";

/**
 * Cliente, ponta a ponta: cadastrar, editar e excluir pela tela.
 *
 * O cadastro em si já é exercitado em `cadastro-endereco-em-lote`, com foco no
 * lote de endereços. Aqui o foco é o **ciclo**: o registro criado pela tela é
 * encontrável, editável pela tela, e a exclusão o tira da lista de verdade —
 * não só da renderização.
 *
 * A diferença importa. "Sumiu da tabela" é fácil de conseguir por acidente: um
 * filtro que casou, uma lista otimista que removeu a linha sem esperar a
 * resposta. Por isso a exclusão é conferida recarregando e buscando de novo.
 */

test.describe.configure({ mode: "serial" });

const SELO = Date.now();
const NOME = `${MARCA} Ciclo ${SELO}`;
const NOME_EDITADO = `${NOME} (editado)`;

let api: APIRequestContext | null = null;
let clienteId = "";

const linha = (page: Page, texto: string) =>
  page.getByRole("row").filter({ hasText: texto });

async function buscar(page: Page, termo: string) {
  await page.goto("/clientes");
  await page.getByPlaceholder("Pesquisar beneficiário...").fill(termo);
}

async function abrirSecao(page: Page, titulo: string) {
  const cabecalho = page
    .getByRole("button", { name: titulo, exact: false })
    .first();
  if ((await cabecalho.getAttribute("aria-expanded")) === "false") {
    await cabecalho.click();
  }
}

async function escolher(page: Page, rotulo: string, opcao: string) {
  await page.getByLabel(rotulo).click();
  await page.getByRole("option", { name: opcao }).click();
}

async function preencherData(page: Page, rotulo: string, partes: string[]) {
  const segmentos = page
    .getByRole("group", { name: rotulo })
    .getByRole("spinbutton");
  for (let i = 0; i < partes.length; i++) {
    await segmentos.nth(i).click();
    await page.keyboard.type(partes[i]);
  }
}

test.beforeAll(async () => {
  api = await apiComSessaoDoNavegador();
});

test("cadastrar um cliente pela tela", async ({ page }) => {
  await page.goto("/clientes/novo");

  await abrirSecao(page, "Atendimento");
  await escolher(page, "Benefício pretendido", "Aposentadoria por idade");
  await escolher(page, "Situação", "Formulário preenchido");

  await abrirSecao(page, "Dados pessoais");
  await page.getByLabel("Nome completo").fill(NOME);
  await preencherData(page, "Data de nascimento", ["20", "05", "1970"]);
  await page.getByLabel("Nome da mãe").fill("Maria de Teste");
  await page.getByLabel("CPF").fill(cpfValido());
  await page.getByLabel("Celular").fill("(31) 99999-0000");
  await escolher(page, "Gênero", "Feminino");

  // Obrigatória no backend (@NotBlank em inssPassword) e mora em outra seção.
  // Sem ela o "Salvar cliente" fica desabilitado, e o teste morre esperando um
  // POST que nunca sai — culpando o botão.
  await abrirSecao(page, "Dados profissionais");
  await page.getByLabel("Senha do INSS (meu INSS)").fill("senha-inss-e2e");

  const criacao = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      /\/api\/v1\/clients$/.test(new URL(r.url()).pathname),
  );
  await page.getByRole("button", { name: "Salvar cliente" }).click();

  const resposta = await criacao;
  expect(resposta.status()).toBe(201);
  clienteId = (await resposta.json()).data.clientId;
  expect(clienteId, "o POST deveria devolver clientId").toBeTruthy();
});

test("o cliente cadastrado aparece na lista", async ({ page }) => {
  await buscar(page, NOME);
  await expect(linha(page, NOME).first()).toBeVisible();
});

test("editar o nome pela ficha", async ({ page }) => {
  await buscar(page, NOME);
  await linha(page, NOME)
    .first()
    .getByRole("button", { name: "Editar este cliente" })
    .click();

  const ficha = page.getByRole("dialog");
  await expect(ficha).toBeVisible();

  const campo = ficha.getByLabel("Nome completo");
  // Vem preenchido: ficha de edição que abre vazia e salva assim apaga o
  // cadastro sem avisar.
  await expect(campo).toHaveValue(NOME);
  await campo.fill(NOME_EDITADO);

  const edicao = page.waitForResponse(
    (r) =>
      ["PUT", "PATCH"].includes(r.request().method()) &&
      r.url().includes(`/api/v1/clients/${clienteId}`),
  );
  await ficha.getByRole("button", { name: /salvar/i }).first().click();

  expect((await edicao).ok()).toBe(true);

  // A confirmação é a lista, não o toast: recarregar e achar pelo nome novo
  // prova que gravou, e não que a tela desenhou o que foi digitado.
  await buscar(page, NOME_EDITADO);
  await expect(linha(page, NOME_EDITADO).first()).toBeVisible();
});

test("excluir pela lista, com confirmação que nomeia o cliente", async ({
  page,
}) => {
  await buscar(page, NOME_EDITADO);
  await linha(page, NOME_EDITADO)
    .first()
    .getByRole("button", { name: "Excluir este cliente" })
    .click();

  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByText(/excluir cliente\?/i)).toBeVisible();
  await expect(dialogo.getByText(NOME_EDITADO)).toBeVisible();

  const exclusao = page.waitForResponse(
    (r) =>
      r.request().method() === "DELETE" &&
      r.url().includes(`/api/v1/clients/${clienteId}`),
  );
  await dialogo.getByRole("button", { name: "Excluir", exact: true }).click();

  // 200 com envelope, não 204: o DELETE de cliente devolve corpo (é o único
  // do sistema que devolve). Fixar o número aqui faria o teste quebrar por um
  // detalhe de contrato que não é o que se está verificando.
  expect((await exclusao).ok()).toBe(true);

  // Buscar de novo, do zero. "Sumiu da tabela" também acontece por filtro que
  // casou ou por remoção otimista antes da resposta.
  //
  // A exclusão é lógica no banco e o registro fica para auditoria, mas isso
  // **não** tem superfície na interface — não existe tela de restaurar, então
  // não há o que afirmar depois daqui.
  await buscar(page, NOME_EDITADO);
  await expect(linha(page, NOME_EDITADO)).toHaveCount(0);
});

test.afterAll(async () => {
  if (!api) return;
  // Já excluído pela tela; o delete aqui cobre o caso de um teste ter falhado
  // antes de chegar lá.
  if (clienteId) await api.delete(`/api/v1/clients/${clienteId}`);
  await api.dispose();
});
