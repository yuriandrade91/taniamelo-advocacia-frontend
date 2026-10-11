import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  LoginRequest,
  LoginResponse,
} from "@/interfaces/auth/Auth.interface";
import { applySession, clearSession, readToken } from "@/lib/session";

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

export { clearSession, TOKEN_COOKIE } from "@/lib/session";

/** POST /api/v1/auth/login — `login` aceita e-mail OU username. */
export const login = async (
  body: LoginRequest,
): Promise<ApiEnvelope<LoginResponse>> => {
  // `skipErrorToast`: a tela de login mostra seu próprio toast (mensagem por
  // status); evita toast duplicado do interceptor genérico do axiosService.
  const response = await axiosInstance.post<ApiEnvelope<LoginResponse>>(
    endpoints.AUTH.LOGIN,
    body,
    { skipErrorToast: true },
  );

  // Token (com validade), escritório para o X-Tenant-Id e o usuário — nome,
  // e-mail e perfil só chegam aqui; sem guardar, o menu do usuário não teria o
  // que mostrar (e decodificar o JWT não é contrato público).
  applySession(response.data?.data);

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
export const isAuthenticated = (): boolean => readToken() !== null;

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

    return applySession(response.data?.data) !== null;
  } catch {
    return false;
  }
};
