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

  /**
   * /api/v1/users — quem trabalha no escritório.
   *
   * Existe para uma coisa só: traduzir em nome os ids que os demais recursos
   * devolvem (`createdBy`, `updatedBy`, `responsibleUserId`, e o
   * `changedByUserId` do histórico de situação). Não expõe e-mail nem
   * credencial — não é um diretório de contatos.
   *
   * Restrita a ADMIN/LAWYER (`@RequerAdvogado`): ver `podeListarUsuarios`.
   */
  USERS: {
    /** GET ?includeInactive= — lista completa, ordenada por nome, sem paginação. */
    LIST: `${API_V1}/users`,
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
    /**
     * GET — a senha do INSS do cliente. Rota separada de propósito: a senha
     * saiu de `GET /clients/{id}` porque voltar em toda abertura de ficha a
     * levava para log de acesso, cache de navegador e print de tela.
     *
     * Restrita a ADMIN/LAWYER e **auditada**: cada chamada grava quem consultou
     * e quando. Chame só quando o usuário pedir, nunca ao montar a tela.
     */
    INSS_PASSWORD: (clientId: string) =>
      `${API_V1}/clients/${clientId}/inss-password`,
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
    /**
     * POST — de 1 a 10 endereços numa transação só: se um falhar, nenhum é
     * gravado. É o caminho do cadastro, onde a pessoa preenche até três abas
     * de uma vez; um POST por endereço deixaria a ficha pela metade quando o
     * segundo falhasse.
     *
     * Devolve os criados na ordem enviada. Se mais de um item pedir
     * `isPrimary`, vale o último — a ordem da lista decide.
     */
    CREATE_BATCH: (clientId: string) =>
      `${API_V1}/clients/${clientId}/addresses/batch`,
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

  /**
   * /api/v1/payments — recebimentos consolidados do escritório.
   *
   * ⚠️ Ainda NÃO implementado no backend. Ver
   * `docs/ESPEC_FINANCEIRO.md`. Tenant-scoped como todo o resto (o
   * `X-Tenant-Id` vai pelo axiosService); não fica sob /clients porque a visão
   * é do escritório, não de um cliente.
   */
  /**
   * /api/v1/expenses — despesas do escritório.
   *
   * ⚠️ NÃO existe no backend: nem tabela, nem migration, nem DTO. É o domínio
   * `financial` do ADR-0003. Contrato em `docs/ESPEC_FINANCEIRO.md`.
   */
  EXPENSES: {
    BASE: `${API_V1}/expenses`,
    LIST: `${API_V1}/expenses`,
    CREATE: `${API_V1}/expenses`,
    SUMMARY: `${API_V1}/expenses/summary`,
    TIMELINE: `${API_V1}/expenses/timeline`,
    BY_ID: (expenseId: string) => `${API_V1}/expenses/${expenseId}`,
    UPDATE: (expenseId: string) => `${API_V1}/expenses/${expenseId}`,
    DELETE: (expenseId: string) => `${API_V1}/expenses/${expenseId}`,
  },

  /**
   * Receita do escritório — honorários.
   *
   * ⚠️ Não existe no backend. E não é `PAYMENTS`: aquele agrega
   * `client_payments`, que guarda o que o **INSS paga ao cliente**. Honorário
   * é dinheiro do escritório e precisa de tabela própria.
   */
  REVENUES: {
    BASE: `${API_V1}/revenues`,
    LIST: `${API_V1}/revenues`,
    CREATE: `${API_V1}/revenues`,
    SUMMARY: `${API_V1}/revenues/summary`,
    TIMELINE: `${API_V1}/revenues/timeline`,
    BY_ID: (revenueId: string) => `${API_V1}/revenues/${revenueId}`,
    UPDATE: (revenueId: string) => `${API_V1}/revenues/${revenueId}`,
    DELETE: (revenueId: string) => `${API_V1}/revenues/${revenueId}`,
  },

  PAYMENTS: {
    BASE: `${API_V1}/payments`,
    /** GET — paginado, filtros por status, método, vencimento e cliente. */
    LIST: `${API_V1}/payments`,
    /** GET — totais do período (não dá para somar página paginada). */
    SUMMARY: `${API_V1}/payments/summary`,
    /** GET — série mensal, para o gráfico de pipeline. */
    TIMELINE: `${API_V1}/payments/timeline`,
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

  /**
   * /api/v1/appointments — agenda do escritório (AppointmentController).
   * Top-level e tenant-scoped: NÃO fica sob /clients, mesmo quando o
   * compromisso tem `clientId`.
   */
  APPOINTMENTS: {
    BASE: `${API_V1}/appointments`,
    /** POST — nasce com status "Agendado". */
    CREATE: `${API_V1}/appointments`,
    /** GET — paginado, ordenado por início (asc). Filtros em AppointmentListRequest. */
    LIST: `${API_V1}/appointments`,
    /** GET ?year= — contagem por mês (exclui cancelados); alimenta as abas. */
    SUMMARY: `${API_V1}/appointments/summary`,
    /**
     * GET ?startAt=&endAt=&excludeId= — compromissos agendados que ocupam a
     * mesma faixa. **Avisa, não bloqueia**: o POST e o PUT não recusam por
     * conflito.
     */
    CONFLICTS: `${API_V1}/appointments/conflicts`,
    BY_ID: (appointmentId: string) => `${API_V1}/appointments/${appointmentId}`,
    /** PUT — substituição completa; exige `justification`. */
    UPDATE: (appointmentId: string) => `${API_V1}/appointments/${appointmentId}`,
    /** PATCH — exige `justification`. */
    CANCEL: (appointmentId: string) =>
      `${API_V1}/appointments/${appointmentId}/cancel`,
    /**
     * PATCH — corpo opcional `{ earlyCompletionAcknowledged }`.
     *
     * Concluir compromisso cujo início ainda não chegou devolve 422
     * `EARLY_COMPLETION_NOT_CONFIRMED`: a UI pergunta e repete com a
     * confirmação. Para compromisso já iniciado o corpo é dispensável.
     */
    COMPLETE: (appointmentId: string) =>
      `${API_V1}/appointments/${appointmentId}/complete`,
    /** DELETE — soft delete (204 sem corpo). */
    DELETE: (appointmentId: string) => `${API_V1}/appointments/${appointmentId}`,
    /** GET — paginado, mais recente primeiro. */
    HISTORY: (appointmentId: string) =>
      `${API_V1}/appointments/${appointmentId}/history`,
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
