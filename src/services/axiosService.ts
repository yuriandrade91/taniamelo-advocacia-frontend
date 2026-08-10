"use client";

import httpMessages from "@/constants/messages/httpMessages";
import { toast } from "@heroui/react";
import { getTenantHeaderValue, clearTenant } from "@/lib/tenant";
import { clearClientsCache } from "@/lib/clientsCache";
import { publicRoutes } from "@/constants/paths/routes";
import axios from "axios";

/**
 * Opções extras suportadas por requisição.
 * - `skipErrorToast`: trata o erro na própria UI, sem toast global.
 * - `_retry`: controle interno do retry pós-refresh.
 */
declare module "axios" {
  export interface AxiosRequestConfig {
    skipErrorToast?: boolean;
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
    const status = response.status;
    const method = response.config.method;
    const message = httpMessages[status as keyof typeof httpMessages];
    if (method === "put") {
      toast.success(response.data?.message ?? "Cliente atualizado com sucesso!", {
        description: "Verifique as informações atualizadas.",
      });
    } else if (method === "delete") {
      toast.success(response.data?.message ?? "Cliente excluído com sucesso!", {
        description: "Verifique a lista de clientes.",
      });
    } else if (message) {
      toast.success(message.title, {
        description: message.description,
      });
    }
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

    if (error.response) {
      const apiErrors = error.response.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        const first = apiErrors[0];
        const description = apiErrors
          .map((e: any) => `${e.message}`)
          .join("; ");
        toast.danger(first?.message ?? "Erro de validação", {
        description: "Dado(s) inválido(s). Verifique o(s) campo(s) e tente novamente.",
      });
        return Promise.reject(error);
      }
    } else if (error.request) {
      const target =
        error.config?.url ||
        axios.defaults.baseURL ||
        axiosInstance.defaults.baseURL;
      toast.danger("Erro de conexão", {
        description: `Não foi possível conectar-se ao servidor.`,
      });
    } else {
      toast.danger("Erro", {
        description: error.message ?? "Erro inesperado.",
      });
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
