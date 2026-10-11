import { test, expect, type Page } from "@playwright/test";

import { TAG, apiWithBrowserSession, validCpf } from "./apiHelper";

/**
 * Mudar a situação direto na lista de Clientes.
 *
 * É e2e porque a regra cruza tela e backend: o PATCH grava a situação, a
 * trilha de situação registra o caminho e é dela que o cartão tira as etapas
 * **puladas**. Avançar uma etapa é direto; pular e voltar pedem justificativa
 * num diálogo — e nada é gravado antes de confirmar.
 *
 * A massa é criada pela API e apagada no fim, como na `trilha-de-situacao`.
 */

/** O cartão de etapas aberto a partir do trilho da linha do cliente. */
async function openCard(page: Page, name: string) {
  await page.getByRole("button", { name: `Mudar a situação de ${name}` }).click();
  const card = page.getByRole("dialog", { name: "Mudar situação" });
  await expect(card).toBeVisible();
  return card;
}

/** Espera o PATCH do cliente e devolve o corpo enviado. */
function waitForPatch(page: Page, clientId: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().endsWith(`/api/v1/clients/${clientId}`),
  );
}

test("avança, pula e volta etapas pela lista, com justificativa onde é preciso", async ({
  page,
}) => {
  const api = await apiWithBrowserSession();
  test.skip(!api, "sem NEXT_PUBLIC_API_URL ou sem sessão gravada");

  const name = `${TAG} Compilado ${Date.now().toString(36)}`;
  let clientId: string | undefined;

  try {
    const created = await api!.post("/api/v1/clients", {
      data: {
        fullName: name,
        birthDate: "1970-05-20",
        cpf: validCpf(),
        motherName: "Maria de Teste",
        mobilePhone: "+5531999990000",
        inssPassword: "senha-inss-123",
        gender: "Feminino",
        benefit: "Aposentadoria por idade",
        situation: "Formulário preenchido",
        clientType: "Potencial",
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    clientId = (await created.json()).data.clientId as string;

    await page.goto("/clientes");
    await page.getByPlaceholder("Pesquisar beneficiário…").fill(name);
    // Espera a busca chegar: recém-criado, o cliente já aparece na primeira
    // página sem filtro, e a lista refeita pela busca levaria o cartão aberto.
    await expect(page.getByRole("list", { name: "Clientes" }).getByRole("listitem")).toHaveCount(1);
    const track = page.getByRole("button", { name: `Mudar a situação de ${name}` });
    await expect(track).toBeVisible();

    // 1. Avançar uma etapa: direto, sem diálogo.
    let card = await openCard(page, name);
    await card.getByRole("button", { name: /Análise documental/ }).click();
    let patch = waitForPatch(page, clientId);
    await card.getByRole("button", { name: "Mover para Documentos" }).click();
    expect((await patch).request().postDataJSON()).toEqual({ situation: "ANALISE_DOCUMENTAL" });
    await expect(track).toContainText("Análise documental");

    // 2. Pular duas etapas: confirmação nomeando as puladas + justificativa.
    card = await openCard(page, name);
    await card.getByRole("button", { name: /Benefício futuro/ }).click();
    await card.getByRole("button", { name: "Pular para Futuro…" }).click();
    const skip = page.getByRole("dialog").filter({ hasText: "Pular 2 etapas?" });
    await expect(skip).toBeVisible();
    await expect(skip.getByText("Planejamento em execução e Planejamento concluído")).toBeVisible();
    const confirmSkip = skip.getByRole("button", { name: "Pular para Benefício futuro" });
    await expect(confirmSkip).toBeDisabled();
    await skip.getByRole("textbox", { name: /Justificativa/ }).fill("Cliente trouxe o planejamento já pronto.");
    patch = waitForPatch(page, clientId);
    await confirmSkip.click();
    expect((await patch).request().postDataJSON()).toEqual({ situation: "BENEFICIO_FUTURO" });
    await expect(track).toContainText("Benefício futuro");

    // 3. A trilha real marca as etapas puladas no cartão.
    card = await openCard(page, name);
    await expect(card.getByRole("button", { name: "Planejamento em execução (pulada)" })).toBeVisible();
    await expect(card.getByRole("button", { name: "Planejamento concluído (pulada)" })).toBeVisible();
    await expect(card.getByRole("button", { name: "Análise documental (concluída)" })).toBeVisible();

    // 4. Voltar: justificativa obrigatória, e nada vai antes de confirmar.
    await card.getByRole("button", { name: /Análise documental/ }).click();
    await card.getByRole("button", { name: "Voltar para Documentos…" }).click();
    const back = page.getByRole("dialog").filter({ hasText: "Voltar etapa?" });
    await expect(back).toBeVisible();
    const confirmBack = back.getByRole("button", { name: "Voltar para Análise documental" });
    await expect(confirmBack).toBeDisabled();
    await back.getByRole("textbox", { name: /Justificativa/ }).fill("Faltou o CNIS atualizado na análise.");
    patch = waitForPatch(page, clientId);
    await confirmBack.click();
    expect((await patch).request().postDataJSON()).toEqual({ situation: "ANALISE_DOCUMENTAL" });
    await expect(track).toContainText("Análise documental");

    // O servidor guardou a última escolha.
    const read = await api!.get(`/api/v1/clients/${clientId}`);
    expect((await read.json()).data.situation).toBe("Análise documental");
  } finally {
    if (clientId) await api!.delete(`/api/v1/clients/${clientId}`);
    await api?.dispose();
  }
});
