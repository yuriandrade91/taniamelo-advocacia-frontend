import { test, expect, type APIRequestContext } from "@playwright/test";
import { apiWithBrowserSession, validCpf, TAG } from "./apiHelper";
import { inssPasswordInput, inssPasswordToggle } from "./helpers";

/**
 * A senha do "meu INSS" na ficha do cliente.
 *
 * Ela deixou de vir junto da ficha: voltava em toda abertura de
 * `GET /clients/{id}` e ia junto para log de acesso, cache de navegador e print
 * de tela de quem só queria conferir um telefone. Agora sai por rota própria,
 * restrita a advogado/admin, e cada leitura fica registrada.
 *
 * Vale como e2e, e não como teste de unidade, porque o que precisa ser provado
 * atravessa tudo: a tela não pede a senha sozinha, pede quando o usuário
 * manda, e salvar a ficha sem tocar no campo NÃO apaga a senha no banco. Essa
 * última é a que dói se estiver errada — e nenhuma camada isolada a enxerga.
 */

const PASSWORD = "senha-inss-e2e";
const NAME = `${TAG} Senha INSS ${Date.now()}`;

let api: APIRequestContext | null = null;
let clientId = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  api = await apiWithBrowserSession();
  test.skip(!api, "sem NEXT_PUBLIC_API_URL ou sem sessão gravada pelo setup");

  const response = await api!.post("/api/v1/clients", {
    data: {
      fullName: NAME,
      birthDate: "1970-05-20",
      cpf: validCpf(),
      motherName: "Maria de Teste",
      mobilePhone: "+5531999990000",
      inssPassword: PASSWORD,
      gender: "Feminino",
      benefit: "Aposentadoria por idade",
      situation: "Formulário preenchido",
    },
  });
  expect(response.status(), await response.text()).toBe(201);

  // `clientId`, e não `id`: o backend renomeou o id próprio do cliente
  // (commit `e142a83`). Ler `id` aqui devolvia `undefined` em silêncio — o
  // cliente era criado, os primeiros testes passavam (procuram pelo nome) e só
  // o que usa a API direto quebrava, apontando para o lugar errado.
  const created = (await response.json()).data;
  clientId = created.clientId ?? created.id;
  expect(clientId, `resposta do POST sem id: ${JSON.stringify(created)}`).toBeTruthy();
});

test.afterAll(async () => {
  if (api && clientId) await api.delete(`/api/v1/clients/${clientId}`);
  await api?.dispose();
});

/** Abre a ficha deste cliente. As seções aparecem todas; nada a expandir. */
async function openSheet(page: import("@playwright/test").Page) {
  await page.goto("/clientes");
  await page.getByPlaceholder("Pesquisar beneficiário").fill(NAME);
  // A busca é debounced: esperar a resposta evita clicar na linha de outro
  // cliente, que ainda está na tela enquanto a requisição não voltou.
  await page.waitForResponse(
    (r) => r.url().includes("searchTerm") && r.request().method() === "GET",
  );
  await page.getByRole("button", { name: "Visualizar este cliente" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(inssPasswordInput(page)).toBeVisible();
}

test("a ficha não pede a senha sozinha, e mostra mascarada", async ({ page }) => {
  // Esta é a regressão que importa: se a tela voltar a buscar a senha ao
  // montar, toda abertura de ficha vira uma linha de auditoria e a trilha
  // deixa de responder "quem foi buscar a senha da dona Maria?".
  const queries: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/inss-password")) queries.push(r.url());
  });

  await openSheet(page);

  expect(queries, "a tela consultou a senha sem ninguém pedir").toEqual([]);
  const field = inssPasswordInput(page);
  await expect(field).toHaveValue("••••••••");
  await expect(field).not.toHaveValue(PASSWORD);
});

