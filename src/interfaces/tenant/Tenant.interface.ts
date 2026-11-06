/**
 * O escritório (tenant) — espelha os DTOs do `TenantController`.
 *
 * `logoUrl` é um caminho na API (`/api/v1/tenants/logo?slug=…&v=…`), não uma
 * URL completa, e vem nulo enquanto o escritório usa a marca padrão.
 */

/** O que o backend diz antes do login — espelha `TenantPublicDTO`. */
export interface TenantPublic {
  tenantId: string;
  slug: string;
  razaoSocial: string;
  logoUrl?: string | null;
}

/** O escritório da sessão — espelha `TenantResponseDTO`. */
export interface Office {
  id: string;
  slug: string;
  razaoSocial: string;
  cnpj: string;
  responsavel?: string | null;
  email?: string | null;
  telefone?: string | null;
  plano?: string | null;
  status: string;
  criadoEm?: string;
  atualizadoEm?: string | null;
  logoUrl?: string | null;
}
