"use client";

import { notificationCenter } from "@/services/notificationService";
import { getTenantHeaderValue } from "@/lib/tenant";
import { applySession, expireSession, isSessionEnding, readToken } from "@/lib/session";
import axios, { type AxiosError } from "axios";

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
    // Grava como o login grava (com validade): ver `applySession`.
    .then(({ data }) => applySession(data?.data))
    .catch(() => null)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

// Anexa o access token e o header de tenant em toda requisição.
axiosInstance.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Obrigatório em todas as rotas, inclusive login.
  if (!config.headers[TENANT_HEADER]) {
    config.headers[TENANT_HEADER] = getTenantHeaderValue();
  }

  return config;
});

/** As rotas de autenticação: um 401 nelas é resposta (senha errada), não sessão vencida. */
const isAuthRoute = (url?: string) => typeof url === "string" && url.includes("/auth/");

axiosInstance.interceptors.response.use(
  (response) => {
    notificationCenter.notifyResponse(response);
    return response;
  },
  async (error: AxiosError) => {
    // A sessão já está acabando (o navegador vai para o login): as respostas
    // que ainda chegam não viram toast — ver `isSessionEnding`.
    if (isSessionEnding()) return Promise.reject(error);

    const original = error.config;

    // ── 401 fora do login: o access token venceu ──
    //
    // Uma tentativa de refresh, e a requisição é repetida com o token novo.
    // Se o refresh for recusado (refresh vencido ou revogado), ou se a API
    // recusar até o token novo, a sessão acabou: login, sem toast de erro —
    // a tela de login diz por que a pessoa está lá.
    if (error.response?.status === 401 && original && !isAuthRoute(original.url)) {
      if (!original._retry) {
        original._retry = true;
        const newToken = await refreshAccessToken();
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return axiosInstance(original);
        }
      }
      expireSession();
      return Promise.reject(error);
    }

    // Permite que o chamador trate o erro na própria UI, sem toast global.
    // Usado, por ex., na restauração silenciosa de sessão e no login.
    if (original?.skipErrorToast) {
      return Promise.reject(error);
    }

    notificationCenter.notifyError(error as AxiosError<never>);
    return Promise.reject(error);
  },
);

export default axiosInstance;
