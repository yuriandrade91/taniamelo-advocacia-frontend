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
export async function apiComSessaoDoNavegador(): Promise<APIRequestContext | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;

  let token: string | undefined;
  try {
    const estado = JSON.parse(readFileSync("e2e/.auth/user.json", "utf-8"));
    token = estado.cookies?.find((c: { name: string }) => c.name === "token")?.value;
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
export function cpfValido(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const digito = (nums: number[]) => {
    const peso = nums.length + 1;
    const soma = nums.reduce((total, n, i) => total + n * (peso - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = digito(base);
  const d2 = digito([...base, d1]);
  return [...base, d1, d2].join("");
}

/** Tudo que os testes criam nasce marcado, para resíduo ser reconhecível. */
export const MARCA = "[e2e]";
