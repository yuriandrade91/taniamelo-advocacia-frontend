/**
 * Mapa central de endpoints da API (backend Spring — taniamelo-advocacia-backend).
 *
 * Base real: `${API_BASE_URL}/api/v1/...`
 * Ver `docs/BACKEND_PANORAMA.md` para o contrato completo.
 *
 * ⚠️ Toda requisição exige o header `X-Tenant-Id` (multi-tenancy) — injetado
 * automaticamente pelo `axiosService`.
 */

// Prefira NEXT_PUBLIC_API_URL (definido no .env). Fallback seguro para dev local.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";
const API_V1 = `${API_BASE_URL}/api/v1`;

const endpoints = {
  /**
   * Autenticação. Exige `X-Tenant-Id` inclusive no login.
   * O refresh token trafega em cookie httpOnly (`withCredentials: true`).
   */
  AUTH: {
    /** POST — body `{ login, password }`. `login` aceita e-mail OU username. */
    LOGIN: `${API_V1}/auth/login`,
    /** POST — rotaciona o refresh token e devolve novo access token. */
    REFRESH: `${API_V1}/auth/refresh`,
    /** POST — revoga o refresh token e limpa o cookie. */
    LOGOUT: `${API_V1}/auth/logout`,
  },

  /** /api/v1/tenants — resolução de escritório (multi-tenancy). */
  TENANTS: {
    /** GET ?slug=tania — público. Traduz slug em tenantId (UUID). */
    RESOLVE: `${API_V1}/tenants/resolve`,
    /** GET — dados do escritório da sessão atual. */
    CURRENT: `${API_V1}/tenants/current`,
  },

  /** /api/v1/clients */
  CLIENTS: {
    BASE: `${API_V1}/clients`,
    CREATE: `${API_V1}/clients`, // POST
    /** GET — paginado. Filtros: searchTerm, benefitType[], situation[], createdFrom, createdTo */
    LIST: `${API_V1}/clients`,
    BY_ID: (clientId: string) => `${API_V1}/clients/${clientId}`, // GET
    UPDATE: (clientId: string) => `${API_V1}/clients/${clientId}`, // PUT
    PATCH: (clientId: string) => `${API_V1}/clients/${clientId}`, // PATCH
    DELETE: (clientId: string) => `${API_V1}/clients/${clientId}`, // DELETE
    SITUATION_HISTORY: (clientId: string) =>
      `${API_V1}/clients/${clientId}/situation-history`, // GET (paginado)
  },

  /** /api/v1/clients/{clientId}/personal-data */
  CLIENT_PERSONAL_DATA: {
    GET: (clientId: string) => `${API_V1}/clients/${clientId}/personal-data`,
    UPDATE: (clientId: string) => `${API_V1}/clients/${clientId}/personal-data`,
  },

  /** /api/v1/clients/{clientId}/professional-data */
  CLIENT_PROFESSIONAL_DATA: {
    GET: (clientId: string) =>
      `${API_V1}/clients/${clientId}/professional-data`,
    UPDATE: (clientId: string) =>
      `${API_V1}/clients/${clientId}/professional-data`,
  },

  /** /api/v1/clients/{clientId}/addresses */
  CLIENT_ADDRESSES: {
    LIST: (clientId: string) => `${API_V1}/clients/${clientId}/addresses`,
    CREATE: (clientId: string) => `${API_V1}/clients/${clientId}/addresses`,
    BY_ID: (clientId: string, addressId: string) =>
      `${API_V1}/clients/${clientId}/addresses/${addressId}`,
    UPDATE: (clientId: string, addressId: string) =>
      `${API_V1}/clients/${clientId}/addresses/${addressId}`,
    DELETE: (clientId: string, addressId: string) =>
      `${API_V1}/clients/${clientId}/addresses/${addressId}`,
  },

  /** /api/v1/clients/{clientId}/interviews */
  CLIENT_INTERVIEWS: {
    LIST: (clientId: string) => `${API_V1}/clients/${clientId}/interviews`,
    CREATE: (clientId: string) => `${API_V1}/clients/${clientId}/interviews`,
    BY_ID: (clientId: string, interviewId: string) =>
      `${API_V1}/clients/${clientId}/interviews/${interviewId}`,
    UPDATE: (clientId: string, interviewId: string) =>
      `${API_V1}/clients/${clientId}/interviews/${interviewId}`,
    DELETE: (clientId: string, interviewId: string) =>
      `${API_V1}/clients/${clientId}/interviews/${interviewId}`,
  },

  /** /api/v1/clients/{clientId}/payments */
  CLIENT_PAYMENTS: {
    LIST: (clientId: string) => `${API_V1}/clients/${clientId}/payments`,
    CREATE: (clientId: string) => `${API_V1}/clients/${clientId}/payments`,
    BY_ID: (clientId: string, paymentId: string) =>
      `${API_V1}/clients/${clientId}/payments/${paymentId}`,
    PATCH: (clientId: string, paymentId: string) =>
      `${API_V1}/clients/${clientId}/payments/${paymentId}`,
    DELETE: (clientId: string, paymentId: string) =>
      `${API_V1}/clients/${clientId}/payments/${paymentId}`,
  },

  /** /api/v1/clients/{clientId}/files — documentos e simulações (multipart) */
  CLIENT_FILES: {
    UPLOAD_DOCUMENTS: (clientId: string) =>
      `${API_V1}/clients/${clientId}/files/documents`,
    LIST_DOCUMENTS: (clientId: string) =>
      `${API_V1}/clients/${clientId}/files/documents`,
    GET_DOCUMENT: (clientId: string, fileId: string) =>
      `${API_V1}/clients/${clientId}/files/documents/${fileId}`,
    UPDATE_DOCUMENT: (clientId: string, fileId: string) =>
      `${API_V1}/clients/${clientId}/files/documents/${fileId}`,

    UPLOAD_SIMULATIONS: (clientId: string) =>
      `${API_V1}/clients/${clientId}/files/simulations`,
    LIST_SIMULATIONS: (clientId: string) =>
      `${API_V1}/clients/${clientId}/files/simulations`,
    GET_SIMULATION: (clientId: string, fileId: string) =>
      `${API_V1}/clients/${clientId}/files/simulations/${fileId}`,
    UPDATE_SIMULATION: (clientId: string, fileId: string) =>
      `${API_V1}/clients/${clientId}/files/simulations/${fileId}`,
    SET_SIMULATION_PRINCIPAL: (clientId: string, fileId: string) =>
      `${API_V1}/clients/${clientId}/files/simulations/${fileId}/principal`,

    DOWNLOAD: (clientId: string, fileId: string) =>
      `${API_V1}/clients/${clientId}/files/${fileId}/download`,
    DELETE: (clientId: string, fileId: string) =>
      `${API_V1}/clients/${clientId}/files/${fileId}`,
  },
} as const;

/**
 * Aliases de compatibilidade com o código legado (`URL_CLIENTS`, `AUTH.POST_LOGIN`),
 * já apontando para os paths corretos (com `/api` e `/situation-history`).
 * TODO: migrar consumidores para `endpoints.CLIENTS` / `endpoints.AUTH.LOGIN`.
 */
const endpointsWithLegacy = {
  ...endpoints,
  AUTH: {
    ...endpoints.AUTH,
    POST_LOGIN: endpoints.AUTH.LOGIN,
  },
  URL_CLIENTS: {
    CLIENT: endpoints.CLIENTS.BASE,
    BY_ID: endpoints.CLIENTS.BY_ID,
    SITUATION_HISTORY: endpoints.CLIENTS.SITUATION_HISTORY,
  },
};

export { API_BASE_URL, API_V1 };
export default endpointsWithLegacy;
