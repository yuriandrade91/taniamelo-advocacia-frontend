import { test, expect, type Page } from "@playwright/test";
import { apiWithBrowserSession } from "./apiHelper";
import { closeSuggestions, fillDateSegments } from "./helpers";

/**
 * O fluxo que mais depende de backend e navegador ao mesmo tempo: agendar,
 * ver o aviso de conflito de horário e limpar o que foi criado.
 *
 * Vale como e2e porque nada aqui é verificável isoladamente — o aviso de
 * conflito é uma consulta ao servidor (`GET /appointments/conflicts`) disparada
 * enquanto se digita, e só aparece se o compromisso anterior realmente gravou.
 */

/** Ano à frente: a agenda recusa data no passado sem confirmação explícita. */
const YEAR = new Date().getFullYear() + 1;
const TITLE = `E2E compromisso ${Date.now()}`;
const createdIds: string[] = [];

/**
 * Horário sorteado a cada execução.
 *
 * Era fixo (20/08, 14:30) e isso transformava resíduo de uma execução anterior
 * em falha da seguinte: encontrando conflito, a tela abre um diálogo pedindo
 * "agendar assim mesmo?" em vez de gravar — e o teste, que esperava o POST,
 * morria por timeout culpando o botão.
 *
 * O primeiro teste precisa de um horário LIVRE; o segundo precisa exatamente
 * deste mesmo horário, agora ocupado. Sortear um por execução dá as duas coisas
 * sem depender de o banco estar limpo.
 */
const DAY = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
const MONTH = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
const HOUR = String(8 + Math.floor(Math.random() * 9)).padStart(2, "0");
const START = [DAY, MONTH, String(YEAR), HOUR, "30"];
const END = [DAY, MONTH, String(YEAR), String(Number(HOUR) + 1).padStart(2, "0"), "30"];


/**
 * Tudo que o formulário faz é procurado DENTRO do diálogo.
 *
 * A página da agenda ganhou uma barra de filtros que também tem "Tipo": um
 * `getByLabel("Tipo")` solto passa a casar com dois controles e o teste morre
 * por ambiguidade, apontando para a linha do clique e não para a causa.
 * Buscar dentro do diálogo é, além de mais robusto, o que descreve a intenção.
 */
function form(page: Page) {
  return page.getByRole("dialog", { name: /novo compromisso/i });
}


async function openForm(page: Page) {
  await page.goto("/agenda");
  await page.getByRole("button", { name: "Novo compromisso" }).click();
  await expect(form(page).getByRole("heading", { name: /novo compromisso/i })).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test("agendar um compromisso novo", async ({ page }) => {
  await openForm(page);

  await form(page).getByLabel("Título").fill(TITLE);
  await form(page).getByLabel("Tipo").click();
  await page.getByRole("option", { name: "Entrevista" }).click();

  await fillDateSegments(form(page), "Início", START);
  await fillDateSegments(form(page), "Término", END);

  // Nome livre (o ComboBox aceita valor fora da lista): não depende de haver
  // cliente cadastrado no banco em que a suíte roda.
  await form(page).getByPlaceholder("Nome da pessoa").fill("Fulano de Teste E2E");
  // A lista de sugestões cobre o rodapé do diálogo: sem fechá-la, o clique em
  // "Agendar" vai parar no popover e a falha aparece em cima do botão.
  await closeSuggestions(page, form(page));

  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/v1/appointments") && r.request().method() === "POST",
  );
  await form(page).getByRole("button", { name: "Agendar", exact: true }).click();

  const created = await response;
  expect(created.status()).toBe(201);
  // Compromisso mantém `id` (o rename foi só no id próprio do CLIENTE), mas
  // aceitar os dois evita que a limpeza pare de funcionar em silêncio se esse
  // contrato mudar também — e resíduo de agenda vira conflito no próximo run.
  const body = (await created.json()).data;
  const id = body.id ?? body.appointmentId;
  expect(id, `resposta do POST sem id: ${JSON.stringify(body)}`).toBeTruthy();
  createdIds.push(id);

  // A confirmação é o diálogo fechar e o aviso de sucesso aparecer — não o
  // compromisso surgir na lista. A agenda passou a mostrar uma janela de datas,
  // e este compromisso é do ano que vem (obrigatório: data no passado exige
  // confirmação explícita). Esperar que ele apareça na lista do mês corrente
  // seria afirmar uma coisa errada sobre uma tela certa.
  await expect(form(page)).toBeHidden();
  await expect(page.getByText(/compromisso agendado/i)).toBeVisible();
});

test("o mesmo horário avisa do conflito, sem impedir", async ({ page }) => {
  await openForm(page);

  await form(page).getByLabel("Título").fill(`${TITLE} (segundo)`);
  await form(page).getByLabel("Tipo").click();
  await page.getByRole("option", { name: "Reunião" }).click();

  // Espera a consulta que TEM conflito, não a primeira que passar.
  //
  // A verificação dispara a cada mudança de horário, e a que sai com o início
  // preenchido e o término ainda vazio volta vazia por definição. Esperar
  // "qualquer /conflicts" resolvia nessa — e o teste seguia para a asserção
  // antes de a resposta verdadeira chegar, falhando de forma intermitente.
  const conflicts = page.waitForResponse(
    async (r) =>
      r.url().includes("/appointments/conflicts") &&
      r.ok() &&
      ((await r.json())?.data?.length ?? 0) > 0,
  );
  await fillDateSegments(form(page), "Início", START);
  await fillDateSegments(form(page), "Término", END);
  await conflicts;

  // Cliente é obrigatório no formulário. Sem preencher, o botão ficaria
  // desabilitado por campo faltando — e a asserção do fim leria isso como
  // "o conflito bloqueou", que é exatamente a conclusão errada.
  await form(page).getByPlaceholder("Nome da pessoa").fill("Fulano de Teste E2E");
  await closeSuggestions(page, form(page));


  // O aviso diz COM QUEM o horário bate — "existe conflito" sem dizer com o quê
  // obrigaria a abrir outra tela para decidir. Por isso as duas asserções: que
  // o aviso existe, e que ele nomeia o compromisso que já estava lá.
  const notice = form(page).getByText(/nesse horário/i);
  await expect(notice).toBeVisible();
  await expect(form(page).getByText(TITLE, { exact: false }).first()).toBeVisible();

  // E não bloqueia: perícia e audiência se sobrepõem de propósito.
  await expect(form(page).getByRole("button", { name: "Agendar", exact: true })).toBeEnabled();
});

/**
 * Limpeza pela API, não pela interface.
 *
 * Um teste que termina falhando no meio deixaria a tela em qualquer estado; a
 * limpeza precisa funcionar mesmo assim. E cancelar pela API não é "trapaça":
 * o que está sendo testado acima é a tela, não a limpeza.
 */
test.afterAll(async () => {
  if (createdIds.length === 0) return;

  const api = await apiWithBrowserSession();
  if (!api) return;
  for (const id of createdIds) {
    await api.delete(`/api/v1/appointments/${id}`);
  }
  await api.dispose();
});
