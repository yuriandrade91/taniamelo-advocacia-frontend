import { test, expect } from "@playwright/test";

/**
 * Nenhuma tela dispara requisição para rota que o servidor não serve.
 *
 * É a asserção que faltava: "removi as chamadas" se prova observando a rede,
 * não lendo o código. Um `useEffect` esquecido em componente filho não aparece
 * num grep e aparece aqui.
 */
const ROTAS_FORA = [
  "/api/v1/users/me",
  "/api/v1/payments",
  "/api/v1/expenses",
  "/api/v1/revenues",
];

for (const tela of [
  "/home",
  "/clientes",
  "/agenda",
  "/pagamentos",
  "/carteira",
  "/perfil",
]) {
  test(`${tela} não chama rota fora do ar`, async ({ page }) => {
    const proibidas: string[] = [];
    const falhas: string[] = [];

    page.on("request", (r) => {
      const url = new URL(r.url()).pathname;
      if (ROTAS_FORA.some((fora) => url === fora || url.startsWith(fora + "/")))
        proibidas.push(`${r.method()} ${url}`);
    });
    page.on("response", (r) => {
      if (r.status() >= 400 && r.url().includes("/api/v1/"))
        falhas.push(`${r.status()} ${new URL(r.url()).pathname}`);
    });

    // `networkidle` e não um sleep fixo: em dev, a primeira visita a uma rota
    // espera o Turbopack compilá-la — já passou de 40s aqui — e um sleep de 3s
    // terminaria a escuta antes de a página sequer montar, dando verde falso.
    await page.goto(tela, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    expect(proibidas, `${tela} chamou rota removida`).toEqual([]);
    expect(falhas, `${tela} teve resposta de erro da API`).toEqual([]);
  });
}