test("Revelar mostra a senha e a consulta vai para a auditoria", async ({ page }) => {
  await openSheet(page);

  const query = page.waitForResponse(
    (r) => r.url().includes("/inss-password") && r.request().method() === "GET",
  );
  await inssPasswordToggle(page).click();

  expect((await query).status()).toBe(200);
  await expect(inssPasswordInput(page)).toHaveValue(PASSWORD);

  // O aviso não é enfeite: sem ele, quem revelou não sabe que a senha some
  // sozinha nem que a consulta ficou registrada.
  await expect(page.getByText(/some sozinha/i)).toBeVisible();
  await expect(page.getByText(/registrada/i)).toBeVisible();
});

test("revelada, dá para copiar e a contagem anda", async ({ page }) => {
  await openSheet(page);
  await inssPasswordToggle(page).click();
  await expect(inssPasswordInput(page)).toHaveValue(PASSWORD);

  // O copiar só existe com a senha à vista: copiar atrás da máscara poria no
  // clipboard um valor que ninguém conferiu. A permissão é explícita — sem
  // ela o Chromium recusa a escrita e o componente mostraria o aviso de falha,
  // que é um caminho diferente do que este teste cobre.
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copiar senha" }).click();
  await expect(page.getByText("Senha copiada.")).toBeVisible();

  // A contagem anda sozinha. Ler dois números diferentes prova o relógio; o
  // teste não espera os 20s inteiros, que seriam 20s em toda execução.
  const notice = page.getByText(/Some sozinha em/i);
  const first = await notice.textContent();
  await expect
    .poll(async () => (await notice.textContent()) !== first, { timeout: 5_000 })
    .toBe(true);
});

test("Esconder devolve a máscara sem nova consulta", async ({ page }) => {
  await openSheet(page);
  await inssPasswordToggle(page).click();
  const field = inssPasswordInput(page);
  await expect(field).toHaveValue(PASSWORD);

  const queries: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/inss-password")) queries.push(r.url());
  });

  await inssPasswordToggle(page).click();
  await expect(field).toHaveValue("••••••••");
  // Esconder é estado local. Se virasse ida ao servidor, cada clique no botão
  // somaria auditoria sem ninguém ter lido nada.
  expect(queries).toEqual([]);
});

test("editar a ficha sem tocar na senha NÃO apaga a senha", async ({ page }) => {
  // O ponto mais frágil de toda a mudança. O formulário não recebe mais a
  // senha, então ele salva sem ela; se "ausente" significasse "apaga", trocar
  // o telefone de um cliente destruiria o acesso dele ao INSS — em silêncio,
  // e sem ninguém relacionar as duas coisas depois.
  await openSheet(page);

  await page.getByRole("button", { name: "Editar cadastro" }).click();
  await page.getByLabel("Nome completo").fill(`${NAME} editado`);

  const saved = page.waitForResponse(
    (r) => r.url().includes(`/clients/${clientId}`) && r.request().method() === "PUT",
  );
  await page.getByRole("button", { name: /salvar/i }).click();
  expect((await saved).status()).toBe(200);

  // Conferência pela API: a tela poderia mostrar qualquer coisa; o que
  // interessa é o que ficou gravado.
  const after = await api!.get(`/api/v1/clients/${clientId}/inss-password`);
  expect(after.status()).toBe(200);
  expect((await after.json()).data.inssPassword).toBe(PASSWORD);
});

test("digitar uma senha nova troca a senha", async ({ page }) => {
  // O par do teste acima: se "em branco mantém" virasse "nunca muda", a senha
  // ficaria impossível de trocar pela tela e o teste anterior seguiria verde.
  const newValue = "senha-inss-trocada";
  await openSheet(page);

  await page.getByRole("button", { name: "Editar cadastro" }).click();
  await page.getByLabel('Senha "meu inss"').fill(newValue);

  const saved = page.waitForResponse(
    (r) => r.url().includes(`/clients/${clientId}`) && r.request().method() === "PUT",
  );
  await page.getByRole("button", { name: /salvar/i }).click();
  expect((await saved).status()).toBe(200);

  const after = await api!.get(`/api/v1/clients/${clientId}/inss-password`);
  expect((await after.json()).data.inssPassword).toBe(newValue);
});
