import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

import { TAG, apiWithBrowserSession, validCpf } from "./apiHelper";

/**
 * Listagem de clientes: o que mudou na revisão da tela.
 *
 * - a contagem fica no resumo da paginação ("1 a 10 de N clientes");
 * - copiar o CPF confirma em **toast**, não em popover colado na célula;
 * - o ícone do calendário abre o campo de período, à esquerda;
 * - mudar de etapa: sem o selo "atual", etapas cumpridas como concluídas,
 *   pular etapas pede confirmação **nomeando** as puladas, voltar pede
 *   justificativa, avançar uma etapa não pergunta nada;
 * - o selo "Isento" vem do `notBillable`, e o filtro de isenção vai à API.
 *
 * A massa (um cliente na primeira etapa) é preparada pela API, de propósito:
 * o teste é da listagem, e passar pelo cadastro o tornaria refém do
 * formulário. Cada mudança de etapa é conferida pela resposta do PATCH e pela
 * linha — e a que não deveria acontecer, pela ausência de PATCH.
 */

test.describe.configure({ mode: "serial" });

const NAME = `${TAG} Lista ${Date.now().toString(36)}`;
const CPF = validCpf();
const MASKED_CPF = CPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

let api: APIRequestContext | null = null;
let clientId = "";

/**
 * Busca pelo nome e devolve a linha do cliente de teste.
 *
 * Espera a lista **filtrada** (uma linha só): o cliente novo também está no
 * topo da lista sem filtro, e a busca (com espera de digitação) recarrega a
 * lista depois — desmontando a linha e o cartão que o teste tivesse aberto.
 */
async function clientRow(page: Page) {
  await page.getByRole("searchbox", { name: "Pesquisar beneficiário" }).fill(NAME);
  const list = page.getByRole("list", { name: "Clientes" });
  await expect(list.getByRole("listitem")).toHaveCount(1);
  const row = list.getByRole("listitem").filter({ hasText: NAME });
  await expect(row).toHaveCount(1);
  return row;
}

/** Abre o cartão "Mudar situação" da linha. */
async function openStageChange(page: Page) {
  const row = await clientRow(page);
  await row.getByRole("button", { name: `Mudar a situação de ${NAME}` }).click();
  const card = page.getByRole("dialog", { name: "Mudar situação" });
  await expect(card).toBeVisible();
  return { row, card };
}

/** Promessa do PATCH de situação do cliente de teste. */
const situationPatch = (page: Page) =>
  page.waitForResponse(
    (r) =>
      r.request().method() === "PATCH" &&
      new URL(r.url()).pathname.endsWith(`/api/v1/clients/${clientId}`),
  );

