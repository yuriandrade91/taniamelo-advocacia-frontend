import { test, expect, type Page } from "@playwright/test";

import { MARCA, apiComSessaoDoNavegador, cpfValido } from "./apiHelper";

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
async function abrirCartao(page: Page, nome: string) {
  await page.getByRole("button", { name: `Mudar a situação de ${nome}` }).click();
  const cartao = page.getByRole("dialog", { name: "Mudar situação" });
  await expect(cartao).toBeVisible();
  return cartao;
}

/** Espera o PATCH do cliente e devolve o corpo enviado. */
function esperarPatch(page: Page, clienteId: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === "PATCH" &&
      response.url().endsWith(`/api/v1/clients/${clienteId}`),
  );
}

test("avança, pula e volta etapas pela lista, com justificativa onde é preciso", async ({
  page,
}) => {
  const api = await apiComSessaoDoNavegador();
  test.skip(!api, "sem NEXT_PUBLIC_API_URL ou sem sessão gravada");

  const nome = `${MARCA} Compilado ${Date.now().toString(36)}`;
  let clienteId: string | undefined;

  try {
    const criado = await api!.post("/api/v1/clients", {
      data: {
        fullName: nome,
        birthDate: "1970-05-20",
        cpf: cpfValido(),
        motherName: "Maria de Teste",
        mobilePhone: "+5531999990000",
        inssPassword: "senha-inss-123",
        gender: "Feminino",
        benefit: "Aposentadoria por idade",
        situation: "Formulário preenchido",
        clientType: "Potencial",
      },
    });
    expect(criado.status(), await criado.text()).toBe(201);
    clienteId = (await criado.json()).data.clientId as string;

    await page.goto("/clientes");
    await page.getByPlaceholder("Pesquisar beneficiário…").fill(nome);
    const trilho = page.getByRole("button", { name: `Mudar a situação de ${nome}` });
    await expect(trilho).toBeVisible();

    // 1. Avançar uma etapa: direto, sem diálogo.
    let cartao = await abrirCartao(page, nome);
    await cartao.getByRole("button", { name: /Análise documental/ }).click();
    let patch = esperarPatch(page, clienteId);
    await cartao.getByRole("button", { name: "Mover para Documentos" }).click();
    expect((await patch).request().postDataJSON()).toEqual({ situation: "ANALISE_DOCUMENTAL" });
    await expect(trilho).toContainText("Análise documental");

    // 2. Pular duas etapas: confirmação nomeando as puladas + justificativa.
    cartao = await abrirCartao(page, nome);
    await cartao.getByRole("button", { name: /Benefício futuro/ }).click();
    await cartao.getByRole("button", { name: "Pular para Futuro…" }).click();
    const pular = page.getByRole("dialog").filter({ hasText: "Pular 2 etapas?" });
    await expect(pular).toBeVisible();
    await expect(pular.getByText("Planejamento em execução e Planejamento concluído")).toBeVisible();
    const confirmarPulo = pular.getByRole("button", { name: "Pular para Benefício futuro" });
    await expect(confirmarPulo).toBeDisabled();
    await pular.getByRole("textbox", { name: /Justificativa/ }).fill("Cliente trouxe o planejamento já pronto.");
    patch = esperarPatch(page, clienteId);
    await confirmarPulo.click();
    expect((await patch).request().postDataJSON()).toEqual({ situation: "BENEFICIO_FUTURO" });
    await expect(trilho).toContainText("Benefício futuro");

    // 3. A trilha real marca as etapas puladas no cartão.
    cartao = await abrirCartao(page, nome);
    await expect(cartao.getByRole("button", { name: "Planejamento em execução (pulada)" })).toBeVisible();
    await expect(cartao.getByRole("button", { name: "Planejamento concluído (pulada)" })).toBeVisible();
    await expect(cartao.getByRole("button", { name: "Análise documental (concluída)" })).toBeVisible();

    // 4. Voltar: justificativa obrigatória, e nada vai antes de confirmar.
    await cartao.getByRole("button", { name: /Análise documental/ }).click();
    await cartao.getByRole("button", { name: "Voltar para Documentos…" }).click();
    const voltar = page.getByRole("dialog").filter({ hasText: "Voltar etapa?" });
    await expect(voltar).toBeVisible();
    const confirmarVolta = voltar.getByRole("button", { name: "Voltar para Análise documental" });
    await expect(confirmarVolta).toBeDisabled();
    await voltar.getByRole("textbox", { name: /Justificativa/ }).fill("Faltou o CNIS atualizado na análise.");
    patch = esperarPatch(page, clienteId);
    await confirmarVolta.click();
    expect((await patch).request().postDataJSON()).toEqual({ situation: "ANALISE_DOCUMENTAL" });
    await expect(trilho).toContainText("Análise documental");

    // O servidor guardou a última escolha.
    const lido = await api!.get(`/api/v1/clients/${clienteId}`);
    expect((await lido.json()).data.situation).toBe("Análise documental");
  } finally {
    if (clienteId) await api!.delete(`/api/v1/clients/${clienteId}`);
    await api?.dispose();
  }
});
