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

/** Recurso de primeiro nível: `/api/v1/{name}` e `/api/v1/{name}/{id}`. */
const resource = (name: string) => {
  const base = `${API_V1}/${name}`;
  return { base, byId: (id: string) => `${base}/${id}` };
};

const auth = resource("auth");
const tenants = resource("tenants");
const users = resource("users");
const clients = resource("clients");
const expenses = resource("expenses");
const revenues = resource("revenues");
const payments = resource("payments");
const appointments = resource("appointments");

/** Sub-recurso de um cliente: `/clients/{clientId}/{name}` e `.../{id}`. */
const clientResource = (name: string) => {
  const base = (clientId: string) => `${clients.byId(clientId)}/${name}`;
  return {
    base,
    byId: (clientId: string, id: string) => `${base(clientId)}/${id}`,
  };
};

const addresses = clientResource("addresses");
const disabilityPeriods = clientResource("disability-periods");
const interviews = clientResource("interviews");
const clientPayments = clientResource("payments");
const files = clientResource("files");
const documents = clientResource("files/documents");
const simulations = clientResource("files/simulations");

const endpoints = {
  /**
   * Autenticação. Exige `X-Tenant-Id` inclusive no login.
   * O refresh token trafega em cookie httpOnly (`withCredentials: true`).
   */
  AUTH: {
    /** POST — body `{ login, password }`. `login` aceita e-mail OU username. */
    LOGIN: auth.byId("login"),
    /** POST — rotaciona o refresh token e devolve novo access token. */
    REFRESH: auth.byId("refresh"),
    /** POST — revoga o refresh token e limpa o cookie. */
    LOGOUT: auth.byId("logout"),
  },

  /** /api/v1/tenants — resolução de escritório (multi-tenancy). */
  TENANTS: {
    /** GET ?slug=tania — público. Traduz slug em tenantId (UUID). */
    RESOLVE: tenants.byId("resolve"),
    /** GET — dados do escritório da sessão atual. */
    CURRENT: tenants.byId("current"),
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
    LIST: users.base,
    /**
     * Os dados de quem está logado. Não aceita id: o servidor lê o usuário do
     * token. Rota aberta a qualquer papel — é a própria pessoa.
     */
    ME: users.byId("me"),
    ME_PASSWORD: `${users.byId("me")}/password`,
  },

  /** /api/v1/clients */
  CLIENTS: {
    BASE: clients.base,
    CREATE: clients.base, // POST
    /** GET — paginado. Filtros: searchTerm, benefitType[], situation[], createdFrom, createdTo */
    LIST: clients.base,
    BY_ID: clients.byId, // GET
    UPDATE: clients.byId, // PUT
    PATCH: clients.byId, // PATCH
    DELETE: clients.byId, // DELETE
    /** GET (paginado) */
    SITUATION_HISTORY: clientResource("situation-history").base,
    /**
     * GET — a senha do INSS do cliente. Rota separada de propósito: a senha
     * saiu de `GET /clients/{id}` porque voltar em toda abertura de ficha a
     * levava para log de acesso, cache de navegador e print de tela.
     *
     * Restrita a ADMIN/LAWYER e **auditada**: cada chamada grava quem consultou
     * e quando. Chame só quando o usuário pedir, nunca ao montar a tela.
     */
    INSS_PASSWORD: clientResource("inss-password").base,
  },

  /** /api/v1/clients/{clientId}/personal-data */
  CLIENT_PERSONAL_DATA: {
    GET: clientResource("personal-data").base,
    UPDATE: clientResource("personal-data").base,
  },

  /** /api/v1/clients/{clientId}/professional-data */
  CLIENT_PROFESSIONAL_DATA: {
    GET: clientResource("professional-data").base,
    UPDATE: clientResource("professional-data").base,
  },

  /** /api/v1/clients/{clientId}/addresses */
  CLIENT_ADDRESSES: {
    LIST: addresses.base,
    CREATE: addresses.base,
    /**
     * POST — de 1 a 10 endereços numa transação só: se um falhar, nenhum é
     * gravado. É o caminho do cadastro, onde a pessoa preenche até três abas
     * de uma vez; um POST por endereço deixaria a ficha pela metade quando o
     * segundo falhasse.
     *
     * Devolve os criados na ordem enviada. Se mais de um item pedir
     * `isPrimary`, vale o último — a ordem da lista decide.
     */
    CREATE_BATCH: (clientId: string) => `${addresses.base(clientId)}/batch`,
    BY_ID: addresses.byId,
    UPDATE: addresses.byId,
    DELETE: addresses.byId,
  },

  /** /api/v1/clients/{clientId}/disability-periods */
  CLIENT_DISABILITY_PERIODS: {
    /**
     * GET — todos os intervalos, do mais antigo para o mais recente.
     *
     * **Sem paginação**, ao contrário de `/addresses`: o cálculo da LC
     * 142/2013 soma a carreira inteira, e uma página daria um total errado com
     * cara de certo.
     */
    LIST: disabilityPeriods.base,
    CREATE: disabilityPeriods.base,
    /**
     * GET — o tempo convertido para uma base, com a conta aberta (um fator e um
     * resultado por intervalo). `?to=` escolhe o destino; o padrão é
     * `Sem deficiência`, a regra geral.
     */
    CONVERSION: (clientId: string) =>
      `${disabilityPeriods.base(clientId)}/conversion`,
    BY_ID: disabilityPeriods.byId,
    UPDATE: disabilityPeriods.byId,
    DELETE: disabilityPeriods.byId,
  },

  /** /api/v1/clients/{clientId}/interviews */
  CLIENT_INTERVIEWS: {
    LIST: interviews.base,
    CREATE: interviews.base,
    BY_ID: interviews.byId,
    UPDATE: interviews.byId,
    DELETE: interviews.byId,
  },

  /**
   * /api/v1/expenses — despesas do escritório (`OfficeExpenseController`,
   * tabela `office_expenses`). Metade das saídas da Carteira.
   */
  EXPENSES: {
    LIST: expenses.base,
    CREATE: expenses.base,
    SUMMARY: expenses.byId("summary"),
    TIMELINE: expenses.byId("timeline"),
    BY_ID: expenses.byId,
    UPDATE: expenses.byId,
    DELETE: expenses.byId,
  },

  /**
   * Receita do escritório — honorários (`OfficeRevenueController`).
   *
   * Não confundir com `PAYMENTS`: aquele agrega `client_payments`, que guarda
   * o que o **INSS paga ao cliente**. Honorário é dinheiro do escritório e tem
   * tabela própria (`office_revenues`).
   */
  REVENUES: {
    LIST: revenues.base,
    CREATE: revenues.base,
    SUMMARY: revenues.byId("summary"),
    TIMELINE: revenues.byId("timeline"),
    BY_ID: revenues.byId,
    UPDATE: revenues.byId,
    DELETE: revenues.byId,
  },

  /**
   * /api/v1/payments — o que os clientes têm a receber do INSS, consolidado.
   *
   * Somente leitura: criar e editar é `CLIENT_PAYMENTS`, porque uma parcela
   * pertence a um cliente. Não fica sob /clients porque a pergunta é do
   * escritório. **Não é receita** — ver `REVENUES`.
   */
  PAYMENTS: {
    /** GET — paginado, filtros por status, método, vencimento e cliente. */
    LIST: payments.base,
    /** GET — totais do período (não dá para somar página paginada). */
    SUMMARY: payments.byId("summary"),
    /** GET — série mensal, para o gráfico de pipeline. */
    TIMELINE: payments.byId("timeline"),
  },

  /** /api/v1/clients/{clientId}/payments */
  CLIENT_PAYMENTS: {
    LIST: clientPayments.base,
    CREATE: clientPayments.base,
    BY_ID: clientPayments.byId,
    PATCH: clientPayments.byId,
    DELETE: clientPayments.byId,
  },

  /**
   * /api/v1/appointments — agenda do escritório (AppointmentController).
   * Top-level e tenant-scoped: NÃO fica sob /clients, mesmo quando o
   * compromisso tem `clientId`.
   */
  APPOINTMENTS: {
    /** POST — nasce com status "Agendado". */
    CREATE: appointments.base,
    /** GET — paginado, ordenado por início (asc). Filtros em AppointmentListRequest. */
    LIST: appointments.base,
    /** GET ?year= — contagem por mês (exclui cancelados); alimenta as abas. */
    SUMMARY: appointments.byId("summary"),
    /**
     * GET ?startAt=&endAt=&excludeId= — compromissos agendados que ocupam a
     * mesma faixa. **Avisa, não bloqueia**: o POST e o PUT não recusam por
     * conflito.
     */
    CONFLICTS: appointments.byId("conflicts"),
    BY_ID: appointments.byId,
    /** PUT — substituição completa; exige `justification`. */
    UPDATE: appointments.byId,
    /** PATCH — exige `justification`. */
    CANCEL: (appointmentId: string) =>
      `${appointments.byId(appointmentId)}/cancel`,
    /**
     * PATCH — corpo opcional `{ earlyCompletionAcknowledged }`.
     *
     * Concluir compromisso cujo início ainda não chegou devolve 422
     * `EARLY_COMPLETION_NOT_CONFIRMED`: a UI pergunta e repete com a
     * confirmação. Para compromisso já iniciado o corpo é dispensável.
     */
    COMPLETE: (appointmentId: string) =>
      `${appointments.byId(appointmentId)}/complete`,
    /** DELETE — soft delete (204 sem corpo). */
    DELETE: appointments.byId,
    /** GET — paginado, mais recente primeiro. */
    HISTORY: (appointmentId: string) =>
      `${appointments.byId(appointmentId)}/history`,
  },

  /** /api/v1/clients/{clientId}/files — documentos e simulações (multipart) */
  CLIENT_FILES: {
    UPLOAD_DOCUMENTS: documents.base,
    LIST_DOCUMENTS: documents.base,
    GET_DOCUMENT: documents.byId,
    UPDATE_DOCUMENT: documents.byId,

    UPLOAD_SIMULATIONS: simulations.base,
    LIST_SIMULATIONS: simulations.base,
    GET_SIMULATION: simulations.byId,
    UPDATE_SIMULATION: simulations.byId,
    SET_SIMULATION_PRINCIPAL: (clientId: string, fileId: string) =>
      `${simulations.byId(clientId, fileId)}/principal`,

    DOWNLOAD: (clientId: string, fileId: string) =>
      `${files.byId(clientId, fileId)}/download`,
    DELETE: files.byId,
  },
} as const;

export { API_BASE_URL, API_V1 };
export default endpoints;
