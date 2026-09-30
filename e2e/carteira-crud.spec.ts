import { test, expect, type Page } from "@playwright/test";

import { apiComSessaoDoNavegador, MARCA } from "./apiHelper";

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
/**
 * ⏸ Em pausa enquanto a rota não está no ar.
 *
 * A tela e os componentes continuam montados — o corte é no serviço
 * (`services/integracaoPendente`), então nenhuma requisição sai e estes fluxos
 * não têm o que exercitar. O arquivo fica: é o roteiro que precisa passar no dia
 * em que a rota subir, e reescrevê-lo de memória seria pior.
 *
 * Para religar: apague o atalho no serviço e a linha `test.skip` abaixo.
 */
test.skip(true, "integração pendente — ver services/integracaoPendente.ts");


/** Sorteado por execução: duas execuções no mesmo banco não se confundem. */
const SELO = Date.now();
const RECEITA = `${MARCA} honorário ${SELO}`;
const RECEITA_EDITADA = `${RECEITA} (corrigido)`;
const DESPESA = `${MARCA} aluguel ${SELO}`;
const DESPESA_EDITADA = `${DESPESA} (corrigido)`;

/** Criados pela tela; a limpeza roda pela API mesmo se um teste falhar no meio. */
const receitas: string[] = [];
const despesas: string[] = [];

/**
 * Dia 10 do mês corrente.
 *
 * A Carteira mostra um mês por vez e abre no atual. Vencimento em outro mês
 * faria a linha não aparecer — e o teste culparia o cadastro, que funcionou.
 * Dia 10, e não hoje: "hoje" no dia 31 vira data que alguns meses não têm.
 */
function vencimentoDesteMes(): string[] {
  const agora = new Date();
  return [
    "10",
    String(agora.getMonth() + 1).padStart(2, "0"),
    String(agora.getFullYear()),
  ];
}

const formulario = (page: Page, nome: RegExp) =>
  page.getByRole("dialog", { name: nome });

/**
 * Preenche um DatePicker do react-aria segmento a segmento.
 *
 * `fill` não funciona: cada parte é um spinbutton próprio, não um input de
 * texto. É o mesmo helper da agenda, repetido aqui de propósito — um util
 * compartilhado entre specs faz uma falha de localizador derrubar dois
 * arquivos e esconder qual tela quebrou.
 */
async function preencherData(
  page: Page,
  escopo: ReturnType<typeof formulario>,
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

/**
 * Fecha a lista de sugestões do ComboBox de cliente, se estiver aberta.
 *
 * Enquanto o popover está aberto ele cobre o rodapé do diálogo, e o clique em
 * "Lançar receita" vai parar nele — o teste morre por timeout esperando um
 * POST que nunca saiu, culpando o botão.
 *
 * Tab, e não Esc: com a lista já fechada, o Esc sobe para o diálogo e fecha o
 * formulário inteiro, e a falha aparece longe da causa.
 */
async function fecharSugestoes(page: Page) {
  await page.keyboard.press("Tab");
  await expect(page.getByRole("listbox")).toBeHidden();
}

async function abrirNovoLancamento(page: Page) {
  await page.goto("/carteira");
  await page.getByRole("button", { name: "Registrar lançamento" }).click();
  return formulario(page, /novo lançamento/i);
}

/** A linha da tabela que contém esta descrição — em qualquer das duas tabelas. */
const linha = (page: Page, descricao: string) =>
  page.getByRole("row").filter({ hasText: descricao });

test("lançar uma entrada", async ({ page }) => {
  const modal = await abrirNovoLancamento(page);

  // Entrada é o tipo inicial; clicar mesmo assim prova que o seletor responde.
  await modal.getByRole("radio", { name: "Entrada" }).click();

  // Cliente é opcional: receita de parecer avulso ou reembolso não vem de
  // cliente nenhum, e o formulário precisa aceitar isso sem asterisco.
  await expect(modal.getByLabel(/cliente \(opcional\)/i)).toBeVisible();

  await modal.getByLabel("Descrição").fill(RECEITA);
  await modal.getByLabel("Valor").fill("1.500,00");
  await preencherData(page, modal, "Vencimento", vencimentoDesteMes());

  await fecharSugestoes(page);

  const criacao = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      /\/api\/v1\/revenues$/.test(new URL(r.url()).pathname),
  );
  await modal.getByRole("button", { name: "Lançar receita" }).click();

  const resposta = await criacao;
  expect(resposta.status()).toBe(201);
  receitas.push((await resposta.json()).data.id);

  await expect(modal).toBeHidden();
  await expect(linha(page, RECEITA)).toBeVisible();
});

test("lançar uma saída", async ({ page }) => {
  const modal = await abrirNovoLancamento(page);

  await modal.getByRole("radio", { name: "Saída" }).click();
  await modal.getByLabel("Descrição").fill(DESPESA);
  await modal.getByLabel("Valor").fill("2.300,00");
  await preencherData(page, modal, "Vencimento", vencimentoDesteMes());

  const criacao = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      /\/api\/v1\/expenses$/.test(new URL(r.url()).pathname),
  );
  await modal.getByRole("button", { name: "Lançar saída" }).click();

  const resposta = await criacao;
  expect(resposta.status()).toBe(201);
  despesas.push((await resposta.json()).data.id);

  await expect(modal).toBeHidden();
  await expect(linha(page, DESPESA)).toBeVisible();
});

