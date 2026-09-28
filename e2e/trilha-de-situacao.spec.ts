import { test, expect } from "@playwright/test";

import { MARCA, apiComSessaoDoNavegador, cpfValido } from "./apiHelper";

/**
 * A trilha de situação diz de onde para onde, marca quem voltou e nomeia quem
 * mudou.
 *
 * Antes mostrava só "passou para X". Era verdadeiro e quase inútil: a pergunta
 * do escritório não é em que etapa o cliente está — isso a ficha inteira já
 * responde — é o que aconteceu com ele. Voltar de "Planejamento concluído"
 * para "Análise documental" é exatamente o caso que alguém quer enxergar, e
 * era o que menos aparecia.
 *
 * A massa é preparada pela API, de propósito: o teste é da leitura da trilha,
 * e passar pela tela de edição o tornaria refém do formulário de cliente — um
 * defeito lá derrubaria este teste, mandando investigar o lugar errado.
 */

test("mostra a situação anterior, marca o retrocesso e nomeia o autor", async ({
  page,
}) => {
  const api = await apiComSessaoDoNavegador();
  test.skip(!api, "sem NEXT_PUBLIC_API_URL ou sem sessão gravada");

  const nome = `${MARCA} Trilha ${Date.now().toString(36)}`;
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
    clienteId = (await criado.json()).data.clientId;

    // Avança duas etapas e volta uma: é a volta que precisa aparecer marcada.
    for (const situation of [
      "Análise documental",
      "Planejamento concluído",
      "Análise documental",
    ]) {
      const patch = await api!.patch(`/api/v1/clients/${clienteId}`, {
        data: { situation },
      });
      expect(patch.status(), await patch.text()).toBe(200);
    }

    await page.goto("/clientes");
    await page.getByPlaceholder("Pesquisar beneficiário...").fill(nome);
    await page.getByRole("button", { name: "Visualizar este cliente" }).first().click();

    const ficha = page.getByRole("dialog");
    await expect(ficha).toBeVisible();

    // "voltou" é o selo do retrocesso, calculado no backend pela posição das
    // duas situações no funil. Se ele sumir, a informação que motivou a
    // funcionalidade some junto e nada mais na tela denuncia.
    await expect(ficha.getByText("voltou")).toBeVisible();

    // De onde veio: o par "de <anterior>" só é possível porque o DTO passou a
    // trazer `previousSituation`. Inferir pela linha seguinte mentiria na
    // primeira página de uma lista paginada.
    await expect(
      ficha.getByText(/de Planejamento concluído/i).first(),
    ).toBeVisible();

    /**
     * E por quem. O `changedByUserId` é um UUID; o nome só aparece porque
     * `GET /users` existe e a ficha o resolve. A asserção é sobre o formato
     * "por <alguma coisa>" e não sobre um nome fixo, porque o usuário de
     * teste varia com quem roda a suíte — mas o que NÃO pode aparecer é um
     * UUID, e isso o padrão abaixo recusa.
     */
    const autoria = ficha.getByText(/^por .+/).first();
    await expect(autoria).toBeVisible();
    await expect(autoria).not.toHaveText(
      /por [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
  } finally {
    if (clienteId) await api!.delete(`/api/v1/clients/${clienteId}`);
    await api?.dispose();
  }
});
