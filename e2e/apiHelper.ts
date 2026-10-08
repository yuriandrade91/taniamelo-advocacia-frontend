import { request as playwrightRequest, type APIRequestContext } from "@playwright/test";
import { readFileSync } from "node:fs";

/**
 * Um cliente HTTP autenticado com a MESMA sessão do navegador dos testes.
 *
 * Serve para preparar e limpar massa — criar o cliente que a tela vai abrir,
 * apagar o que sobrou. Fazer isso pela interface tornaria cada teste refém de
 * outra tela: um defeito no cadastro derrubaria o teste da senha do INSS, que
 * não tem nada a ver com cadastro.
 *
 * O token sai do `storageState` gravado pelo `auth.setup.ts` — é literalmente a
 * sessão do usuário de teste, então o que a API recusar aqui a tela também
 * recusaria.
 */
export async function apiWithBrowserSession(): Promise<APIRequestContext | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;

  let token: string | undefined;
  try {
    const state = JSON.parse(readFileSync("e2e/.auth/user.json", "utf-8"));
    token = state.cookies?.find((c: { name: string }) => c.name === "token")?.value;
  } catch {
    return null;
  }
  if (!token) return null;

  return playwrightRequest.newContext({
    baseURL: apiUrl,
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(process.env.E2E_TENANT_ID
        ? { "X-Tenant-Id": process.env.E2E_TENANT_ID }
        : process.env.NEXT_PUBLIC_TENANT_SLUG
          ? { "X-Tenant-Id": process.env.NEXT_PUBLIC_TENANT_SLUG }
          : {}),
    },
  });
}

/**
 * CPF válido e aleatório.
 *
 * O backend valida os dígitos verificadores, então um número inventado seria
 * recusado com 400 — e o teste falharia por um motivo que não é o testado.
 */
export function validCpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const digit = (nums: number[]) => {
    const weight = nums.length + 1;
    const sum = nums.reduce((total, n, i) => total + n * (weight - i), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  const d1 = digit(base);
  const d2 = digit([...base, d1]);
  return [...base, d1, d2].join("");
}

/** Tudo que os testes criam nasce marcado, para resíduo ser reconhecível. */
export const TAG = "[e2e]";

/**
 * A integração está em pausa neste ambiente (`NEXT_PUBLIC_INTEGRACOES_PENDENTES`)?
 * O mesmo critério do front (`services/pendingIntegration.ts`): sem a rota,
 * o fluxo não tem o que exercitar e o teste se pula — em vez de um `skip`
 * fixo que esquece de religar quando a rota sobe.
 */
export const integrationPaused = (...nomes: string[]): boolean => {
  const paused = (process.env.NEXT_PUBLIC_INTEGRACOES_PENDENTES ?? "")
    .split(",")
    .map((name) => name.trim().toLowerCase());
  return nomes.some((name) => paused.includes(name));
};
