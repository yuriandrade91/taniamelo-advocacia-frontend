/**
 * Multi-tenancy — resolução do escritório (tenant).
 *
 * O backend exige o header `X-Tenant-Id` em TODA requisição (inclusive login),
 * aceitando o **identificador público**: slug (ex.: "tania") ou UUID.
 * O nome do schema (`tenant_tania`) nunca trafega.
 *
 * Estratégia: antes do login usa `NEXT_PUBLIC_TENANT_SLUG`; depois do login usa
 * o `tenantId` (UUID) devolvido pela API.
 */

const TENANT_ID_KEY = "tenantId";
const TENANT_SLUG_KEY = "tenantSlug";

/** Slug padrão do ambiente (usado antes do login). */
export const DEFAULT_TENANT_SLUG =
  process.env.NEXT_PUBLIC_TENANT_SLUG || "tania";

const isBrowser = () => typeof window !== "undefined";

/** Persiste o tenant retornado pelo login/resolve. */
export function setTenant(tenantId?: string, tenantSlug?: string): void {
  if (!isBrowser()) return;
  if (tenantId) localStorage.setItem(TENANT_ID_KEY, tenantId);
  if (tenantSlug) localStorage.setItem(TENANT_SLUG_KEY, tenantSlug);
}

/** Limpa o tenant persistido (logout). */
export function clearTenant(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(TENANT_ID_KEY);
  localStorage.removeItem(TENANT_SLUG_KEY);
}

export function getTenantId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(TENANT_ID_KEY);
}

export function getTenantSlug(): string {
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

export { TENANT_ID_KEY, TENANT_SLUG_KEY };
