import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type { Office, TenantPublic } from "@/interfaces/tenant/Tenant.interface";
import { FILE_TRANSFER_TIMEOUT_MS } from "@/services/clientFileService";
import { feedback, type RequestFeedback } from "@/services/requestFeedback";

/**
 * O escritório — TenantController. Base: /api/v1/tenants
 *
 * A logo é um arquivo, como os do cliente: multipart sem Content-Type à mão
 * (o navegador gera o boundary).
 */

/**
 * GET /tenants/resolve?slug= — público, sem tela esperando por ele: quem
 * pergunta é a marca (`useOfficeLogo`), que segue com a padrão se a resposta
 * não vier. Por isso sem toast de erro.
 */
export const resolveTenant = async (slug: string): Promise<TenantPublic | null> => {
  const { data } = await axiosInstance.get<ApiEnvelope<TenantPublic>>(endpoints.TENANTS.RESOLVE, {
    params: { slug },
    skipErrorToast: true,
  });
  return data?.data ?? null;
};

/** GET /tenants/current — o escritório da sessão. */
export const currentOffice = async (): Promise<ApiEnvelope<Office>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<Office>>(endpoints.TENANTS.CURRENT);
  return data;
};

/** PUT /tenants/current/logo — devolve o escritório com o `logoUrl` novo. */
export const uploadOfficeLogo = async (
  file: File,
  options?: RequestFeedback,
): Promise<ApiEnvelope<Office>> => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await axiosInstance.put<ApiEnvelope<Office>>(endpoints.TENANTS.CURRENT_LOGO, formData, {
    headers: { "Content-Type": undefined },
    timeout: FILE_TRANSFER_TIMEOUT_MS,
    ...feedback("Logo do escritório atualizada.", options),
  });
  return data;
};

/** DELETE /tenants/current/logo — as telas voltam à marca padrão. */
export const removeOfficeLogo = async (options?: RequestFeedback): Promise<void> => {
  await axiosInstance.delete(endpoints.TENANTS.CURRENT_LOGO, feedback("Marca padrão restaurada.", options));
};