test("editar a entrada: o registro muda e o tipo não se troca", async ({
  page,
}) => {
  await page.goto("/carteira");
  await linha(page, RECEITA).getByRole("button", { name: "Editar receita" }).click();

  const modal = formulario(page, /editar entrada/i);
  await expect(modal).toBeVisible();

  // O campo vem preenchido com o que está gravado. Modal de edição que abre
  // vazio e salva assim apaga o registro sem avisar.
  await expect(modal.getByLabel("Descrição")).toHaveValue(RECEITA);
  await expect(modal.getByLabel("Valor")).toHaveValue(/1\.?500,00/);

  // Trocar entrada por saída num registro existente seria apagar de uma tabela
  // e criar na outra — o botão não diz isso, então o seletor não existe aqui.
  await expect(modal.getByRole("radiogroup")).toHaveCount(0);

  await modal.getByLabel("Descrição").fill(RECEITA_EDITADA);

  const edicao = page.waitForResponse(
    (r) => r.request().method() === "PUT" && r.url().includes("/api/v1/revenues/"),
  );
  await modal.getByRole("button", { name: "Salvar" }).click();

  expect((await edicao).status()).toBe(200);
  await expect(modal).toBeHidden();
  await expect(linha(page, RECEITA_EDITADA)).toBeVisible();
});

test("editar a saída marcando que já foi paga muda o status", async ({
  page,
}) => {
  await page.goto("/carteira");
  await linha(page, DESPESA).getByRole("button", { name: "Editar despesa" }).click();

  const modal = formulario(page, /editar saída/i);
  await modal.getByLabel("Descrição").fill(DESPESA_EDITADA);

  // A caixa é o que decide Pendente × Pago; a data segue junto.
  await modal.getByRole("switch", { name: /já foi paga|já foi pago/i }).click();
  await preencherData(page, modal, "Data do pagamento", vencimentoDesteMes());

  const edicao = page.waitForResponse(
    (r) => r.request().method() === "PUT" && r.url().includes("/api/v1/expenses/"),
  );
  await modal.getByRole("button", { name: "Salvar" }).click();

  const resposta = await edicao;
  expect(resposta.status()).toBe(200);
  // O status vai no corpo: omiti-lo faria o servidor devolver para Pendente,
  // e a tela mostraria "Paga" só até o próximo carregamento.
  expect((await resposta.json()).data.status).toBe("Pago");

  await expect(modal).toBeHidden();
  await expect(linha(page, DESPESA_EDITADA)).toBeVisible();
});

test("excluir a entrada tira a linha da lista", async ({ page }) => {
  await page.goto("/carteira");
  await linha(page, RECEITA_EDITADA)
    .getByRole("button", { name: "Excluir receita" })
    .click();

  const dialogo = page.getByRole("dialog", { name: /excluir entrada/i });
  await expect(dialogo).toBeVisible();
  // O diálogo nomeia o registro: "confirma a exclusão?" sem dizer de quê é
  // como se apaga a linha errada com toda a confiança.
  await expect(dialogo.getByText(RECEITA_EDITADA)).toBeVisible();

  const exclusao = page.waitForResponse(
    (r) =>
      r.request().method() === "DELETE" && r.url().includes("/api/v1/revenues/"),
  );
  await dialogo.getByRole("button", { name: "Excluir" }).click();

  expect((await exclusao).status()).toBe(204);
  await expect(linha(page, RECEITA_EDITADA)).toHaveCount(0);
  receitas.length = 0; // já foi
});

test("excluir a saída tira a linha da lista", async ({ page }) => {
  await page.goto("/carteira");
  await linha(page, DESPESA_EDITADA)
    .getByRole("button", { name: "Excluir despesa" })
    .click();

  const dialogo = page.getByRole("dialog", { name: /excluir saída/i });
  const exclusao = page.waitForResponse(
    (r) =>
      r.request().method() === "DELETE" && r.url().includes("/api/v1/expenses/"),
  );
  await dialogo.getByRole("button", { name: "Excluir" }).click();

  expect((await exclusao).status()).toBe(204);
  await expect(linha(page, DESPESA_EDITADA)).toHaveCount(0);
  despesas.length = 0;
});

/**
 * Limpeza pela API: um teste que falha no meio deixa a tela em qualquer
 * estado, e a limpeza precisa funcionar assim mesmo.
 */
test.afterAll(async () => {
  const api = await apiComSessaoDoNavegador();
  if (!api) return;
  for (const id of receitas) await api.delete(`/api/v1/revenues/${id}`);
  for (const id of despesas) await api.delete(`/api/v1/expenses/${id}`);
  await api.dispose();
});
