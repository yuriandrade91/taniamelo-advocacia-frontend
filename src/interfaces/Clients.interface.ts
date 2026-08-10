/**
 * Shape "de tela" do cliente (legado) — mantido para não quebrar os componentes
 * atuais, mas alinhado aos DTOs do backend.
 *
 * ⚠️ Em código novo prefira os tipos estritos de
 * `@/interfaces/client/Client.interface` (ClientDetails, ClientListItem,
 * ClientCreateRequest…), que usam chaves de enum tipadas.
 *
 * Alinhamentos com o backend:
 * - `contributionTime` era `number`; no backend é texto livre (String).
 *   O campo numérico equivalente é `contributionInMonths`.
 * - Campos que a API pode não retornar viraram opcionais.
 * - Adicionados os campos novos do ClientDetailsDTO.
 */

export interface Clients {
  id?: string;
  age?: number;
  benefit: string;
  beneficiaryNumber?: string;
  birthDate: string;
  /** Texto livre no backend (ex.: "10 anos, 2 meses"). */
  contributionTime?: string;
  /** Campo numérico derivado no backend. */
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
  createdFrom?: string;
  createdTo?: string;
}
