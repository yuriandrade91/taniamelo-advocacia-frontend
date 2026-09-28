import { test, expect } from "@playwright/test";

/**
 * O freio de tentativas de login, visto da tela.
 *
 * O backend corta depois de algumas senhas erradas e responde 429 com
 * `Retry-After`. Se a tela tratar isso como "credenciais inválidas", manda a
 * pessoa tentar mais uma vez — que é justamente o que aprofunda o bloqueio. O
 * que se prova aqui é que a recusa vira instrução: "tente novamente em X".
 *
 * São dois testes de propósito, porque as duas perguntas são diferentes:
 *
 * 1. Com um 429 **fabricado**, a frase está certa até no número. Determinístico
 *    e barato: roda igual no CI, em qualquer estado das cotas do backend.
 * 2. Com uma rajada **de verdade**, o 429 realmente chega e a tela reage. Não
 *    afirma em qual tentativa o freio entra — o limite por IP é compartilhado
 *    por toda a suíte e pela máquina, então o teto pode já estar próximo. O que
 *    importa aqui é que o caminho inteiro existe.
 */

// Sem sessão: esta é a tela de quem ainda não entrou.
test.use({ storageState: { cookies: [], origins: [] } });

test("com 429 e Retry-After, a tela diz QUANDO tentar de novo", async ({ page }) => {
  await page.route("**/api/v1/auth/login", (rota) =>
    rota.fulfill({
      status: 429,
      headers: {
        "retry-after": "900",
        "content-type": "application/json",
        // A resposta é fabricada, mas o navegador aplica CORS a ela do mesmo
        // jeito: sem `expose-headers`, o `Retry-After` chega e some antes do
        // JavaScript. Repetir aqui o que o backend manda é o que faz este teste
        // exercitar o mesmo caminho da vida real, em vez de um caminho mais fácil.
        "access-control-allow-origin": "http://localhost:3001",
        "access-control-allow-credentials": "true",
        "access-control-expose-headers": "Retry-After",
      },
      body: JSON.stringify({
        success: false,
        data: null,
        pagination: null,
        errors: [
          {
            field: null,
            message: "Muitas tentativas. Tente novamente em alguns minutos.",
            code: "TOO_MANY_ATTEMPTS",
          },
        ],
      }),
    }),
  );

  await page.goto("/login");
  await page.getByPlaceholder("Usuário").fill("quem.for@teste.invalido");
  await page.getByPlaceholder("Senha").fill("qualquer");
  await page.getByRole("button", { name: /entrar/i }).click();

  // 900s viram "15 minutos". Mostrar "900" ou "tente mais tarde" faria a pessoa
  // tentar de novo agora, que é o oposto do que o freio quer.
  await expect(page.getByText(/tente novamente em 15 minutos/i).first()).toBeVisible();

  // E não pode revelar se a conta existe: mensagem diferente para conta
  // bloqueada e conta inexistente entregaria a lista de quem tem login aqui.
  const texto = (await page.locator("body").innerText()).toLowerCase();
  expect(texto).not.toContain("bloquead");

  // 429 não é porta de entrada.
  await expect(page).toHaveURL(/\/login/);
});

/**
 * Login inventado, de propósito.
 *
 * A cota que precisa estourar é a DAQUELE login. Usar o usuário real da suíte
 * travaria a conta por 15 minutos e derrubaria todos os outros testes.
 */
const LOGIN_DESCARTAVEL = `e2e-rajada-${Date.now()}@teste.invalido`;
const TENTATIVAS = 6;

// Até seis idas ao servidor num teste só passam do limite padrão de 30s quando
// a máquina está carregada. Falhar por relógio diria "o freio não funciona",
// que é a conclusão errada.
test.setTimeout(90_000);

test("a rajada real chega a 429 e a tela reage", async ({ page }) => {
  await page.goto("/login");

  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    await page.getByPlaceholder("Usuário").fill(LOGIN_DESCARTAVEL);
    await page.getByPlaceholder("Senha").fill(`errada-${tentativa}`);

    const resposta = page.waitForResponse((r) => r.url().includes("/api/v1/auth/login"));
    await page.getByRole("button", { name: /entrar/i }).click();
    const status = (await resposta).status();

    if (status === 429) {
      await expect(page.getByText(/muitas tentativas/i).first()).toBeVisible();
      await expect(page.getByText(/tente novamente em/i).first()).toBeVisible();
      await expect(page).toHaveURL(/\/login/);
      return;
    }

    // Antes do teto só pode ser recusa de credencial. Qualquer outra coisa (500,
    // 400 de tenant) significa que o teste não está medindo o que acha.
    expect(status, `tentativa ${tentativa} deveria ser 401`).toBe(401);
  }

  throw new Error(
    `${TENTATIVAS} senhas erradas seguidas no mesmo login não foram freadas`,
  );
});
