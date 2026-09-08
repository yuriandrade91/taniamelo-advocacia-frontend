import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta (navegador de verdade, contra o backend de verdade).
 *
 * Complementa o Vitest, não substitui: o Vitest cobre função pura (validação,
 * conversão de payload, cálculo de datas) em milissegundos; aqui verificamos o
 * que só aparece com tudo ligado — rota protegida, formulário que grava, e a
 * resposta do backend chegando na tela.
 *
 * `E2E_BASE_URL` aponta para onde a aplicação está servindo. Sem ele, o
 * Playwright sobe `pnpm dev:local` na 3001 e usa o backend do `env/local.env`.
 * Para testar contra a instância da AWS, use o `env/development.env` (ver
 * docs/E2E_PLAYWRIGHT.md).
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3001";

export default defineConfig({
  testDir: "./e2e",
  // Os testes gravam dados num backend compartilhado. Paralelizar faria dois
  // deles disputarem o mesmo horário na agenda e falharem por motivo errado —
  // "conflito de horário" é justamente uma regra que testamos.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    // Só guarda rastro do que falhou: trace e vídeo de suíte verde é lixo em disco.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    // Faz login uma vez e grava o cookie; os demais projetos começam autenticados.
    // Sem isto, cada teste gastaria alguns segundos repetindo o mesmo formulário.
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],

  // Reaproveita um `pnpm dev` que já esteja rodando: em desenvolvimento quase
  // sempre há um. No CI sobe um do zero, porque lá não há nenhum.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm dev:local",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
