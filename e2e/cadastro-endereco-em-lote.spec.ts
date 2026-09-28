import { test, expect, type Page } from "@playwright/test";

import { MARCA, apiComSessaoDoNavegador, cpfValido } from "./apiHelper";

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

const nome = `${MARCA} Lote ${Date.now().toString(36)}`;

async function escolher(page: Page, rotulo: string, opcao: string) {
  await page.getByRole("button", { name: rotulo }).click();
  await page.getByRole("option", { name: opcao }).click();
}

/**
 * Data de nascimento é um `DatePicker` do react-aria: cada parte (dia, mês,
 * ano) é um `spinbutton` próprio, não um input de texto. `fill` não serve —
 * é o mesmo motivo pelo qual a agenda preenche horário segmento a segmento.
 */
async function preencherData(page: Page, rotulo: string, partes: string[]) {
  const segmentos = page
    .getByRole("group", { name: rotulo })
    .getByRole("spinbutton");
  for (let i = 0; i < partes.length; i++) {
    await segmentos.nth(i).click();
    await page.keyboard.type(partes[i]);
  }
}

/**
 * O formulário é um acordeão: cada seção monta o conteúdo só quando aberta.
 * Sem abrir, os campos existem no DOM e não são visíveis — o `fill` espera 30
 * segundos e a falha aponta para o campo, não para a seção fechada.
 *
 * Idempotente de propósito: abrir o que já está aberto fecharia a seção.
 */
async function abrirSecao(page: Page, titulo: string) {
  const cabecalho = page.getByRole("button", { name: titulo, exact: false }).first();
  if ((await cabecalho.getAttribute("aria-expanded")) === "false") {
    await cabecalho.click();
  }
}

/**
 * Campos por papel (`textbox`), e não por `getByLabel`.
 *
 * O HeroUI renderiza um `<select>` nativo escondido junto de cada combo, e o
 * rótulo acessível dele é a concatenação de todas as opções — "Cidade" casa
 * com o texto do combo de benefício e o teste morre por ambiguidade, numa
 * mensagem que não parece ter nada a ver com endereço.
 */
async function preencherEndereco(
  page: Page,
  dados: { logradouro: string; cidade: string; uf: string },
) {
  // A aba escondida continua no DOM: sem filtrar por visível, "Logradouro"
  // casa com as duas e o modo estrito do Playwright recusa.
  const campo = (nome: string) =>
    page.getByRole("textbox", { name: nome }).filter({ visible: true });
  await campo("Logradouro").fill(dados.logradouro);
  await campo("Cidade").fill(dados.cidade);
  await campo("UF").fill(dados.uf);
}

test("dois endereços viram uma requisição, e não duas", async ({ page }) => {
  const api = await apiComSessaoDoNavegador();
  test.skip(!api, "sem NEXT_PUBLIC_API_URL ou sem sessão gravada");

  /**
   * Conta as duas rotas separadamente. Só olhar o `/batch` deixaria passar
   * uma tela que chama as duas coisas — o lote E os POSTs antigos.
   */
  const emLote: string[] = [];
  const umPorUm: string[] = [];
  page.on("request", (req) => {
    if (req.method() !== "POST") return;
    const url = req.url();
    if (url.endsWith("/addresses/batch")) emLote.push(url);
    else if (url.endsWith("/addresses")) umPorUm.push(url);
  });

  let clienteId: string | undefined;

  try {
    await page.goto("/clientes/novo");

    await abrirSecao(page, "Atendimento");
    await escolher(page, "Benefício pretendido", "Aposentadoria por idade");
    await escolher(page, "Situação", "Formulário preenchido");

    await abrirSecao(page, "Dados pessoais");
    await page.getByLabel("Nome completo").fill(nome);
    await preencherData(page, "Data de nascimento", ["20", "05", "1970"]);
    await page.getByLabel("Nome da mãe").fill("Maria de Teste");
    await page.getByLabel("CPF").fill(cpfValido());
    await page.getByLabel("Celular").fill("(31) 99999-0000");
    await escolher(page, "Gênero", "Feminino");
    await abrirSecao(page, "Dados profissionais");
    await page.getByLabel("Senha do INSS (meu INSS)").fill("senha-inss-123");

    // Duas abas de endereço: é o caso que o lote existe para atender.
    await abrirSecao(page, "Endereço");
    await preencherEndereco(page, {
      logradouro: "Rua Primeira",
      cidade: "Belo Horizonte",
      uf: "MG",
    });
    await page.getByRole("button", { name: /adicionar endereço/i }).click();
    await page.getByRole("tab", { name: /endereço 2/i }).click();
    await preencherEndereco(page, {
      logradouro: "Rua Segunda",
      cidade: "Contagem",
      uf: "MG",
    });

    const criacao = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        /\/api\/v1\/clients$/.test(new URL(r.url()).pathname),
    );
    const lote = page.waitForResponse((r) => r.url().endsWith("/addresses/batch"));

    await page.getByRole("button", { name: "Salvar cliente" }).click();

    const respostaCriacao = await criacao;
    expect(respostaCriacao.status()).toBe(201);
    clienteId = (await respostaCriacao.json()).data.clientId;

    expect((await lote).status()).toBe(201);
    expect(emLote, "o lote deveria sair uma vez só").toHaveLength(1);
    expect(umPorUm, "nenhum POST avulso de endereço deveria sair").toHaveLength(0);

    /**
     * E os dois chegaram mesmo — contar requisição provaria só que a tela
     * chamou a rota certa, não que os endereços que a pessoa digitou estão
     * gravados.
     */
    const lista = await api!.get(`/api/v1/clients/${clienteId}/addresses`);
    expect(lista.status()).toBe(200);
    const ruas = ((await lista.json()).data ?? []).map(
      (e: { street: string }) => e.street,
    );
    expect(ruas.sort()).toEqual(["Rua Primeira", "Rua Segunda"]);
  } finally {
    if (clienteId) await api!.delete(`/api/v1/clients/${clienteId}`);
    await api?.dispose();
  }
});
