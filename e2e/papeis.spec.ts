import { test, expect, type Page } from "@playwright/test";

/**
 * O que o atendente (STAFF) não vê.
 *
 * O backend recusa com 403 de qualquer jeito — isto aqui prova a outra metade:
 * que a tela não oferece ao atendente um botão que existe só para negá-lo. As
 * duas metades importam. Só o backend deixa a tela cheia de armadilha; só a
 * tela seria teatro, porque basta abrir o console para chamar a API.
 *
 * E o teste que mais protege não é nenhum dos 403: é o "continua operando".
 * Se o dia a dia do atendente quebrar, a regra está errada, não o teste.
 *
 * Precisa de um usuário STAFF no escritório de teste (`E2E_USER_STAFF` e
 * `E2E_PASSWORD_STAFF`). Sem eles o arquivo inteiro se pula com aviso — melhor
 * que passar verde sem ter testado nada.
 */

const usuario = process.env.E2E_USER_STAFF;
const senha = process.env.E2E_PASSWORD_STAFF;

async function entrarComoAtendente(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Usuário").fill(usuario!);
  await page.getByPlaceholder("Senha").fill(senha!);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL("**/home");
}

test.describe("o que o atendente NÃO vê", () => {
    // Sessão própria: o storageState padrão da suíte é do usuário ADMIN, e o
    // `test.use` abaixo vale só para este bloco — o da contraprova, no fim do
    // arquivo, precisa justamente da sessão de admin.
    test.use({ storageState: { cookies: [], origins: [] } });

    test.beforeEach(async ({ page }) => {
      test.skip(
        !usuario || !senha,
        "defina E2E_USER_STAFF e E2E_PASSWORD_STAFF para rodar os testes de papel",
      );
      await entrarComoAtendente(page);
    });

    test("na lista de clientes, não há botão de excluir", async ({ page }) => {
    await page.goto("/clientes");
    await expect(page.getByRole("grid", { name: /tabela de clientes/i })).toBeVisible();

    // Visualizar e editar continuam: é o dia a dia de quem atende.
    await expect(page.getByRole("button", { name: "Visualizar este cliente" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Editar este cliente" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Excluir este cliente" })).toHaveCount(0);
  });

  test("na ficha, não há excluir nem revelar senha do INSS", async ({ page }) => {
    await page.goto("/clientes");
    await page.getByRole("button", { name: "Visualizar este cliente" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await expect(page.getByRole("button", { name: "Excluir cliente" })).toHaveCount(0);

    await page.getByRole("button", { name: /dados profissionais/i }).click();
    // O campo continua lá, mascarado: esconder o campo inteiro faria parecer que
    // o cliente não tem senha cadastrada. O que some é o botão de revelar.
    await expect(page.getByTestId("inss-password-field")).toBeVisible();
    await expect(page.getByTestId("inss-password-toggle")).toHaveCount(0);
  });

  test("na agenda, cancelar fica e excluir some", async ({ page }) => {
    await page.goto("/agenda");
    await expect(page.getByRole("heading", { name: "Agenda", level: 1 })).toBeVisible();

    // Cancelar é o que o atendente usa quando o cliente desmarca — some seria o
    // corte no lugar errado.
    await expect(page.getByRole("button", { name: "Excluir", exact: true })).toHaveCount(0);
  });

  test("o atendente continua operando: cadastra e edita cliente", async ({ page }) => {
    await page.goto("/clientes");
    await expect(page.getByRole("button", { name: /novo cliente/i })).toBeVisible();

    await page.getByRole("button", { name: "Editar este cliente" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    // Em modo de edição: os campos aceitam digitação e o salvar está lá.
    await expect(page.getByRole("button", { name: /salvar/i })).toBeVisible();
  });
});

/**
 * A contraprova.
 *
 * Sem ela, todos os testes acima passariam se o botão tivesse simplesmente
 * sumido da tela para TODO mundo — um erro de layout, um `podeDestruir` que
 * devolve `false` sempre, uma regressão no hook. "Não está lá" só significa
 * alguma coisa quando se sabe que, para outra pessoa, está.
 */
test.describe("e para o advogado/admin, os mesmos botões APARECEM", () => {
  // Volta ao usuário padrão da suíte, que é ADMIN.
  test.use({ storageState: "e2e/.auth/user.json" });

  test("lista e ficha mostram excluir; a ficha mostra revelar senha", async ({ page }) => {
    await page.goto("/clientes");
    await expect(page.getByRole("button", { name: "Excluir este cliente" }).first()).toBeVisible();

    await page.getByRole("button", { name: "Visualizar este cliente" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("button", { name: "Excluir cliente" })).toBeVisible();
    await expect(page.getByTestId("inss-password-toggle")).toBeVisible();
  });
});
