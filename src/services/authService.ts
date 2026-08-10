import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  LoginRequest,
  LoginResponse,
} from "@/interfaces/auth/Auth.interface";
import { setTenant, clearTenant } from "@/lib/tenant";
import { clearClientsCache } from "@/lib/clientsCache";

/**
 * Autenticação — espelha AuthController.
 *
 * Fluxo:
 * 1. `login` → access token no corpo (gravado no cookie "token") + refresh
 *    token em cookie **httpOnly** gerenciado pelo backend (14 dias).
 * 2. Em `401`, o axiosService chama `/auth/refresh` e repete a requisição.
 * 3. `logout` revoga o refresh token e limpa a sessão local.
 *
 * Todas as rotas exigem `X-Tenant-Id` (injetado pelo axiosService).
 */

/** Nome do cookie do access token (lido também pela guarda em `proxy.ts`). */
export const TOKEN_COOKIE = "token";

/**
 * Grava o access token no cookie com validade explícita.
 *
 * Sem `max-age` o cookie seria de sessão e morreria ao fechar o navegador —
 * o usuário cairia no login mesmo com o refresh token (14 dias) ainda válido,
 * porque a guarda de rota redireciona antes de qualquer chamada à API.
 */
function persistToken(token: string, expiresInSeconds?: number): void {
  if (typeof document === "undefined") return;
  // Fallback: 8h (TTL padrão do access token no backend).
  const maxAge = expiresInSeconds && expiresInSeconds > 0 ? expiresInSeconds : 28800;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

/** Limpa a sessão local (cookie do token + tenant persistido). */
export function clearSession(): void {
  if (typeof document !== "undefined") {
    document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
  }
  clearTenant();
  clearClientsCache();
}

/** POST /api/v1/auth/login — `login` aceita e-mail OU username. */
export const login = async (
  body: LoginRequest,
): Promise<ApiEnvelope<LoginResponse>> => {
  // `skipErrorToast`: a tela de login exibe o erro inline; evita toast duplicado.
  const response = await axiosInstance.post<ApiEnvelope<LoginResponse>>(
    endpoints.AUTH.LOGIN,
    body,
    { skipErrorToast: true },
  );

  const data = response.data?.data;
  if (data?.token) {
    persistToken(data.token, data.expiresInSeconds);
  }
  // Persiste o tenant da sessão para os próximos headers X-Tenant-Id.
  if (data?.tenantId || data?.tenantSlug) {
    setTenant(data.tenantId, data.tenantSlug);
  }

  return response.data;
};

/**
 * POST /api/v1/auth/refresh — rotaciona o refresh token e renova o access token.
 * Usa o cookie httpOnly; funciona enquanto o refresh estiver válido (14 dias).
 */
export const refresh = async (): Promise<ApiEnvelope<LoginResponse>> => {
  const response = await axiosInstance.post<ApiEnvelope<LoginResponse>>(
    endpoints.AUTH.REFRESH,
    {},
  );

  const data = response.data?.data;
  if (data?.token) {
    persistToken(data.token, data.expiresInSeconds);
  }
  if (data?.tenantId || data?.tenantSlug) {
    setTenant(data.tenantId, data.tenantSlug);
  }

  return response.data;
};

/** POST /api/v1/auth/logout — revoga o refresh token e limpa a sessão local. */
export const logout = async (): Promise<ApiEnvelope<string>> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<string>>(
      endpoints.AUTH.LOGOUT,
      {},
    );
    return response.data;
  } finally {
    clearSession();
  }
};

/** Indica se há access token no cookie (checagem de UI, não de segurança). */
export const isAuthenticated = (): boolean => {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((row) => row.startsWith(`${TOKEN_COOKIE}=`));
};

/**
 * Tenta restaurar a sessão sem credenciais, usando o refresh token httpOnly.
 * Útil ao abrir o app depois de o access token expirar.
 *
 * Silencioso: quem não tem refresh token recebe 401 e isso é esperado —
 * `skipErrorToast` evita um toast de erro ao simplesmente abrir o login.
 *
 * @returns true se a sessão foi restaurada.
 */
export const tryRestoreSession = async (): Promise<boolean> => {
  try {
    const response = await axiosInstance.post<ApiEnvelope<LoginResponse>>(
      endpoints.AUTH.REFRESH,
      {},
      { skipErrorToast: true },
    );

    const data = response.data?.data;
    if (data?.token) {
      persistToken(data.token, data.expiresInSeconds);
      if (data.tenantId || data.tenantSlug) {
        setTenant(data.tenantId, data.tenantSlug);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
};
