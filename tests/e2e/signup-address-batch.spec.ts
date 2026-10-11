import { test, expect, type Page } from "@playwright/test";

import { TAG, apiWithBrowserSession, validCpf } from "./apiHelper";
import { choose, fillDateSegments, openSection } from "./helpers";

/**
 * O cadastro grava os endereços numa requisição só.
 *
 * Antes era um POST por aba preenchida, cada um com transação própria: o
 * segundo falhando deixava o primeiro gravado e a ficha pela metade, sem nada
 * na tela explicando por que só um sobreviveu. `/addresses/batch` grava a lista
 * inteira em uma transação — ou entram todos, ou nenhum.
 *
 * Isto só se verifica com tudo ligado. O teste de unidade prova que o serviço
 * monta o corpo certo; que a TELA chama o serviço certo, com os endereços que
 * a pessoa digitou, é o que se prova aqui — contando as requisições que saem
 * do navegador.
 */

const name = `${TAG} Lote ${Date.now().toString(36)}`;




/**
 * Campos por papel (`textbox`), e não por `getByLabel`.
 *
 * O HeroUI renderiza um `<select>` nativo escondido junto de cada combo, e o
 * rótulo acessível dele é a concatenação de todas as opções — "Cidade" casa
 * com o texto do combo de benefício e o teste morre por ambiguidade, numa
 * mensagem que não parece ter nada a ver com endereço.
 */
async function fillAddress(
  page: Page,
  address: { street: string; city: string; state: string },
) {
  // A aba escondida continua no DOM: sem filtrar por visível, "Logradouro"
  // casa com as duas e o modo estrito do Playwright recusa.
  const field = (name: string) =>
    page.getByRole("textbox", { name: name }).filter({ visible: true });
  await field("Logradouro").fill(address.street);
  await field("Cidade").fill(address.city);
  await field("UF").fill(address.state);
}

test("dois endereços viram uma requisição, e não duas", async ({ page }) => {
  const api = await apiWithBrowserSession();
  test.skip(!api, "sem NEXT_PUBLIC_API_URL ou sem sessão gravada");

  /**
   * Conta as duas rotas separadamente. Só olhar o `/batch` deixaria passar
   * uma tela que chama as duas coisas — o lote E os POSTs antigos.
   */
  const batch: string[] = [];
  const oneByOne: string[] = [];
  page.on("request", (req) => {
    if (req.method() !== "POST") return;
    const url = req.url();
    if (url.endsWith("/addresses/batch")) batch.push(url);
    else if (url.endsWith("/addresses")) oneByOne.push(url);
  });

  let clientId: string | undefined;

  try {
    await page.goto("/clientes/novo");

    await openSection(page, "Atendimento");
    await choose(page, "Benefício pretendido", "Aposentadoria por idade");
    await choose(page, "Situação", "Formulário preenchido");

    await openSection(page, "Dados pessoais");
    await page.getByLabel("Nome completo").fill(name);
    await fillDateSegments(page, "Data de nascimento", ["20", "05", "1970"]);
    await page.getByLabel("Nome da mãe").fill("Maria de Teste");
    await page.getByLabel("CPF").fill(validCpf());
    await page.getByLabel("Celular").fill("(31) 99999-0000");
    await choose(page, "Gênero", "Feminino");
    await openSection(page, "Dados profissionais");
    await page.getByLabel("Senha do INSS (meu INSS)").fill("senha-inss-123");

    // Duas abas de endereço: é o caso que o lote existe para atender.
    await openSection(page, "Endereço");
    await fillAddress(page, {
      street: "Rua Primeira",
      city: "Belo Horizonte",
      state: "MG",
    });
    await page.getByRole("button", { name: /adicionar endereço/i }).click();
    await page.getByRole("tab", { name: /endereço 2/i }).click();
    await fillAddress(page, {
      street: "Rua Segunda",
      city: "Contagem",
      state: "MG",
    });

    const creation = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        /\/api\/v1\/clients$/.test(new URL(r.url()).pathname),
    );
    const batchBody = page.waitForResponse((r) => r.url().endsWith("/addresses/batch"));

    await page.getByRole("button", { name: "Salvar cliente" }).click();

    const creationResponse = await creation;
    expect(creationResponse.status()).toBe(201);
    clientId = (await creationResponse.json()).data.clientId;

    expect((await batchBody).status()).toBe(201);
    expect(batch, "o lote deveria sair uma vez só").toHaveLength(1);
    expect(oneByOne, "nenhum POST avulso de endereço deveria sair").toHaveLength(0);

    /**
     * E os dois chegaram mesmo — contar requisição provaria só que a tela
     * chamou a rota certa, não que os endereços que a pessoa digitou estão
     * gravados.
     */
    const list = await api!.get(`/api/v1/clients/${clientId}/addresses`);
    expect(list.status()).toBe(200);
    const streets = ((await list.json()).data ?? []).map(
      (e: { street: string }) => e.street,
    );
    expect(streets.sort()).toEqual(["Rua Primeira", "Rua Segunda"]);
  } finally {
    if (clientId) await api!.delete(`/api/v1/clients/${clientId}`);
    await api?.dispose();
  }
});
