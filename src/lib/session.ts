import { publicRoutes } from "@/constants/paths/routes";
import type { LoginResponse } from "@/interfaces/auth/Auth.interface";
import { clearSessionCaches } from "./requestCache";
import { clearSessionUser, saveSessionUser } from "./sessionUser";
import { clearTenant, setTenant } from "./tenant";

/**
 * A sessão no navegador: gravar, limpar e **encerrar**, num lugar só.
 *
 * Mora fora do `authService` porque o `axiosService` também precisa dela (o
 * refresh automático e o fim de sessão por 401), e o `authService` já importa
 * o `axiosService` — o caminho inverso fecharia um ciclo.
 */

/** Nome do cookie do access token. */
export const TOKEN_COOKIE = "token";

/** TTL padrão do access token no backend, quando a resposta não diz. */
const DEFAULT_TOKEN_SECONDS = 8 * 60 * 60;

/**
 * Grava o access token no cookie com validade explícita.
 *
 * Sem `max-age` o cookie seria de sessão: morreria ao fechar o navegador (e o
 * usuário cairia no login com o refresh ainda válido) e, pior, **não morreria**
 * quando o token vence — a guarda de rota acharia que há sessão e a tela
 * ficaria tomando 401. Com a validade do token, cookie ausente = token vencido.
 */
function persistToken(token: string, expiresInSeconds?: number): void {
  if (typeof document === "undefined") return;
  const maxAge = expiresInSeconds && expiresInSeconds > 0 ? expiresInSeconds : DEFAULT_TOKEN_SECONDS;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_COOKIE}=${token}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

/**
 * Aplica o que o login ou o refresh devolveu: token, escritório e usuário.
 * Login, refresh pela tela e refresh automático do interceptor passam todos
 * por aqui — antes eram três cópias, e a do interceptor gravava o cookie sem
 * validade.
 *
 * @returns o token novo, ou `null` se a resposta não trouxe um.
 */
export function applySession(data: LoginResponse | undefined | null): string | null {
  if (!data?.token) return null;
  persistToken(data.token, data.expiresInSeconds);
  if (data.tenantId || data.tenantSlug) setTenant(data.tenantId, data.tenantSlug);
  saveSessionUser(data);
  return data.token;
}

/** O access token do cookie, se houver. */
export function readToken(): string | null {
  if (typeof document === "undefined") return null;
  const row = document.cookie.split("; ").find((item) => item.startsWith(`${TOKEN_COOKIE}=`));
  return row ? row.slice(TOKEN_COOKIE.length + 1) || null : null;
}

/** Limpa a sessão local: cookie do token, escritório, caches e usuário. */
export function clearSession(): void {
  if (typeof document !== "undefined") {
    document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
  }
  clearTenant();
  clearSessionCaches();
  clearSessionUser();
}

/**
 * O endereço do login para quem perdeu a sessão: o destino para voltar depois
 * (`?next=`, o mesmo contrato da guarda de rota) e o motivo (`?expired=1`),
 * para a tela de login dizer por que a pessoa está ali.
 */
export function expiredLoginUrl(pathname: string, search: string): string {
  const params = new URLSearchParams({ expired: "1" });
  const here = pathname + search;
  if (pathname && pathname !== "/" && !pathname.startsWith(publicRoutes.login)) {
    params.set("next", here);
  }
  return `${publicRoutes.login}?${params.toString()}`;
}

let ending = false;

/**
 * A sessão está sendo encerrada: o navegador já está indo para o login.
 *
 * Entre o 401 e a troca de página, as outras requisições da tela ainda
 * respondem — cada uma com o seu 401 —, e a tela tentaria mostrar um toast de
 * erro por requisição. Com isto ligado, o interceptor e a central de
 * notificações ficam calados: o que a pessoa precisa saber é dito uma vez, no
 * login.
 */
export const isSessionEnding = (): boolean => ending;

/**
 * Fim de sessão: o token venceu e o refresh foi recusado (ou a API recusou o
 * token novo). Limpa tudo e troca a página pelo login — uma vez só, por mais
 * requisições que cheguem aqui juntas.
 *
 * `location.replace`, e não o router: a troca de página descarta o estado da
 * tela inteira (nada do usuário anterior fica em memória), e o "voltar" do
 * navegador não devolve a tela que já não tem sessão.
 */
export function expireSession(): void {
  if (typeof window === "undefined" || ending) return;
  if (window.location.pathname.startsWith(publicRoutes.login)) {
    clearSession();
    return;
  }
  ending = true;
  clearSession();
  window.location.replace(expiredLoginUrl(window.location.pathname, window.location.search));
}
