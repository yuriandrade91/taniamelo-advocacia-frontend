/**
 * Multi-tenancy — espelha TenantPublicDTO / TenantResponseDTO.
 * O header `X-Tenant-Id` usa o identificador público (slug ou UUID).
 */

/** GET /api/v1/tenants/resolve?slug=... — público. */
export interface TenantPublic {
  tenantId: string;
  slug: string;
  razaoSocial: string;
}

/** GET /api/v1/tenants/current — escritório da sessão. */
export interface TenantResponse {
  id: string;
  slug: string;
  razaoSocial: string;
  cnpj?: string;
  responsavel?: string;
  email?: string;
  telefone?: string;
  plano?: string;
  status?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}
