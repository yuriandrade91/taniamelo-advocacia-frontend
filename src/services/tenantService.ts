import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  TenantPublic,
  TenantResponse,
} from "@/interfaces/tenant/Tenant.interface";
import { setTenant } from "@/lib/tenant";

/** Tenant (escritório) — espelha TenantController. */

/**
 * GET /api/v1/tenants/resolve?slug=... — público (sem auth).
 * Traduz o slug no tenantId (UUID) e persiste para as chamadas seguintes.
 */
export const resolveTenant = async (
  slug: string,
): Promise<ApiEnvelope<TenantPublic>> => {
  const response = await axiosInstance.get<ApiEnvelope<TenantPublic>>(
    endpoints.TENANTS.RESOLVE,
    { params: { slug } },
  );

  const data = response.data?.data;
  if (data?.tenantId) {
    setTenant(data.tenantId, data.slug);
  }

  return response.data;
};

/** GET /api/v1/tenants/current — dados do escritório da sessão. */
export const currentTenant = async (): Promise<ApiEnvelope<TenantResponse>> => {
  const response = await axiosInstance.get<ApiEnvelope<TenantResponse>>(
    endpoints.TENANTS.CURRENT,
  );
  return response.data;
};
