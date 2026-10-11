import { apiWithBrowserSession, integrationPaused } from "./apiHelper";
import { test, expect, type APIRequestContext } from "@playwright/test";

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
 * O nome muda e é revertido no mesmo teste — esse sim é reversível. A reversão
 * também acontece pela API no `afterAll`: o teste que falha no meio deixava o
 * sufixo gravado no nome de quem roda a suíte, e ele aparecia no avatar do
 * menu em todas as sessões seguintes.
 */

test.describe.configure({ mode: "serial" });
/** Sem `/users/me` neste ambiente, não há fluxo para exercitar. */
test.skip(integrationPaused("users-me"), "rota de perfil em pausa neste ambiente");

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
  const saveButton = page.getByRole("button", { name: "Salvar" });

  await expect(saveButton).toBeDisabled();

  await page.getByLabel("Nome completo").fill("Nome Diferente E2E");
  await expect(saveButton).toBeEnabled();

  // Voltar ao original destrava de novo? Não — e não deveria: comparar é por
  // valor, então voltar ao texto de origem volta a travar. É o que se afirma.
  await page.reload();
  await expect(page.getByRole("button", { name: "Salvar" })).toBeDisabled();
});

/** O nome de antes do teste, para o `afterAll` devolver mesmo se algo falhar. */
let originalName = "";

test("alterar o nome e reverter", async ({ page }) => {
  await page.goto("/perfil");

  const field = page.getByLabel("Nome completo");
  const original = await field.inputValue();
  expect(original, "o nome precisa ter carregado antes de alterá-lo").not.toBe("");
  originalName = original;
  // Sufixo que se reconhece como resíduo de teste se algum dia escapar — e
  // que some no mesmo teste e, de novo, no `afterAll`.
  const newValue = `${original} (e2e)`;

  await field.fill(newValue);
  const saveRequest = page.waitForResponse(
    (r) => r.request().method() === "PUT" && r.url().endsWith("/users/me"),
  );
  await page.getByRole("button", { name: "Salvar" }).click();
  expect((await saveRequest).status()).toBe(200);

  // O menu reflete na hora. Sem isso a pessoa veria o nome antigo até a
  // próxima sessão e concluiria que não salvou.
  //
  // A conferência é pelo NOME ACESSÍVEL do botão: o que ele mostra são as
  // iniciais. A versão anterior comparava o texto visível e só passava porque
  // o sufixo era um símbolo que virava inicial — a asserção dependia do
  // enfeite, e o enfeite ficava gravado no nome de quem rodava a suíte.
  await expect(
    page.getByRole("button", { name: `Menu de ${newValue}` }),
  ).toBeVisible();

  // Reverter é parte do teste, não limpeza opcional: o nome fica no menu de
  // todas as execuções seguintes.
  await field.fill(original);
  const back = page.waitForResponse(
    (r) => r.request().method() === "PUT" && r.url().endsWith("/users/me"),
  );
  await page.getByRole("button", { name: "Salvar" }).click();
  expect((await back).status()).toBe(200);
  await expect(field).toHaveValue(original);
});

test("e-mail inválido é recusado antes de sair da tela", async ({ page }) => {
  await page.goto("/perfil");

  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "PUT") requests.push(r.url());
  });

  await page.getByLabel("E-mail").fill("não-é-email");
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(page.getByText(/e-?mail/i).last()).toBeVisible();
  expect(requests, "não deveria ter ido ao servidor").toHaveLength(0);
});

test.describe("senha", () => {
  test("a confirmação divergente acusa a confirmação, não a nova", async ({
    page,
  }) => {
    await page.goto("/perfil");

    const requests: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "PATCH") requests.push(r.url());
    });

    await page.getByLabel("Senha atual").fill("qualquer-coisa-1");
    await page.getByLabel("Nova senha", { exact: true }).fill("umaSenhaNova123");
    await page.getByLabel("Repita a nova senha").fill("outraCoisaQualquer");
    await page.getByRole("button", { name: "Alterar senha" }).click();

    await expect(page.getByText(/não conferem/i)).toBeVisible();
    expect(requests).toHaveLength(0);
  });

  test("senha curta é recusada aqui, sem ir ao servidor", async ({ page }) => {
    await page.goto("/perfil");

    const requests: string[] = [];
    page.on("request", (r) => {
      if (r.method() === "PATCH") requests.push(r.url());
    });

    await page.getByLabel("Senha atual").fill("qualquer-coisa-1");
    await page.getByLabel("Nova senha", { exact: true }).fill("curta1");
    await page.getByLabel("Repita a nova senha").fill("curta1");
    await page.getByRole("button", { name: "Alterar senha" }).click();

    await expect(page.getByText(/ao menos 8 caracteres/i)).toBeVisible();
    expect(requests).toHaveLength(0);
  });

  test("senha atual errada volta do servidor no campo, não num toast", async ({
    page,
  }) => {
    await page.goto("/perfil");

    await page.getByLabel("Senha atual").fill("essa-senha-nao-e-a-minha-1");
    await page.getByLabel("Nova senha", { exact: true }).fill("outraSenhaValida123");
    await page.getByLabel("Repita a nova senha").fill("outraSenhaValida123");

    const attempt = page.waitForResponse(
      (r) =>
        r.request().method() === "PATCH" && r.url().endsWith("/users/me/password"),
    );
    await page.getByRole("button", { name: "Alterar senha" }).click();

    // O servidor recusa — é o esperado, e a senha do usuário de teste segue
    // intacta. Não há bloqueio de conta neste caminho: o contador de falhas é
    // do login.
    const response = await attempt;
    expect(response.status()).toBeGreaterThanOrEqual(400);

    // A mensagem pertence à caixa que errou. Num toast no canto, a pessoa
    // adivinha qual das três está errada.
    // Espera o render: a resposta chega antes de o erro ser desenhado.
    await expect(page.getByLabel("Senha atual"), "o erro deveria estar ligado ao campo").toHaveAttribute(
      "aria-describedby",
      /\S/,
    );
  });
});

/**
 * Devolve o nome pela API — a interface não serve aqui: um teste que falhou no
 * meio deixa a tela em qualquer estado, e é justamente nesse caso que a
 * reversão precisa funcionar.
 */
test.afterAll(async () => {
  if (!originalName) return;
  let api: APIRequestContext | null = null;
  try {
    api = await apiWithBrowserSession();
    if (!api) return;
    const current = await api.get("/api/v1/users/me");
    if (!current.ok()) return;
    const data = (await current.json()).data;
    if (data?.fullName === originalName) return;
    await api.put("/api/v1/users/me", {
      data: { fullName: originalName, email: data?.email },
    });
  } catch {
    // Melhor seguir sem limpar do que derrubar a suíte pela limpeza.
  } finally {
    await api?.dispose();
  }
});
