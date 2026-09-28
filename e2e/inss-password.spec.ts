import { test, expect, type APIRequestContext } from "@playwright/test";
import { apiComSessaoDoNavegador, cpfValido, MARCA } from "./apiHelper";

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

const SENHA = "senha-inss-e2e";
const NOME = `${MARCA} Senha INSS ${Date.now()}`;

let api: APIRequestContext | null = null;
let clienteId = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  api = await apiComSessaoDoNavegador();
  test.skip(!api, "sem NEXT_PUBLIC_API_URL ou sem sessão gravada pelo setup");

  const resposta = await api!.post("/api/v1/clients", {
    data: {
      fullName: NOME,
      birthDate: "1970-05-20",
      cpf: cpfValido(),
      motherName: "Maria de Teste",
      mobilePhone: "+5531999990000",
      inssPassword: SENHA,
      gender: "Feminino",
      benefit: "Aposentadoria por idade",
      situation: "Formulário preenchido",
    },
  });
  expect(resposta.status(), await resposta.text()).toBe(201);

  // `clientId`, e não `id`: o backend renomeou o id próprio do cliente
  // (commit `e142a83`). Ler `id` aqui devolvia `undefined` em silêncio — o
  // cliente era criado, os primeiros testes passavam (procuram pelo nome) e só
  // o que usa a API direto quebrava, apontando para o lugar errado.
  const criado = (await resposta.json()).data;
  clienteId = criado.clientId ?? criado.id;
  expect(clienteId, `resposta do POST sem id: ${JSON.stringify(criado)}`).toBeTruthy();
});

test.afterAll(async () => {
  if (api && clienteId) await api.delete(`/api/v1/clients/${clienteId}`);
  await api?.dispose();
});

/**
 * Expande uma seção do accordion — e só se estiver fechada.
 *
 * A ficha abre com as seções já abertas. Um `click` cego, que é o reflexo de
 * quem escreve o teste, FECHA a seção; e o conteúdo continua no DOM, deitado
 * atrás dos cabeçalhos seguintes, então o clique seguinte falha com
 * "intercepts pointer events" e manda procurar o defeito no CSS.
 */
async function expandir(trigger: import("@playwright/test").Locator) {
  await expect(trigger).toBeVisible();
  if ((await trigger.getAttribute("aria-expanded")) !== "true") {
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
  }
}

/** Abre a ficha e expande "Dados profissionais", onde o campo mora. */
async function abrirAbaProfissional(page: import("@playwright/test").Page) {
  await page.goto("/clientes");
  await page.getByPlaceholder("Pesquisar beneficiário").fill(NOME);
  // A busca é debounced: esperar a resposta evita clicar na linha de outro
  // cliente, que ainda está na tela enquanto a requisição não voltou.
  await page.waitForResponse(
    (r) => r.url().includes("searchTerm") && r.request().method() === "GET",
  );
  await page.getByRole("button", { name: "Visualizar este cliente" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expandir(page.getByRole("button", { name: /dados profissionais/i }));
  await expect(page.getByTestId("inss-password-field")).toBeVisible();
}

test("a ficha não pede a senha sozinha, e mostra mascarada", async ({ page }) => {
  // Esta é a regressão que importa: se a tela voltar a buscar a senha ao
  // montar, toda abertura de ficha vira uma linha de auditoria e a trilha
  // deixa de responder "quem foi buscar a senha da dona Maria?".
  const consultas: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/inss-password")) consultas.push(r.url());
  });

  await abrirAbaProfissional(page);

  expect(consultas, "a tela consultou a senha sem ninguém pedir").toEqual([]);
  const campo = page.getByTestId("inss-password-field").locator("input");
  await expect(campo).toHaveValue("••••••••");
  await expect(campo).not.toHaveValue(SENHA);
});

test("Revelar mostra a senha e a consulta vai para a auditoria", async ({ page }) => {
  await abrirAbaProfissional(page);

  const consulta = page.waitForResponse(
    (r) => r.url().includes("/inss-password") && r.request().method() === "GET",
  );
  await page.getByTestId("inss-password-toggle").click();

  expect((await consulta).status()).toBe(200);
  await expect(page.getByTestId("inss-password-field").locator("input")).toHaveValue(SENHA);

  // O aviso não é enfeite: sem ele, quem revelou não sabe que a senha some
  // sozinha nem que a consulta ficou registrada.
  await expect(page.getByText(/some sozinha/i)).toBeVisible();
  await expect(page.getByText(/registrada/i)).toBeVisible();
});

test("Esconder devolve a máscara sem nova consulta", async ({ page }) => {
  await abrirAbaProfissional(page);
  await page.getByTestId("inss-password-toggle").click();
  const campo = page.getByTestId("inss-password-field").locator("input");
  await expect(campo).toHaveValue(SENHA);

  const consultas: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/inss-password")) consultas.push(r.url());
  });

  await page.getByTestId("inss-password-toggle").click();
  await expect(campo).toHaveValue("••••••••");
  // Esconder é estado local. Se virasse ida ao servidor, cada clique no botão
  // somaria auditoria sem ninguém ter lido nada.
  expect(consultas).toEqual([]);
});

test("editar a ficha sem tocar na senha NÃO apaga a senha", async ({ page }) => {
  // O ponto mais frágil de toda a mudança. O formulário não recebe mais a
  // senha, então ele salva sem ela; se "ausente" significasse "apaga", trocar
  // o telefone de um cliente destruiria o acesso dele ao INSS — em silêncio,
  // e sem ninguém relacionar as duas coisas depois.
  await abrirAbaProfissional(page);

  await page.getByRole("button", { name: "Editar cadastro" }).click();
  await page.getByLabel("Nome completo").fill(`${NOME} editado`);

  const salvou = page.waitForResponse(
    (r) => r.url().includes(`/clients/${clienteId}`) && r.request().method() === "PUT",
  );
  await page.getByRole("button", { name: /salvar/i }).click();
  expect((await salvou).status()).toBe(200);

  // Conferência pela API: a tela poderia mostrar qualquer coisa; o que
  // interessa é o que ficou gravado.
  const depois = await api!.get(`/api/v1/clients/${clienteId}/inss-password`);
  expect(depois.status()).toBe(200);
  expect((await depois.json()).data.inssPassword).toBe(SENHA);
});

test("digitar uma senha nova troca a senha", async ({ page }) => {
  // O par do teste acima: se "em branco mantém" virasse "nunca muda", a senha
  // ficaria impossível de trocar pela tela e o teste anterior seguiria verde.
  const nova = "senha-inss-trocada";
  await abrirAbaProfissional(page);

  await page.getByRole("button", { name: "Editar cadastro" }).click();
  await page.getByLabel('Senha "meu inss"').fill(nova);

  const salvou = page.waitForResponse(
    (r) => r.url().includes(`/clients/${clienteId}`) && r.request().method() === "PUT",
  );
  await page.getByRole("button", { name: /salvar/i }).click();
  expect((await salvou).status()).toBe(200);

  const depois = await api!.get(`/api/v1/clients/${clienteId}/inss-password`);
  expect((await depois.json()).data.inssPassword).toBe(nova);
});
