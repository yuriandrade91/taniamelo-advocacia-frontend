import { test, expect, type Page, request as playwrightRequest } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * O fluxo que mais depende de backend e navegador ao mesmo tempo: agendar,
 * ver o aviso de conflito de horário e limpar o que foi criado.
 *
 * Vale como e2e porque nada aqui é verificável isoladamente — o aviso de
 * conflito é uma consulta ao servidor (`GET /appointments/conflicts`) disparada
 * enquanto se digita, e só aparece se o compromisso anterior realmente gravou.
 */

/** Ano à frente: a agenda recusa data no passado sem confirmação explícita. */
const ANO = new Date().getFullYear() + 1;
const TITULO = `E2E compromisso ${Date.now()}`;
const criados: string[] = [];

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
const DIA = String(1 + Math.floor(Math.random() * 28)).padStart(2, "0");
const MES = String(1 + Math.floor(Math.random() * 12)).padStart(2, "0");
const HORA = String(8 + Math.floor(Math.random() * 9)).padStart(2, "0");
const INICIO = [DIA, MES, String(ANO), HORA, "30"];
const TERMINO = [DIA, MES, String(ANO), String(Number(HORA) + 1).padStart(2, "0"), "30"];

/**
 * Preenche um campo de data/hora do react-aria segmento a segmento.
 *
 * Não dá para usar `fill`: cada parte (dia, mês, ano, hora, minuto) é um
 * spinbutton próprio, não um input de texto. Clicar em cada um e digitar é o
 * que um usuário faz — e é o que o componente entende.
 */
async function preencherDataHora(page: Page, rotulo: string, partes: string[]) {
  const segmentos = formulario(page).getByRole("group", { name: rotulo }).getByRole("spinbutton");
  for (let i = 0; i < partes.length; i++) {
    await segmentos.nth(i).click();
    await page.keyboard.type(partes[i]);
  }
}

/**
 * Tudo que o formulário faz é procurado DENTRO do diálogo.
 *
 * A página da agenda ganhou uma barra de filtros que também tem "Tipo": um
 * `getByLabel("Tipo")` solto passa a casar com dois controles e o teste morre
 * por ambiguidade, apontando para a linha do clique e não para a causa.
 * Buscar dentro do diálogo é, além de mais robusto, o que descreve a intenção.
 */
function formulario(page: Page) {
  return page.getByRole("dialog", { name: /novo compromisso/i });
}

/**
 * Fecha a lista de sugestões do ComboBox de cliente.
 *
 * Esc só pode ser mandado com a lista ABERTA: sem ela, o Esc sobe para o
 * diálogo e fecha o formulário inteiro — o teste segue procurando campos numa
 * tela que não está mais lá, e a falha aponta para qualquer lugar menos aqui.
 */
async function fecharSugestoes(page: Page) {
  // Tab, e não Esc nem clique.
  //
  // Esc fecha a lista enquanto ela está aberta; se ela já se fechou sozinha, a
  // tecla sobe para o diálogo e fecha o FORMULÁRIO inteiro — o teste segue
  // procurando campos numa tela que não existe mais e a falha aparece longe da
  // causa. E clicar em outro ponto do diálogo não serve: enquanto o popover
  // está aberto, o diálogo fica `aria-hidden`, então nenhuma busca por papel
  // encontra nada lá dentro.
  //
  // Tab tira o foco do campo — fecha a lista em qualquer estado e nunca fecha
  // um diálogo.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("listbox", { name: /cliente/i })).toBeHidden();
  await expect(formulario(page)).toBeVisible();
}

