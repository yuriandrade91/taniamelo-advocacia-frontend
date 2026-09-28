import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

/**
 * Credenciais do e2e (E2E_USER, E2E_PASSWORD, ...) vêm de `env/e2e.local.env`,
 * que o git ignora — modelo em `env/e2e.example.env`. Sem isto, cada sessão de
 * terminal exigiria repetir os `export` à mão, e o primeiro `pnpm test:e2e`
 * morreria no setup de login.
 *
 * `loadEnvFile` não sobrescreve o que já está no ambiente: `export` no shell ou
 * secret do CI continuam valendo por cima do arquivo.
 */
const E2E_CREDENTIALS = "env/e2e.local.env";
if (existsSync(E2E_CREDENTIALS)) process.loadEnvFile(E2E_CREDENTIALS);

/**
 * Testes de ponta a ponta (navegador de verdade, contra o backend de verdade).
 *
 * Complementa o Vitest, não substitui: o Vitest cobre função pura (validação,
 * conversão de payload, cálculo de datas) em milissegundos; aqui verificamos o
 * que só aparece com tudo ligado — rota protegida, formulário que grava, e a
 * resposta do backend chegando na tela.
 *
 * `E2E_BASE_URL` aponta para onde a aplicação está servindo. Sem ele, o
 * Playwright sobe o `next dev` na 3001 herdando o ambiente de quem chamou —
 * `pnpm test:e2e` usa o `env/local.env`, `pnpm test:e2e:dev` usa o
 * `env/development.env` (ver docs/E2E_PLAYWRIGHT.md).
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
  /**
   * `list` para acompanhar a execução, `html` para investigar o que falhou.
   *
   * O relatório HTML só era gerado no CI, e localmente `playwright show-report`
   * respondia "No report found" — a ferramenta que existe justamente para
   * examinar uma falha não estava disponível na máquina onde a falha acontece.
   * O `trace` e o vídeo já eram gravados em `test-results/`; faltava a página
   * que os abre.
   *
   * `open: "never"` porque abrir o navegador sozinho no fim de cada execução
   * atrapalha quem está rodando a suíte em sequência. Para ver:
   * `pnpm exec playwright show-report`.
   */
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],

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

  /**
   * Reaproveita um `pnpm dev` que já esteja rodando: em desenvolvimento quase
   * sempre há um. No CI sobe um do zero, porque lá não há nenhum.
   *
   * O comando é `next dev` cru, e **não** `pnpm dev:local`. A diferença é
   * séria: o script `dev:local` começa com `dotenv -e env/local.env`, que
   * sobrescreveria as variáveis já carregadas por quem chamou. `pnpm
   * test:e2e:dev` subiria um servidor apontado para o backend **local**
   * enquanto o processo de teste acreditava estar na instância da AWS — e o
   * relatório diria verde sobre um ambiente que ninguém pediu para testar.
   *
   * Sem o `dotenv` aqui, o servidor herda o ambiente do processo do
   * Playwright, que é o que o script de cada alvo já preparou. `pnpm exec`
   * resolve o binário sem depender de quem chamou ter posto
   * `node_modules/.bin` no PATH.
   */
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm exec next dev --turbopack --port 3001",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