test.beforeAll(async () => {
  api = await apiWithBrowserSession();
  if (!api) return;
  const created = await api.post("/api/v1/clients", {
    data: {
      fullName: NAME,
      birthDate: "1970-05-20",
      cpf: CPF,
      motherName: "Maria de Teste",
      mobilePhone: "+5531999990000",
      inssPassword: "senha-inss-123",
      gender: "Feminino",
      benefit: "Aposentadoria por idade",
      situation: "Formulário preenchido",
      clientType: "Verificado",
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  clientId = (await created.json()).data.clientId;
});

test.beforeEach(() => {
  test.skip(!api || !clientId, "sem NEXT_PUBLIC_API_URL ou sem sessão gravada");
});

test.afterAll(async () => {
  if (api && clientId) await api.delete(`/api/v1/clients/${clientId}`);
  await api?.dispose();
});

test("a busca da barra superior abre a lista já filtrada", async ({ page }) => {
  await page.goto("/home");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  const search = page.getByRole("searchbox", { name: "Buscar" });
  await search.fill(NAME);
  await search.press("Enter");

  await expect(page).toHaveURL(/\/clientes\?searchTerm=/);
  await expect(page.getByRole("searchbox", { name: "Pesquisar beneficiário" })).toHaveValue(NAME);
  const list = page.getByRole("list", { name: "Clientes" });
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(list.getByRole("listitem").first()).toContainText(NAME);
});

test("a contagem de clientes fica no resumo da paginação", async ({ page }) => {
  await page.goto("/clientes");
  // Sem filtro, a massa semeada passa de uma página: o resumo diz quantos há.
  await expect(page.getByText(/^\d+ a \d+ de \d+ clientes$/)).toBeVisible();
});

test("copiar o CPF confirma em toast", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/clientes");
  const row = await clientRow(page);

  await row.getByRole("button", { name: `Copiar CPF ${MASKED_CPF}` }).click();

  await expect(page.getByText("CPF copiado")).toBeVisible();
  // Nada de popover colado na célula: a confirmação é só o toast.
  await expect(row.getByText("CPF copiado")).toHaveCount(0);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(MASKED_CPF);
});

test("o calendário do período abre o campo, à esquerda das datas", async ({ page }) => {
  await page.goto("/clientes");

  const period = page.getByRole("group", { name: "Período" });
  const trigger = page.getByRole("button", { name: "Abrir calendário do período" });
  const firstDate = period.getByRole("spinbutton").first();

  const [triggerBox, dateBox] = await Promise.all([trigger.boundingBox(), firstDate.boundingBox()]);
  expect(triggerBox && dateBox).toBeTruthy();
  expect(triggerBox!.x).toBeLessThan(dateBox!.x);

  await trigger.click();
  await expect(page.getByRole("grid").first()).toBeVisible();
});

test("o cartão de etapa não tem o selo 'atual'", async ({ page }) => {
  await page.goto("/clientes");
  const { card } = await openStageChange(page);

  await expect(card.getByText("atual", { exact: true })).toHaveCount(0);
  // A informação continua para leitor de tela, no nome acessível da etapa.
  await expect(card.getByRole("button", { name: "Formulário preenchido (etapa atual)" })).toBeVisible();
});

test("pular etapas pede confirmação nomeando as puladas — e Manter não grava", async ({ page }) => {
  await page.goto("/clientes");
  const { row, card } = await openStageChange(page);

  let patches = 0;
  page.on("request", (r) => {
    if (r.method() === "PATCH" && r.url().includes(`/api/v1/clients/${clientId}`)) patches += 1;
  });

  await card.getByRole("button", { name: "Planejamento concluído (próxima)" }).click();
  await card.getByRole("button", { name: "Pular para Planejado…" }).click();

  const dialog = page.getByRole("dialog", { name: "Pular 2 etapas?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    "Você está pulando as etapas Análise documental e Planejamento em execução",
  );
  const skipped = dialog.getByRole("list", { name: "Etapas puladas" }).getByRole("listitem");
  await expect(skipped).toHaveText(["2Análise documental", "3Planejamento em execução"]);

  await dialog.getByRole("button", { name: "Manter" }).click();
  await expect(dialog).toBeHidden();
  expect(patches).toBe(0);
  await expect(row.getByText("Formulário preenchido")).toBeVisible();
});

test("confirmar o pulo grava a etapa nova", async ({ page }) => {
  await page.goto("/clientes");
  const { row, card } = await openStageChange(page);

  await card.getByRole("button", { name: "Planejamento concluído (próxima)" }).click();
  await card.getByRole("button", { name: "Pular para Planejado…" }).click();

  const dialog = page.getByRole("dialog", { name: "Pular 2 etapas?" });
  // Pular também pede justificativa, como voltar.
  await dialog.getByLabel("Justificativa").fill("Planejamento já entregue pelo escritório parceiro.");
  const patch = situationPatch(page);
  await dialog.getByRole("button", { name: "Pular para Planejamento concluído" }).click();

  const response = await patch;
  expect(response.ok(), await response.text()).toBe(true);
  expect(response.request().postDataJSON()).toEqual({ situation: "PLANEJAMENTO_CONCLUIDO" });
  await expect(row.getByText("Planejamento concluído")).toBeVisible();
});

test("etapas cumpridas aparecem como concluídas, em verde — e as puladas, riscadas", async ({ page }) => {
  await page.goto("/clientes");
  const { card } = await openStageChange(page);

  // O teste anterior pulou da 1 para a 4: a trilha marca a 2 e a 3 como puladas.
  const stages = card.getByRole("list", { name: "Etapas da esteira" }).getByRole("listitem");
  await expect(stages.nth(0)).toHaveAttribute("data-state", "done");
  await expect(stages.nth(1)).toHaveAttribute("data-state", "skipped");
  await expect(stages.nth(2)).toHaveAttribute("data-state", "skipped");
  await expect(stages.nth(3)).toHaveAttribute("data-state", "current");
  await expect(stages.nth(4)).toHaveAttribute("data-state", "upcoming");

  const completed = card.getByRole("button", { name: "Formulário preenchido (concluída)" });
  await expect(completed).toContainText("✓");
  // O nó da etapa cumprida é verde (bg-success), não mais o azul da marca.
  await expect(completed.locator("span.bg-success")).toHaveCount(1);
});

test("voltar etapa pede justificativa antes de gravar", async ({ page }) => {
  await page.goto("/clientes");
  const { row, card } = await openStageChange(page);

  await card.getByRole("button", { name: "Análise documental (pulada)" }).click();
  await card.getByRole("button", { name: "Voltar para Documentos…" }).click();

  const dialog = page.getByRole("dialog", { name: "Voltar etapa?" });
  await expect(dialog).toBeVisible();
  const confirm = dialog.getByRole("button", { name: "Voltar para Análise documental" });
  await expect(confirm).toBeDisabled();

  await dialog.getByLabel("Justificativa").fill("curto");
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Justificativa").fill("Faltou o CNIS atualizado na análise.");

  const patch = situationPatch(page);
  await confirm.click();
  expect((await patch).ok()).toBe(true);
  await expect(row.getByText("Análise documental")).toBeVisible();
});

test("avançar uma etapa grava direto, sem diálogo", async ({ page }) => {
  await page.goto("/clientes");
  const { row, card } = await openStageChange(page);

  await card.getByRole("button", { name: "Planejamento em execução (próxima)" }).click();
  const patch = situationPatch(page);
  await card.getByRole("button", { name: "Mover para Planejando" }).click();

  expect((await patch).ok()).toBe(true);
  await expect(page.getByRole("dialog", { name: /Pular|Voltar etapa/ })).toHaveCount(0);
  await expect(row.getByText("Planejamento em execução")).toBeVisible();
});

test("isenção: o selo vem do notBillable e o filtro manda true/false à API", async ({ page }) => {
  const marked = await api!.patch(`/api/v1/clients/${clientId}`, { data: { notBillable: true } });
  expect(marked.status(), await marked.text()).toBe(200);

  /** Promessa da listagem pedida com `notBillable` = `valor`. */
  const listWith = (value: string) =>
    page.waitForResponse((r) => {
      const url = new URL(r.url());
      return (
        r.request().method() === "GET" &&
        url.pathname.endsWith("/api/v1/clients") &&
        url.searchParams.get("notBillable") === value
      );
    });

  try {
    await page.goto("/clientes");
    const row = await clientRow(page);
    await expect(row.getByText("Isento", { exact: true })).toBeVisible();

    const exemption = page.getByRole("radiogroup", { name: "Isenção" });

    const notExempt = listWith("false");
    await exemption.getByRole("radio", { name: "Não isentos" }).click();
    expect((await notExempt).ok()).toBe(true);
    await expect(row).toHaveCount(0);

    const exempt = listWith("true");
    await exemption.getByRole("radio", { name: "Isentos", exact: true }).click();
    expect((await exempt).ok()).toBe(true);
    await expect(row).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Remover filtro Isentos" })).toBeVisible();
  } finally {
    await api!.patch(`/api/v1/clients/${clientId}`, { data: { notBillable: false } });
  }
});