async function abrirFormulario(page: Page) {
  await page.goto("/agenda");
  await page.getByRole("button", { name: "Novo compromisso" }).click();
  await expect(formulario(page).getByRole("heading", { name: /novo compromisso/i })).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test("agendar um compromisso novo", async ({ page }) => {
  await abrirFormulario(page);

  await formulario(page).getByLabel("Título").fill(TITULO);
  await formulario(page).getByLabel("Tipo").click();
  await page.getByRole("option", { name: "Entrevista" }).click();

  await preencherDataHora(page, "Início", INICIO);
  await preencherDataHora(page, "Término", TERMINO);

  // Nome livre (o ComboBox aceita valor fora da lista): não depende de haver
  // cliente cadastrado no banco em que a suíte roda.
  await formulario(page).getByPlaceholder("Nome da pessoa").fill("Fulano de Teste E2E");
  // A lista de sugestões cobre o rodapé do diálogo: sem fechá-la, o clique em
  // "Agendar" vai parar no popover e a falha aparece em cima do botão.
  await fecharSugestoes(page);

  const resposta = page.waitForResponse(
    (r) => r.url().endsWith("/api/v1/appointments") && r.request().method() === "POST",
  );
  await formulario(page).getByRole("button", { name: "Agendar", exact: true }).click();

  const criado = await resposta;
  expect(criado.status()).toBe(201);
  // Compromisso mantém `id` (o rename foi só no id próprio do CLIENTE), mas
  // aceitar os dois evita que a limpeza pare de funcionar em silêncio se esse
  // contrato mudar também — e resíduo de agenda vira conflito no próximo run.
  const corpo = (await criado.json()).data;
  const id = corpo.id ?? corpo.appointmentId;
  expect(id, `resposta do POST sem id: ${JSON.stringify(corpo)}`).toBeTruthy();
  criados.push(id);

  // A confirmação é o diálogo fechar e o aviso de sucesso aparecer — não o
  // compromisso surgir na lista. A agenda passou a mostrar uma janela de datas,
  // e este compromisso é do ano que vem (obrigatório: data no passado exige
  // confirmação explícita). Esperar que ele apareça na lista do mês corrente
  // seria afirmar uma coisa errada sobre uma tela certa.
  await expect(formulario(page)).toBeHidden();
  await expect(page.getByText(/compromisso agendado com sucesso/i)).toBeVisible();
});

test("o mesmo horário avisa do conflito, sem impedir", async ({ page }) => {
  await abrirFormulario(page);

  await formulario(page).getByLabel("Título").fill(`${TITULO} (segundo)`);
  await formulario(page).getByLabel("Tipo").click();
  await page.getByRole("option", { name: "Reunião" }).click();

  // Espera a consulta que TEM conflito, não a primeira que passar.
  //
  // A verificação dispara a cada mudança de horário, e a que sai com o início
  // preenchido e o término ainda vazio volta vazia por definição. Esperar
  // "qualquer /conflicts" resolvia nessa — e o teste seguia para a asserção
  // antes de a resposta verdadeira chegar, falhando de forma intermitente.
  const conflitos = page.waitForResponse(
    async (r) =>
      r.url().includes("/appointments/conflicts") &&
      r.ok() &&
      ((await r.json())?.data?.length ?? 0) > 0,
  );
  await preencherDataHora(page, "Início", INICIO);
  await preencherDataHora(page, "Término", TERMINO);
  await conflitos;

  // Cliente é obrigatório no formulário. Sem preencher, o botão ficaria
  // desabilitado por campo faltando — e a asserção do fim leria isso como
  // "o conflito bloqueou", que é exatamente a conclusão errada.
  await formulario(page).getByPlaceholder("Nome da pessoa").fill("Fulano de Teste E2E");
  await fecharSugestoes(page);


  // O aviso diz COM QUEM o horário bate — "existe conflito" sem dizer com o quê
  // obrigaria a abrir outra tela para decidir. Por isso as duas asserções: que
  // o aviso existe, e que ele nomeia o compromisso que já estava lá.
  const aviso = formulario(page).getByText(/nesse horário/i);
  await expect(aviso).toBeVisible();
  await expect(formulario(page).getByText(TITULO, { exact: false }).first()).toBeVisible();

  // E não bloqueia: perícia e audiência se sobrepõem de propósito.
  await expect(formulario(page).getByRole("button", { name: "Agendar", exact: true })).toBeEnabled();
});

/**
 * Limpeza pela API, não pela interface.
 *
 * Um teste que termina falhando no meio deixaria a tela em qualquer estado; a
 * limpeza precisa funcionar mesmo assim. E cancelar pela API não é "trapaça":
 * o que está sendo testado acima é a tela, não a limpeza.
 */
test.afterAll(async () => {
  if (criados.length === 0) return;

  const estado = JSON.parse(readFileSync("e2e/.auth/user.json", "utf-8"));
  const token = estado.cookies?.find((c: { name: string }) => c.name === "token")?.value;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!token || !apiUrl) return;

  const api = await playwrightRequest.newContext({
    baseURL: apiUrl,
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
      ...(process.env.E2E_TENANT_ID ? { "X-Tenant-Id": process.env.E2E_TENANT_ID } : {}),
    },
  });
  for (const id of criados) {
    await api.delete(`/api/v1/appointments/${id}`);
  }
  await api.dispose();
});
