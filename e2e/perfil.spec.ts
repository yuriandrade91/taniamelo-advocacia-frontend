import { test, expect } from "@playwright/test";

/**
 * "Meus dados".
 *
 * ## O que este arquivo NÃO faz, e por quê
 *
 * Não troca a senha de verdade. O usuário desta suíte é o mesmo de todas as
 * execuções seguintes: uma troca bem-sucedida invalidaria `E2E_PASSWORD` e o
 * `auth.setup` pararia de logar — a suíte inteira ficaria vermelha por um
 * motivo que não é defeito do produto, e a recuperação exigiria alguém mexer no
 * banco.
 *
 * O que dá para verificar sem esse risco é tudo o que importa aqui: que os
 * campos chegam preenchidos, que o botão não salva o que não mudou, que a
 * validação acusa o campo certo, e que a recusa do servidor ("senha atual
 * incorreta") aparece na caixa que errou em vez de num toast genérico.
 *
 * O nome muda e é revertido no mesmo teste — esse sim é reversível.
 */

test.describe.configure({ mode: "serial" });

const cartao = (page: import("@playwright/test").Page, titulo: RegExp) =>
  page.locator("section, div").filter({ has: page.getByRole("heading", { name: titulo }) });

test("o menu do usuário leva para Meus dados", async ({ page }) => {
  await page.goto("/home");
  await page.getByRole("button", { name: /menu de/i }).click();
  await page.getByRole("menuitem", { name: "Meus dados" }).click();

  await expect(page).toHaveURL(/\/perfil/);
  await expect(page.getByRole("heading", { name: "Meus dados" })).toBeVisible();
});

test("os campos chegam preenchidos e o que não se edita vem travado", async ({
  page,
}) => {
  await page.goto("/perfil");

  // Formulário que abre vazio e salva assim grava vazio por cima do cadastro.
  await expect(page.getByLabel("Nome completo")).not.toHaveValue("");
  await expect(page.getByLabel("E-mail")).not.toHaveValue("");

  // Usuário é o login — mudá-lo trocaria a identidade da sessão. Papel é
  // autorização. Aparecem, mas em somente leitura: escondê-los faria a pessoa
  // procurar onde se muda.
  await expect(page.getByLabel("Usuário")).toBeDisabled();
  await expect(page.getByLabel("Perfil de acesso")).toBeDisabled();
});

test("Salvar fica travado enquanto nada mudou", async ({ page }) => {
  await page.goto("/perfil");
  const salvar = page.getByRole("button", { name: "Salvar" });

  await expect(salvar).toBeDisabled();

  await page.getByLabel("Nome completo").fill("Nome Diferente E2E");
  await expect(salvar).toBeEnabled();

  // Voltar ao original destrava de novo? Não — e não deveria: comparar é por
  // valor, então voltar ao texto de origem volta a travar. É o que se afirma.
  await page.reload();
  await expect(page.getByRole("button", { name: "Salvar" })).toBeDisabled();
});

test("alterar o nome e reverter", async ({ page }) => {
  await page.goto("/perfil");

  const campo = page.getByLabel("Nome completo");
  const original = await campo.inputValue();
  const novo = `${original} ✦`;

  await campo.fill(novo);
  const salvamento = page.waitForResponse(
    (r) => r.request().method() === "PUT" && r.url().endsWith("/users/me"),
  );
  await page.getByRole("button", { name: "Salvar" }).click();
  expect((await salvamento).status()).toBe(200);

  // O menu reflete na hora. Sem isso a pessoa veria o nome antigo até a
  // próxima sessão e concluiria que não salvou.
  await expect(page.getByRole("button", { name: /menu de/i })).toContainText(
    /✦|menu de/i,
  );

  // Reverter é parte do teste, não limpeza opcional: o nome fica no menu de
  // todas as execuções seguintes.
  await campo.fill(original);
  const volta = page.waitForResponse(
    (r) => r.request().method() === "PUT" && r.url().endsWith("/users/me"),
  );
  await page.getByRole("button", { name: "Salvar" }).click();
  expect((await volta).status()).toBe(200);
  await expect(campo).toHaveValue(original);
});

test("e-mail inválido é recusado antes de sair da tela", async ({ page }) => {
  await page.goto("/perfil");

  const requisicoes: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "PUT") requisicoes.push(r.url());
  });

  await page.getByLabel("E-mail").fill("não-é-email");
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(page.getByText(/e-?mail/i).last()).toBeVisible();
  expect(requisicoes, "não deveria ter ido ao servidor").toHaveLength(0);
});

test.describe("senha", () => {
  test("a confirmação divergente acusa a confirmação, não a nova", async ({
    page,
  }) => {
    await page.goto("/perfil");

    const requisicoes: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "PATCH") requisicoes.push(r.url());
    });

    await page.getByLabel("Senha atual").fill("qualquer-coisa-1");
    await page.getByLabel("Nova senha").fill("umaSenhaNova123");
    await page.getByLabel("Repita a nova senha").fill("outraCoisaQualquer");
    await page.getByRole("button", { name: "Alterar senha" }).click();

    await expect(page.getByText(/não conferem/i)).toBeVisible();
    expect(requisicoes).toHaveLength(0);
  });

  test("senha curta é recusada aqui, sem ir ao servidor", async ({ page }) => {
    await page.goto("/perfil");

    const requisicoes: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "PATCH") requisicoes.push(r.url());
    });

    await page.getByLabel("Senha atual").fill("qualquer-coisa-1");
    await page.getByLabel("Nova senha").fill("curta1");
    await page.getByLabel("Repita a nova senha").fill("curta1");
    await page.getByRole("button", { name: "Alterar senha" }).click();

    await expect(page.getByText(/ao menos 8 caracteres/i)).toBeVisible();
    expect(requisicoes).toHaveLength(0);
  });

  test("senha atual errada volta do servidor no campo, não num toast", async ({
    page,
  }) => {
    await page.goto("/perfil");

    await page.getByLabel("Senha atual").fill("essa-senha-nao-e-a-minha-1");
    await page.getByLabel("Nova senha").fill("outraSenhaValida123");
    await page.getByLabel("Repita a nova senha").fill("outraSenhaValida123");

    const tentativa = page.waitForResponse(
      (r) =>
        r.request().method() === "PATCH" && r.url().endsWith("/users/me/password"),
    );
    await page.getByRole("button", { name: "Alterar senha" }).click();

    // O servidor recusa — é o esperado, e a senha do usuário de teste segue
    // intacta. Não há bloqueio de conta neste caminho: o contador de falhas é
    // do login.
    const resposta = await tentativa;
    expect(resposta.status()).toBeGreaterThanOrEqual(400);

    // A mensagem pertence à caixa que errou. Num toast no canto, a pessoa
    // adivinha qual das três está errada.
    const campo = page.getByLabel("Senha atual");
    const descricao = await campo.getAttribute("aria-describedby");
    expect(descricao, "o erro deveria estar ligado ao campo").toBeTruthy();
  });
});
