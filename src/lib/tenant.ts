import { API_BASE_URL } from "@/constants/endpoints/paths";

/**
 * Multi-tenancy — resolução do escritório (tenant).
 *
 * O backend exige o header `X-Tenant-Id` em TODA requisição (inclusive login),
 * aceitando o **identificador público**: slug (ex.: "tania") ou UUID.
 * O nome do schema (`tenant_tania`) nunca trafega.
 *
 * Estratégia: antes do login usa `NEXT_PUBLIC_TENANT_SLUG`; depois do login usa
 * o `tenantId` (UUID) devolvido pela API.
 *
 * O que fica guardado vale só para a API que o devolveu: a chave leva o
 * `API_BASE_URL`. O mesmo `localhost:3001` serve ora o backend local, ora o da
 * AWS (`dev:local` / `dev:development`), e cada um tem o seu UUID para o mesmo
 * escritório — com a chave única, o UUID de um ia para o outro e toda
 * requisição, até o login, voltava "Escritório não encontrado".
 */

const scoped = (name: string) => `${name}@${API_BASE_URL}`;
const TENANT_ID_KEY = scoped("tenantId");
const TENANT_SLUG_KEY = scoped("tenantSlug");
/** As chaves de antes, sem a API: apagadas na primeira gravação para não confundir quem inspeciona. */
const LEGACY_KEYS = ["tenantId", "tenantSlug"];

/** Slug padrão do ambiente (usado antes do login). */
const DEFAULT_TENANT_SLUG =
  process.env.NEXT_PUBLIC_TENANT_SLUG || "tania";

const isBrowser = () => typeof window !== "undefined";

/** Persiste o tenant retornado pelo login/resolve. */
export function setTenant(tenantId?: string, tenantSlug?: string): void {
  if (!isBrowser()) return;
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  if (tenantId) localStorage.setItem(TENANT_ID_KEY, tenantId);
  if (tenantSlug) localStorage.setItem(TENANT_SLUG_KEY, tenantSlug);
}

/** Limpa o tenant persistido (logout). */
export function clearTenant(): void {
  if (!isBrowser()) return;
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(TENANT_ID_KEY);
  localStorage.removeItem(TENANT_SLUG_KEY);
}

function getTenantId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(TENANT_ID_KEY);
}

function getTenantSlug(): string {
  if (!isBrowser()) return DEFAULT_TENANT_SLUG;
  return localStorage.getItem(TENANT_SLUG_KEY) || DEFAULT_TENANT_SLUG;
}

/**
 * Valor do header `X-Tenant-Id`.
 * Prefere o UUID (mais específico); cai para o slug antes do login.
 */
export function getTenantHeaderValue(): string {
  return getTenantId() || getTenantSlug();
}


