import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

import { apiComSessaoDoNavegador, cpfValido, MARCA } from "./apiHelper";

/**
 * Parcelas a receber, ponta a ponta: lançar, editar, confirmar o crédito e
 * excluir.
 *
 * O cliente é criado **pela API**, não pela tela. Fazer o cadastro completo
 * aqui tornaria este arquivo refém do formulário de cliente — um defeito lá
 * derrubaria o teste de pagamento, que não tem nada a ver com cadastro. O
 * cadastro de cliente tem spec própria.
 *
 * O que este arquivo trava, e que só aparece ponta a ponta: a lista mora em
 * `/api/v1/payments` (consolidada) e a escrita em
 * `/api/v1/clients/{id}/payments` (por cliente). São rotas diferentes sobre a
 * mesma tabela, e é fácil uma tela ficar lendo de uma e gravando na outra sem
 * que nada acuse.
 */

test.describe.configure({ mode: "serial" });

const SELO = Date.now();
const CLIENTE = `${MARCA} Pagador ${SELO}`;
const PARCELA = `${MARCA} atrasados ${SELO}`;
const PARCELA_EDITADA = `${PARCELA} (corrigido)`;

let api: APIRequestContext | null = null;
let clienteId = "";
let parcelaId = "";

/** Dia 10 do mês corrente — a tela abre no mês atual e filtra por vencimento. */
function vencimentoDesteMes(): string[] {
  const agora = new Date();
  return [
    "10",
    String(agora.getMonth() + 1).padStart(2, "0"),
    String(agora.getFullYear()),
  ];
}

async function preencherData(
  page: Page,
  escopo: ReturnType<Page["getByRole"]>,
  rotulo: string,
  partes: string[],
) {
  const segmentos = escopo
    .getByRole("group", { name: rotulo })
    .getByRole("spinbutton");
  for (let i = 0; i < partes.length; i++) {
    await segmentos.nth(i).click();
    await page.keyboard.type(partes[i]);
  }
}

const linha = (page: Page) =>
  page.getByRole("row").filter({ hasText: PARCELA_EDITADA }).or(
    page.getByRole("row").filter({ hasText: PARCELA }),
  );

test.beforeAll(async () => {
  api = await apiComSessaoDoNavegador();
  test.skip(!api, "sem NEXT_PUBLIC_API_URL ou sessão gravada");

  const criado = await api!.post("/api/v1/clients", {
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
  expect(
    criado.status(),
    `não deu para preparar o cliente: ${await criado.text()}`,
  ).toBe(201);
  clienteId = (await criado.json()).data.clientId;
});

test("lançar uma parcela a receber", async ({ page }) => {
  await page.goto("/pagamentos");
  await page.getByRole("button", { name: "Lançar valor a receber" }).click();

  const modal = page.getByRole("dialog", { name: /lançar valor a receber/i });
  await expect(modal).toBeVisible();

  // O ComboBox aceita texto livre, mas o vínculo só existe se a opção for
  // escolhida da lista: nome solto não vira clientId e o POST iria para
  // /clients/undefined/payments.
  await modal.getByPlaceholder("Nome da pessoa").fill(CLIENTE);
  await page.getByRole("option", { name: CLIENTE }).click();

  await modal.getByLabel("Descrição").fill(PARCELA);
  await modal.getByLabel("Valor").fill("4.200,00");
  await preencherData(page, modal, "Previsão de crédito", vencimentoDesteMes());

  const criacao = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      /\/clients\/[^/]+\/payments$/.test(new URL(r.url()).pathname),
  );
  await modal.getByRole("button", { name: "Lançar", exact: true }).click();

  const resposta = await criacao;
  expect(resposta.status()).toBe(201);
  parcelaId = (await resposta.json()).data.id;

  // Escreveu por cliente e a lista consolidada enxerga: é a costura entre as
  // duas rotas, e é o que nenhum teste unitário alcança.
  await expect(modal).toBeHidden();
  await expect(linha(page)).toBeVisible();
});

test("editar a parcela manda só o que mudou", async ({ page }) => {
  await page.goto("/pagamentos");
  await linha(page).getByRole("button", { name: "Editar parcela" }).click();

  const modal = page.getByRole("dialog", { name: /editar parcela/i });
  await expect(modal.getByLabel("Descrição")).toHaveValue(PARCELA);

  await modal.getByLabel("Descrição").fill(PARCELA_EDITADA);

  const edicao = page.waitForRequest(
    (r) => r.method() === "PATCH" && r.url().includes("/payments/"),
  );
  await modal.getByRole("button", { name: "Salvar" }).click();

  // PATCH parcial de verdade: mandar o registro inteiro funcionaria e encheria
  // a auditoria de "alterou" em campo que ninguém tocou.
  const corpo = JSON.parse((await edicao).postData() ?? "{}");
  expect(Object.keys(corpo)).toEqual(["description"]);
  expect(corpo.description).toBe(PARCELA_EDITADA);

  await expect(modal).toBeHidden();
  await expect(linha(page)).toBeVisible();
});

test("salvar sem mudar nada não manda requisição", async ({ page }) => {
  await page.goto("/pagamentos");
  await linha(page).getByRole("button", { name: "Editar parcela" }).click();

  const modal = page.getByRole("dialog", { name: /editar parcela/i });

  const requisicoes: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "PATCH") requisicoes.push(r.url());
  });

  await modal.getByRole("button", { name: "Salvar" }).click();

  await expect(modal).toBeHidden();
  // Sucesso sem mudança ensina a clicar em "Salvar" por reflexo só para
  // conferir se salvou — e o PATCH à toa polui a trilha.
  expect(requisicoes).toHaveLength(0);
  await expect(page.getByText(/nada foi alterado/i)).toBeVisible();
});

