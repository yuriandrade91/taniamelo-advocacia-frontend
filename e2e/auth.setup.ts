import { test as setup, expect } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const STORAGE = "e2e/.auth/user.json";

/**
 * Login uma vez por execução; o estado vai para `e2e/.auth/user.json` e os
 * demais testes partem dele.
 *
 * A sessão é um cookie `token` gravado pelo próprio JavaScript da aplicação
 * (não httpOnly), então `storageState` o captura. O refresh token, esse sim
 * httpOnly, também é um cookie e vem junto.
 *
 * As credenciais NUNCA ficam em arquivo do repositório: vêm de E2E_USER e
 * E2E_PASSWORD (shell, direnv ou secret do CI). Um usuário de teste dedicado é
 * melhor que a conta de alguém — o teste cancela e exclui coisas.
 */
setup("autenticar", async ({ page }) => {
  const user = process.env.E2E_USER;
  const password = process.env.E2E_PASSWORD;

  // Falha explícita e cedo: sem isto o teste morreria adiante com "elemento não
  // encontrado", que manda procurar o problema no lugar errado.
  expect(
    user && password,
    "Defina E2E_USER e E2E_PASSWORD: copie env/e2e.example.env para env/e2e.local.env e preencha (ou exporte no shell).",
  ).toBeTruthy();

  await page.goto("/login");

  await page.getByPlaceholder("Usuário").fill(user!);
  await page.getByPlaceholder("Senha").fill(password!);
  await page.getByRole("button", { name: /entrar/i }).click();

  // A confirmação é ter saído do login e chegado na home, não o cookie existir:
  // cookie gravado com token recusado deixaria a suíte verde e cega.
  await page.waitForURL("**/home");

  // O que se afirma aqui é a CASCA autenticada — o menu do usuário só é
  // renderizado com sessão válida. Antes era `heading level 1`, que a home não
  // tem mais desde a reformulação em cards; e prender o login a um título de
  // uma tela em obras faz a suíte inteira cair por um motivo que não é login.
  await expect(page.getByRole("button", { name: /menu de/i })).toBeVisible();

  if (!existsSync(dirname(STORAGE))) mkdirSync(dirname(STORAGE), { recursive: true });
  await page.context().storageState({ path: STORAGE });
});
