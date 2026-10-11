import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

import { apiWithBrowserSession, validCpf, TAG, integrationPaused } from "./apiHelper";
import { dueThisMonth, fillDateSegments, paidThisMonth } from "./helpers";

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
/** Sem a rota consolidada de pagamentos neste ambiente, não há fluxo para exercitar. */
test.skip(integrationPaused("payments"), "rota de Pagamentos em pausa neste ambiente");

const STAMP = Date.now();
const CLIENT = `${TAG} Pagador ${STAMP}`;
const INSTALLMENT = `${TAG} atrasados ${STAMP}`;
const EDITED_INSTALLMENT = `${INSTALLMENT} (corrigido)`;

let api: APIRequestContext | null = null;
let clientId = "";
let installmentId = "";




/** O cartão da parcela (a grade é uma lista de cartões). */
const row = (page: Page) => page.getByRole("listitem").filter({ hasText: INSTALLMENT }).first();

/** Abre Pagamentos já buscando a parcela deste teste: a grade pagina de 12 em 12. */
async function openPayments(page: Page) {
  await page.goto("/pagamentos");
  await page.getByRole("searchbox", { name: "Pesquisar recebimento" }).fill(String(STAMP));
}

test.beforeAll(async () => {
  api = await apiWithBrowserSession();
  test.skip(!api, "sem NEXT_PUBLIC_API_URL ou sessão gravada");

  const created = await api!.post("/api/v1/clients", {
    // Os nomes são os do `ClientCreateRequestDTO`, não os da tela: `mobilePhone`
    // (não `cellPhone`) e `benefit` (não `benefitType`). Errar aqui devolve
    // 400 "Campo obrigatório" para um campo que o teste acha que mandou.
    data: {
      fullName: CLIENT,
      cpf: validCpf(),
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
    created.status(),
    `não deu para preparar o cliente: ${await created.text()}`,
  ).toBe(201);
  clientId = (await created.json()).data.clientId;
});

test("lançar uma parcela a receber", async ({ page }) => {
  await page.goto("/pagamentos");
  await page.getByRole("button", { name: "Lançar valor a receber" }).click();

  const modal = page.getByRole("dialog", { name: /lançar valor a receber/i });
  await expect(modal).toBeVisible();

  // O ComboBox aceita texto livre, mas o vínculo só existe se a opção for
  // escolhida da lista: nome solto não vira clientId e o POST iria para
  // /clients/undefined/payments.
  await modal.getByPlaceholder("Nome da pessoa").fill(CLIENT);
  await page.getByRole("option", { name: CLIENT }).click();

  await modal.getByLabel("Descrição").fill(INSTALLMENT);
  await modal.getByLabel("Valor").fill("4.200,00");
  await fillDateSegments(modal, "Previsão de crédito", dueThisMonth());

  const creation = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      /\/clients\/[^/]+\/payments$/.test(new URL(r.url()).pathname),
  );
  await modal.getByRole("button", { name: "Lançar", exact: true }).click();

  const response = await creation;
  expect(response.status()).toBe(201);
  installmentId = (await response.json()).data.id;

  // Escreveu por cliente e a lista consolidada enxerga: é a costura entre as
  // duas rotas, e é o que nenhum teste unitário alcança.
  await expect(modal).toBeHidden();
  await page.getByRole("searchbox", { name: "Pesquisar recebimento" }).fill(String(STAMP));
  await expect(row(page)).toBeVisible();
});

test("editar a parcela manda só o que mudou", async ({ page }) => {
  await openPayments(page);
  await row(page).getByRole("button", { name: "Editar parcela" }).click();

  const modal = page.getByRole("dialog", { name: /editar parcela/i });
  await expect(modal.getByLabel("Descrição")).toHaveValue(INSTALLMENT);

  await modal.getByLabel("Descrição").fill(EDITED_INSTALLMENT);

  const edit = page.waitForRequest(
    (r) => r.method() === "PATCH" && r.url().includes("/payments/"),
  );
  await modal.getByRole("button", { name: "Salvar" }).click();

  // PATCH parcial de verdade: mandar o registro inteiro funcionaria e encheria
  // a auditoria de "alterou" em campo que ninguém tocou.
  const body = JSON.parse((await edit).postData() ?? "{}");
  expect(Object.keys(body)).toEqual(["description"]);
  expect(body.description).toBe(EDITED_INSTALLMENT);

  await expect(modal).toBeHidden();
  await expect(row(page)).toBeVisible();
});

test("salvar sem mudar nada não manda requisição", async ({ page }) => {
  await openPayments(page);
  await row(page).getByRole("button", { name: "Editar parcela" }).click();

  const modal = page.getByRole("dialog", { name: /editar parcela/i });

  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "PATCH") requests.push(r.url());
  });

  await modal.getByRole("button", { name: "Salvar" }).click();

  await expect(modal).toBeHidden();
  // Sucesso sem mudança ensina a clicar em "Salvar" por reflexo só para
  // conferir se salvou — e o PATCH à toa polui a trilha.
  expect(requests).toHaveLength(0);
  await expect(page.getByText(/nada foi alterado/i)).toBeVisible();
});

test("confirmar o crédito marca a parcela como recebida", async ({ page }) => {
  await openPayments(page);
  await row(page)
    .getByRole("button", { name: "Registrar recebimento" })
    .click();

  const modal = page.getByRole("dialog", { name: /confirmar crédito/i });
  await fillDateSegments(modal, "Data do crédito", paidThisMonth());

  const confirmation = page.waitForResponse(
    (r) => r.request().method() === "PATCH" && r.url().includes("/payments/"),
  );
  await modal.getByRole("button", { name: "Confirmar", exact: true }).click();

  const response = await confirmation;
  expect(response.status()).toBe(200);
  expect((await response.json()).data.status).toBe("Pago");

  await expect(modal).toBeHidden();
  // Recebida não oferece mais "registrar recebimento": oferecê-lo convidaria a
  // sobrescrever a data que está certa — e o caixa do mês é somado por ela.
  await expect(
    row(page).getByRole("button", { name: "Registrar recebimento" }),
  ).toHaveCount(0);
  // Editar continua: é lá que se corrige data errada.
  await expect(
    row(page).getByRole("button", { name: "Editar parcela" }),
  ).toBeVisible();
});

test("excluir a parcela tira a linha da lista", async ({ page }) => {
  await openPayments(page);
  await row(page).getByRole("button", { name: "Excluir parcela" }).click();

  const dialog = page.getByRole("dialog", { name: /excluir parcela/i });
  await expect(dialog.getByText(CLIENT)).toBeVisible();

  const removal = page.waitForResponse(
    (r) => r.request().method() === "DELETE" && r.url().includes("/payments/"),
  );
  await dialog.getByRole("button", { name: "Excluir" }).click();

  expect((await removal).status()).toBe(204);
  await expect(row(page)).toHaveCount(0);
  installmentId = "";
});

test.afterAll(async () => {
  if (!api) return;
  if (installmentId && clientId) {
    await api.delete(`/api/v1/clients/${clientId}/payments/${installmentId}`);
  }
  if (clientId) await api.delete(`/api/v1/clients/${clientId}`);
  await api.dispose();
});
