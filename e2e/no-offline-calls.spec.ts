import { test, expect } from "@playwright/test";

/**
 * Nenhuma tela dispara requisição para rota que o servidor não serve.
 *
 * É a asserção que faltava: "removi as chamadas" se prova observando a rede,
 * não lendo o código. Um `useEffect` esquecido em componente filho não aparece
 * num grep e aparece aqui.
 *
 * **A lista de rotas proibidas vem do ambiente, não daqui.** Qual integração
 * está em pausa é decisão de ambiente — `NEXT_PUBLIC_INTEGRACOES_PENDENTES`,
 * o mesmo var que `src/services/pendingIntegration.ts` lê. Fixar os nomes no
 * teste já deu errado: contra o backend do repositório, que serve as quatro
 * famílias, o teste reprovava justamente a tela que estava funcionando.
 *
 * Com nada pausado a lista fica vazia, e o teste se reduz à outra metade — que
 * continua valendo em todo ambiente: nenhuma tela recebe 4xx/5xx da API.
 */
const PREFIX_BY_GROUP: Readonly<Record<string, string>> = {
  "users-me": "/api/v1/users/me",
  payments: "/api/v1/payments",
  expenses: "/api/v1/expenses",
  revenues: "/api/v1/revenues",
  cep: "/api/v1/cep",
};

const OFFLINE_ROUTES = (process.env.NEXT_PUBLIC_INTEGRACOES_PENDENTES ?? "")
  .split(",")
  .map((name) => name.trim().toLowerCase())
  .filter(Boolean)
  .map((group) => PREFIX_BY_GROUP[group])
  .filter((prefixo): prefixo is string => Boolean(prefixo));

for (const screen of [
  "/home",
  "/clientes",
  "/agenda",
  "/pagamentos",
  "/carteira",
  "/relatorios",
  "/perfil",
]) {
  test(`${screen} não chama rota fora do ar`, async ({ page }) => {
    const forbidden: string[] = [];
    const failures: string[] = [];

    page.on("request", (r) => {
      const url = new URL(r.url()).pathname;
      if (OFFLINE_ROUTES.some((fora) => url === fora || url.startsWith(fora + "/")))
        forbidden.push(`${r.method()} ${url}`);
    });
    page.on("response", (r) => {
      if (r.status() >= 400 && r.url().includes("/api/v1/"))
        failures.push(`${r.status()} ${new URL(r.url()).pathname}`);
    });

    // `networkidle` e não um sleep fixo: em dev, a primeira visita a uma rota
    // espera o Turbopack compilá-la — já passou de 40s aqui — e um sleep de 3s
    // terminaria a escuta antes de a página sequer montar, dando verde falso.
    await page.goto(screen, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    expect(forbidden, `${screen} chamou rota em pausa`).toEqual([]);
    expect(failures, `${screen} teve resposta de erro da API`).toEqual([]);
  });
}
