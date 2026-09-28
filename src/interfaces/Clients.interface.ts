/**
 * Shape "de tela" do cliente (legado) — mantido para não quebrar os componentes
 * atuais, mas alinhado aos DTOs do backend.
 *
 * ⚠️ Em código novo prefira os tipos estritos de
 * `@/interfaces/client/Client.interface` (ClientDetails, ClientListItem,
 * ClientCreateRequest…), que usam chaves de enum tipadas.
 *
 * Alinhamentos com o backend:
 * - Tempo de contribuição são três números (`contributionYears`,
 *   `contributionMonths`, `contributionDays`). `contributionTime` e
 *   `contributionInMonths` são derivados no backend e só vêm na resposta.
 * - Campos que a API pode não retornar viraram opcionais.
 * - Adicionados os campos novos do ClientDetailsDTO.
 */

export interface Clients {
  /**
   * Id do cliente.
   *
   * ⚠️ A API **não** manda `id` para o recurso cliente: manda `clientId`
   * (commit `e142a83`, "trocar id por clientId no id próprio do cliente").
   * Sub-recursos — endereço, entrevista, pagamento, arquivo, histórico —
   * seguem com `id` próprio; quem mudou foi só o id DO CLIENTE.
   *
   * Este `id` continua existindo porque é o que a tela inteira usa. Quem o
   * preenche é `normalizarCliente`, no `clientService` — a camada que já
   * traduz contrato em shape de tela.
   */
  id?: string;
  /** Como a API chama o campo hoje. Mantido para quem preferir o nome do contrato. */
  clientId?: string;
  age?: number;
  benefit: string;
  beneficiaryNumber?: string;
  birthDate: string;
  contributionYears?: number;
  contributionMonths?: number;
  contributionDays?: number;
  /** Derivado no backend: "33 anos, 11 meses e 5 dias". Só leitura. */
  contributionTime?: string;
  /** Derivado no backend a partir dos três acima. Só leitura. */
  contributionInMonths?: number;
  cpf: string;
  createdAt?: string;
  createdBy?: string | null;
  ctps?: string;
  ctpsSeries?: string;
  email?: string;
  firstName?: string;
  fullName: string;
  gender: string;
  inssPassword?: string;
  lastName?: string;
  maritalStatus?: string;
  mobilePhone: string;
  motherName: string;
  nitPis?: string;
  notBillable?: boolean;
  profession?: string;
  referencePhone?: string;
  referenceResponsible?: string;
  rg?: string;
  situation: string;
  updatedAt?: string;

  // ── Campos adicionados no backend ──
  rgIssuer?: string;
  rgIssueDate?: string;
  nationality?: string;
  isWhatsapp?: boolean;
  hasDisability?: boolean;
  notes?: string;
  responsibleUserId?: string;
  /** VERIFICADO | POTENCIAL */
  clientType?: string;
  updatedBy?: string;
}

/** Filtros da listagem — espelha os @RequestParam de GET /api/v1/clients. */
export interface ClientFilterOptions {
  searchTerm?: string;
  pageNumber?: number;
  pageSize?: number;
  benefitType?: string[];
  situation?: string[];
  clientType?: string[];
  createdFrom?: string;
  createdTo?: string;
}
