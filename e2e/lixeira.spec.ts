import { test, expect, type APIRequestContext } from "@playwright/test";

import { apiComSessaoDoNavegador, cpfValido, MARCA } from "./apiHelper";

/**
 * A lixeira: o que foi excluído aparece, e restaurar traz de volta.
 *
 * Vale como e2e porque a afirmação atravessa três coisas que só existem
 * juntas: a exclusão lógica no backend, a rota `/deleted` que só lista o que
 * tem `deletedAt`, e o `PATCH /restore` — que antes desta tela era
 * **inalcançável**, porque chamá-la exigia o UUID e ninguém anota UUID antes
 * de excluir.
 *
 * A prova de que restaurou não é o toast: é o cliente voltar a aparecer na
 * lista normal, que é filtrada por `@SQLRestriction("deleted_at IS NULL")`.
 */

test.describe.configure({ mode: "serial" });

const SELO = Date.now();
const CLIENTE = `${MARCA} Restaurável ${SELO}`;
const COMPROMISSO = `${MARCA} compromisso lixeira ${SELO}`;

let api: APIRequestContext | null = null;
let clienteId = "";
let compromissoId = "";

/**
 * A linha cujo **registro** é este texto.
 *
 * Não `hasText`: o compromisso criado para o teste tem o nome do cliente na
 * coluna de identificação, então procurar o nome do cliente no texto da linha
 * casa com as duas e o teste morre por ambiguidade — apontando para o clique,
 * não para a causa. A coluna "Registro" é o cabeçalho da linha; filtrar por
 * ela é o que descreve a intenção.
 */
const linha = (page: import("@playwright/test").Page, texto: string) =>
  page
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: texto, exact: true }) });

/**
 * A linha na lista de clientes.
 *
 * Localizador próprio porque a tabela é outra: lá o cabeçalho de linha não é o
 * nome, e reaproveitar o da lixeira faria a asserção falhar com "elemento não
 * encontrado" — que manda procurar o problema na restauração, e não no
 * localizador.
 */
const linhaDeCliente = (page: import("@playwright/test").Page, texto: string) =>
  page.getByRole("row").filter({ hasText: texto });

test.beforeAll(async () => {
  api = await apiComSessaoDoNavegador();
  test.skip(!api, "sem NEXT_PUBLIC_API_URL ou sessão gravada");

  const cliente = await api!.post("/api/v1/clients", {
    // Os nomes são os do `ClientCreateRequestDTO`, não os da tela: `mobilePhone`
    // (não `cellPhone`) e `benefit` (não `benefitType`). Errar aqui devolve
    // 400 "Campo obrigatório" para um campo que o teste acha que mandou.
    data: {
      fullName: CLIENTE,
      cpf: cpfValido(),
      motherName: "Maria de Teste",
      birthDate: "1970-05-20",
      gender: "Feminino",
      mobilePhone: "(31) 99999-0000",
      inssPassword: "senha-inss-e2e",
      benefit: "Aposentadoria por idade",
      situation: "Formulário preenchido",
    },
  });
  expect(cliente.status(), await cliente.text()).toBe(201);
  clienteId = (await cliente.json()).data.clientId;

  const inicio = new Date();
  inicio.setFullYear(inicio.getFullYear() + 1);
  const fim = new Date(inicio.getTime() + 60 * 60 * 1000);

  const compromisso = await api!.post("/api/v1/appointments", {
    data: {
      title: COMPROMISSO,
      type: "Entrevista",
      // Instant no backend: precisa do "Z". Cortar em 19 caracteres tira
      // justamente o fuso e devolve 400 "could not be parsed at index 19".
      startAt: inicio.toISOString(),
      endAt: fim.toISOString(),
      clientId: clienteId,
    },
  });
  expect(compromisso.status(), await compromisso.text()).toBe(201);
  compromissoId = (await compromisso.json()).data.id;

  // A exclusão é pela API de propósito: o que se testa aqui é a lixeira, e
  // fazer o delete pela tela tornaria este arquivo refém de duas outras.
  // `ok()`, e não um código exato: compromisso responde 204 e cliente responde
  // 200 com envelope. O que a preparação precisa saber é que excluiu.
  expect((await api!.delete(`/api/v1/appointments/${compromissoId}`)).ok()).toBe(true);
  expect((await api!.delete(`/api/v1/clients/${clienteId}`)).ok()).toBe(true);
});

test("os dois recursos aparecem na mesma lista", async ({ page }) => {
  await page.goto("/lixeira");

  await expect(linha(page, CLIENTE)).toBeVisible();
  await expect(linha(page, COMPROMISSO)).toBeVisible();

  // O tipo é visível na linha: sem ele, duas colunas de texto não dizem se
  // "Perícia" é um cliente ou um compromisso.
  // `exact`: o tooltip do botão de restaurar também contém a palavra
  // ("Restaurar compromisso"), e sem isso a asserção casa duas vezes.
  await expect(
    linha(page, CLIENTE).getByText("Cliente", { exact: true }),
  ).toBeVisible();
  await expect(
    linha(page, COMPROMISSO).getByText("Compromisso", { exact: true }),
  ).toBeVisible();
});

test("o cliente excluído sumiu da lista normal", async ({ page }) => {
  // A contraprova. Sem ela, "aparece na lixeira" não prova exclusão: provaria
  // só que a rota /deleted devolve alguma coisa.
  await page.goto("/clientes");
  await page.getByPlaceholder("Pesquisar beneficiário...").fill(CLIENTE);
  await expect(linhaDeCliente(page, CLIENTE)).toHaveCount(0);
});

test("restaurar o cliente o devolve à lista", async ({ page }) => {
  await page.goto("/lixeira");
  await linha(page, CLIENTE)
    .getByRole("button", { name: "Restaurar cliente" })
    .click();

  const dialogo = page.getByRole("dialog", { name: /restaurar cliente/i });
  // O diálogo nomeia o registro: confirmar sem saber de quê é como se restaura
  // o errado com toda a confiança.
  await expect(dialogo.getByText(CLIENTE)).toBeVisible();

  const restauracao = page.waitForResponse(
    (r) => r.request().method() === "PATCH" && r.url().includes("/restore"),
  );
  await dialogo.getByRole("button", { name: "Restaurar" }).click();

  expect((await restauracao).status()).toBe(200);
  await expect(linha(page, CLIENTE)).toHaveCount(0);

  // A prova de verdade: voltou para a lista filtrada por deleted_at IS NULL.
  await page.goto("/clientes");
  await page.getByPlaceholder("Pesquisar beneficiário...").fill(CLIENTE);
  await expect(linhaDeCliente(page, CLIENTE).first()).toBeVisible();
});

test("restaurar o compromisso também", async ({ page }) => {
  await page.goto("/lixeira");
  await linha(page, COMPROMISSO)
    .getByRole("button", { name: "Restaurar compromisso" })
    .click();

  const dialogo = page.getByRole("dialog", { name: /restaurar compromisso/i });
  const restauracao = page.waitForResponse(
    (r) => r.request().method() === "PATCH" && r.url().includes("/restore"),
  );
  await dialogo.getByRole("button", { name: "Restaurar" }).click();

  expect((await restauracao).status()).toBe(200);
  await expect(linha(page, COMPROMISSO)).toHaveCount(0);
});

test.afterAll(async () => {
  if (!api) return;
  // Restaurados no meio do caminho: excluir de novo para não deixar resíduo.
  if (compromissoId) await api.delete(`/api/v1/appointments/${compromissoId}`);
  if (clienteId) await api.delete(`/api/v1/clients/${clienteId}`);
  await api.dispose();
});
