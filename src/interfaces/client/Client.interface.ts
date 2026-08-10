/**
 * Cliente — espelha ClientDetailsDTO, ClientListResponseDTO,
 * ClientCreateRequestDTO, ClientUpdateRequestDTO, ClientPatchRequestDTO.
 *
 * Convenções: LocalDate → "yyyy-MM-dd" · Instant → ISO 8601 · UUID → string.
 *
 * ⚠️ ENUMS: o backend usa `@JsonValue` (getLabel) e `@JsonCreator` (fromLabel).
 * Logo:
 * - **Respostas** trazem o LABEL PT-BR (ex.: "Aposentadoria rural") → tipos `*Label`.
 * - **Requisições** aceitam o nome da constante OU o label → tipos `*Input`.
 */
import type { BenefitLabel, BenefitInput } from "@/enums/benefit/Benefits";
import type { SituationLabel, SituationInput } from "@/enums/situation/Situation";
import type { GenderLabel, GenderInput } from "@/enums/gender/Gender";
import type {
  ClientTypeLabel,
  ClientTypeInput,
} from "@/enums/clientType/ClientType";
import type {
  MaritalStatusLabel,
  MaritalStatusInput,
} from "@/enums/maritalStatus/MaritalStatus";

/** GET /api/v1/clients/{id} */
export interface ClientDetails {
  id: string;
  fullName: string;
  birthDate: string;
  age?: number;
  cpf: string;
  motherName: string;
  mobilePhone: string;
  inssPassword?: string;
  gender: GenderLabel;
  rg?: string;
  rgIssuer?: string;
  rgIssueDate?: string;
  email?: string;
  referencePhone?: string;
  referenceResponsible?: string;
  maritalStatus?: MaritalStatusLabel;
  benefit: BenefitLabel;
  situation: SituationLabel;
  beneficiaryNumber?: string;
  nitPis?: string;
  profession?: string;
  ctps?: string;
  ctpsSeries?: string;
  /** Texto livre no backend (ex.: "10 anos, 2 meses"). */
  contributionTime?: string;
  contributionInMonths?: number;
  nationality?: string;
  isWhatsapp?: boolean;
  hasDisability?: boolean;
  notes?: string;
  responsibleUserId?: string;
  clientType?: ClientTypeLabel;
  notBillable?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/** GET /api/v1/clients — linha da listagem. */
export interface ClientListItem {
  id: string;
  fullName: string;
  cpf: string;
  mobilePhone?: string;
  benefit?: BenefitLabel;
  situation?: SituationLabel;
  clientType?: ClientTypeLabel;
  beneficiaryNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** POST /api/v1/clients — campos obrigatórios conforme validação do backend. */
export interface ClientCreateRequest {
  fullName: string;
  birthDate: string;
  cpf: string;
  motherName: string;
  mobilePhone: string;
  inssPassword: string;
  gender: GenderInput;
  benefit: BenefitInput;
  situation: SituationInput;
  rg?: string;
  rgIssuer?: string;
  rgIssueDate?: string;
  email?: string;
  referencePhone?: string;
  referenceResponsible?: string;
  maritalStatus?: MaritalStatusInput;
  beneficiaryNumber?: string;
  nitPis?: string;
  profession?: string;
  ctps?: string;
  ctpsSeries?: string;
  contributionTime?: string;
  nationality?: string;
  isWhatsapp?: boolean;
  hasDisability?: boolean;
  notes?: string;
  responsibleUserId?: string;
  clientType?: ClientTypeInput;
  notBillable?: boolean;
}

/** PUT /api/v1/clients/{id} — mesmo shape do create. */
export type ClientUpdateRequest = ClientCreateRequest;

/** PATCH /api/v1/clients/{id} — atualização parcial. */
export interface ClientPatchRequest {
  situation?: SituationInput;
  benefit?: BenefitInput;
  clientType?: ClientTypeInput;
  notBillable?: boolean;
}

/** Resposta de PATCH/DELETE. */
export interface ClientPatchResponse {
  id?: string;
  message?: string;
  [key: string]: unknown;
}

/** GET /api/v1/clients/{id}/situation-history */
export interface ClientSituationHistory {
  id: string;
  currentSituation: string;
  changedAt: string;
  changedByUserId?: string;
}

/** Query params de GET /api/v1/clients (paginação 1-based). */
export interface ClientListRequest {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  benefitType?: string[];
  situation?: string[];
  createdFrom?: string;
  createdTo?: string;
}
