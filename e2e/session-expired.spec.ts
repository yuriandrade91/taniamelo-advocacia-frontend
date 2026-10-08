import { test, expect } from "@playwright/test";

/**
 * Token vencido no meio do uso: login, e não uma tela cheia de toasts.
 *
 * O cenário: há um access token no cookie, mas a API já não o aceita, e não
 * há refresh token para renovar. A tela abre, pede os dados, recebe 401 em
 * todas as leituras — e o que se prova aqui é que nenhum desses 401 vira toast
 * de erro, e que a pessoa termina no login sabendo por quê, com o caminho de
 * volta guardado.
 */

// Sem sessão de verdade: só o cookie de um token que a API recusa.
test.use({ storageState: { cookies: [], origins: [] } });

test("com o token vencido, a tela vai para o login, avisa e não mostra erro", async ({ page }, info) => {
  const baseURL = info.project.use.baseURL ?? "http://localhost:3001";
  const origin = new URL(baseURL).origin;

  /*
    A API recusa tudo com 401 — as leituras da Home e o próprio refresh —,
    como faz com um access token vencido e sem refresh token válido. Fabricado
    para o teste não depender do relógio do backend nem de esperar um token
    vencer; os cabeçalhos de CORS são os que o backend manda, para o navegador
    entregar a resposta ao JavaScript como entregaria a de verdade.
  */
  const requests: string[] = [];
  await page.route("**/api/v1/**", (route) => {
    requests.push(route.request().url());
    const cors = {
      "access-control-allow-origin": origin,
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    };
    if (route.request().method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: cors });
    }
    return route.fulfill({
      status: 401,
      headers: { ...cors, "content-type": "application/json" },
      body: JSON.stringify({
        success: false,
        data: null,
        pagination: null,
        errors: [{ field: null, message: "Autenticação necessária", code: "UNAUTHENTICATED" }],
      }),
    });
  });

  await page.context().addCookies([{ name: "token", value: "token-vencido", url: baseURL }]);

  await page.goto("/home");

  await expect(page).toHaveURL(/\/login\?/);
  const url = new URL(page.url());
  expect(url.searchParams.get("expired")).toBe("1");
  expect(url.searchParams.get("next")).toBe("/home");
  // A Home chegou a pedir dados: o caminho testado é o do 401 no meio do uso.
  expect(requests.some((u) => !u.includes("/auth/"))).toBe(true);

  await expect(page.getByText("Sua sessão expirou.", { exact: false })).toBeVisible();
  // Nenhum dos 401 virou toast.
  await expect(page.getByText("Autenticação necessária")).toHaveCount(0);
  await expect(page.getByText(/não foi possível/i)).toHaveCount(0);
  // E a sessão foi limpa: o cookie do token vencido não ficou para trás.
  const cookies = await page.context().cookies(baseURL);
  expect(cookies.find((c) => c.name === "token")).toBeUndefined();
});
