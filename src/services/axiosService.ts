"use client";

import { notificationCenter } from "@/services/notificationService";
import { getTenantHeaderValue, clearTenant } from "@/lib/tenant";
import { clearClientsCache } from "@/lib/clientsCache";
import { publicRoutes } from "@/constants/paths/routes";
import axios from "axios";

/**
 * Opções extras suportadas por requisição.
 * - `skipErrorToast`: trata o erro na própria UI, sem toast global.
 * - `successMessage`: toast de sucesso pra respostas sem corpo (204) — sem
 *   `body.success` pra inspecionar, `notifyResponse` não tem como saber que
 *   deu certo sozinho. Sem isso, cai num texto padrão por método HTTP
 *   (ver `DEFAULT_SUCCESS_MESSAGE_BY_METHOD` em `notificationService`).
 * - `skipSuccessToast`: a tela já avisou o usuário por conta própria. É o caso
 *   das ações com janela de desfazer: o toast sai no clique, e a requisição só
 *   parte 5s depois — sem isto o usuário veria a mesma coisa duas vezes.
 * - `_retry`: controle interno do retry pós-refresh.
 */
declare module "axios" {
  export interface AxiosRequestConfig {
    skipErrorToast?: boolean;
    successMessage?: string;
    skipSuccessToast?: boolean;
    _retry?: boolean;
  }
}

/** Header de tenant exigido pelo backend (app.tenancy.header-name). */
export const TENANT_HEADER = "X-Tenant-Id";

/**
 * Encerra a sessão local e manda para o login.
 * Implementado aqui (e não via authService) para evitar import circular —
 * `authService` já importa esta instância.
 */
function endSessionAndRedirect(): void {
  if (typeof window === "undefined") return;
  document.cookie = "token=; path=/; max-age=0";
  clearTenant();
  clearClientsCache();
  if (window.location.pathname !== publicRoutes.login) {
    window.location.assign(publicRoutes.login);
  }
}

const axiosInstance = axios.create({
  // Os endpoints em constants/endpoints/paths.ts são absolutos (já incluem /api/v1);
  // baseURL é apenas fallback para chamadas com path relativo.
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  // Necessário para o cookie httpOnly do refresh token trafegar.
  withCredentials: true,
  headers: {
    "Content-Type": "application/json;charset=utf-8",
  },
  timeout: 10000,
  /**
   * Sem isso, o axios serializa `{ year: [2025, 2026] }` como `year[]=2025&year[]=2026`
   * (seu default pra arrays). O binding do Spring pra `List<T>` via `@RequestParam`
   * espera o parâmetro repetido SEM colchetes (`year=2025&year=2026`) — é assim
   * que todo `List<...>` de query param é lido no backend. `indexes: null` é a
   * opção do axios pra esse formato (documentado em `AxiosURLSearchParams`).
   * Valores escalares (a maioria dos params hoje) não são afetados.
   */
  paramsSerializer: { indexes: null },
});

/**
 * Rotaciona o access token via refresh token (cookie httpOnly).
 * Usa `axios` puro (não a instância) para não reentrar nos interceptors.
 * Serializa chamadas concorrentes: o backend invalida o refresh anterior a cada uso.
 */
let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  refreshInFlight = axios
    .post(
      `${baseURL}/api/v1/auth/refresh`,
      {},
      {
        withCredentials: true,
        headers: { [TENANT_HEADER]: getTenantHeaderValue() },
      },
    )
    .then(({ data }) => {
      const token: string | undefined = data?.data?.token;
      if (token && typeof document !== "undefined") {
        document.cookie = `token=${token}; path=/; SameSite=Lax`;
        return token;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

// Anexa o access token e o header de tenant em toda requisição.
axiosInstance.interceptors.request.use((config) => {
  if (typeof document !== "undefined") {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  // Obrigatório em todas as rotas, inclusive login.
  if (!config.headers[TENANT_HEADER]) {
    config.headers[TENANT_HEADER] = getTenantHeaderValue();
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    notificationCenter.notifyResponse(response);
    return response;
  },
  async (error) => {
    // ── Refresh automático: em 401, rotaciona o token uma vez e repete ──
    const original = error.config;
    const isAuthRoute =
      typeof original?.url === "string" && original.url.includes("/auth/");

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isAuthRoute
    ) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(original);
      }

      // Refresh falhou (expirado/revogado): encerra a sessão e volta ao login,
      // em vez de deixar o usuário numa tela sem dados.
      endSessionAndRedirect();
      return Promise.reject(error);
    }

    // Permite que o chamador trate o erro na própria UI, sem toast global.
    // Usado, por ex., na restauração silenciosa de sessão e no login.
    if (original?.skipErrorToast) {
      return Promise.reject(error);
    }

    notificationCenter.notifyError(error);
    return Promise.reject(error);
  },
);

export default axiosInstance;