test("confirmar o crédito marca a parcela como recebida", async ({ page }) => {
  await page.goto("/pagamentos");
  await linha(page)
    .getByRole("button", { name: "Registrar recebimento" })
    .click();

  const modal = page.getByRole("dialog", { name: /confirmar crédito/i });
  await preencherData(page, modal, "Data do crédito", vencimentoDesteMes());

  const confirmacao = page.waitForResponse(
    (r) => r.request().method() === "PATCH" && r.url().includes("/payments/"),
  );
  await modal.getByRole("button", { name: "Confirmar", exact: true }).click();

  const resposta = await confirmacao;
  expect(resposta.status()).toBe(200);
  expect((await resposta.json()).data.status).toBe("Pago");

  await expect(modal).toBeHidden();
  // Recebida não oferece mais "registrar recebimento": oferecê-lo convidaria a
  // sobrescrever a data que está certa — e o caixa do mês é somado por ela.
  await expect(
    linha(page).getByRole("button", { name: "Registrar recebimento" }),
  ).toHaveCount(0);
  // Editar continua: é lá que se corrige data errada.
  await expect(
    linha(page).getByRole("button", { name: "Editar parcela" }),
  ).toBeVisible();
});

test("excluir a parcela tira a linha da lista", async ({ page }) => {
  await page.goto("/pagamentos");
  await linha(page).getByRole("button", { name: "Excluir parcela" }).click();

  const dialogo = page.getByRole("dialog", { name: /excluir parcela/i });
  await expect(dialogo.getByText(CLIENTE)).toBeVisible();

  const exclusao = page.waitForResponse(
    (r) => r.request().method() === "DELETE" && r.url().includes("/payments/"),
  );
  await dialogo.getByRole("button", { name: "Excluir" }).click();

  expect((await exclusao).status()).toBe(204);
  await expect(linha(page)).toHaveCount(0);
  parcelaId = "";
});

test.afterAll(async () => {
  if (!api) return;
  if (parcelaId && clienteId) {
    await api.delete(`/api/v1/clients/${clienteId}/payments/${parcelaId}`);
  }
  if (clienteId) await api.delete(`/api/v1/clients/${clienteId}`);
  await api.dispose();
});
