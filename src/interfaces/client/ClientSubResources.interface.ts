/**
 * Sub-recursos do cliente — endereços, entrevistas, pagamentos,
 * dados pessoais/profissionais e arquivos.
 * Espelha os DTOs correspondentes do backend.
 */
import type {
  AddressTypeLabel,
  AddressTypeInput,
} from "@/enums/addressType/AddressType";
import type { GenderLabel, GenderInput } from "@/enums/gender/Gender";
import type {
  MaritalStatusLabel,
  MaritalStatusInput,
} from "@/enums/maritalStatus/MaritalStatus";
import type {
  DocumentTypeLabel,
  DocumentTypeInput,
} from "@/enums/documentType/DocumentType";
import type {
  PaymentMethodLabel,
  PaymentMethodInput,
  PaymentStatusLabel,
  PaymentStatusInput,
} from "@/enums/payment/Payment";

// ─────────────── Endereços ───────────────

export interface ClientAddressRequest {
  addressType?: AddressTypeInput;
  street: string;
  addressNumber?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode?: string;
  isPrimary?: boolean;
}

export interface ClientAddressResponse
  extends Omit<ClientAddressRequest, "addressType"> {
  id: string;
  /** A API devolve o label (@JsonValue). */
  addressType?: AddressTypeLabel;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

// ─────────────── Entrevistas ───────────────

export interface ClientInterviewRequest {
  /** ISO 8601. */
  occurredAt?: string;
  /** Deve ser positivo. */
  durationMinutes?: number;
  content: string;
}

export interface ClientInterviewResponse extends ClientInterviewRequest {
  id: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

// ─────────────── Pagamentos ───────────────

export interface ClientPaymentRequest {
  description: string;
  /** BigDecimal no backend. */
  amount?: number;
  installmentNumber?: number;
  installmentTotal?: number;
  /** "yyyy-MM-dd". */
  dueDate: string;
  paymentMethod?: PaymentMethodInput;
  notes?: string;
}

/** PATCH — atualização parcial (ex.: marcar como pago). */
export type ClientPaymentUpdateRequest = Partial<ClientPaymentRequest> & {
  status?: PaymentStatusInput;
  paidDate?: string;
};

export interface ClientPaymentResponse {
  id: string;
  description: string;
  amount?: number;
  installmentNumber?: number;
  installmentTotal?: number;
  dueDate: string;
  paidDate?: string;
  /** A API devolve o label (@JsonValue). */
  status?: PaymentStatusLabel;
  paymentMethod?: PaymentMethodLabel;
  notes?: string;
  /** Calculado no backend. */
  overdue: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

// ─────────────── Dados pessoais ───────────────

export interface ClientPersonalDataResponse {
  /**
   * Id do CLIENTE (a aba não tem id próprio). A API manda `clientId` desde o
   * rename `e142a83`; `id` fica como opcional para não quebrar quem já lia
   * assim durante a transição.
   */
  clientId: string;
  id?: string;
  fullName: string;
  birthDate?: string;
  age?: number;
  cpf: string;
  rg?: string;
  rgIssuer?: string;
  rgIssueDate?: string;
  motherName?: string;
  /** A API devolve o label (@JsonValue). */
  gender?: GenderLabel;
  maritalStatus?: MaritalStatusLabel;
  nationality?: string;
  mobilePhone?: string;
  isWhatsapp?: boolean;
  referencePhone?: string;
  referenceResponsible?: string;
  email?: string;
  hasDisability?: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export type ClientPersonalDataRequest = Omit<
  ClientPersonalDataResponse,
  // `clientId` vai na URL, não no corpo.
  "clientId" | "id" | "age" | "updatedBy" | "updatedAt" | "gender" | "maritalStatus"
> & {
  gender?: GenderInput;
  maritalStatus?: MaritalStatusInput;
};

// ─────────────── Dados profissionais ───────────────

export interface ClientProfessionalDataResponse {
  /**
   * Id do CLIENTE (a aba não tem id próprio). A API manda `clientId` desde o
   * rename `e142a83`; `id` fica como opcional para não quebrar quem já lia
   * assim durante a transição.
   */
  clientId: string;
  id?: string;
  profession?: string;
  nitPis?: string;
  ctps?: string;
  ctpsSeries?: string;
  contributionYears?: number;
  contributionMonths?: number;
  contributionDays?: number;
  /** Derivado no backend: "33 anos, 11 meses e 5 dias". Só leitura. */
  contributionTime?: string;
  /** Derivado no backend a partir dos três acima. Só leitura. */
  contributionInMonths?: number;
  beneficiaryNumber?: string;
  // `inssPassword` NÃO vem aqui: saiu da resposta junto com o GET da ficha.
  // Para lê-la, `clientService.revealInssPassword` — que é auditado.
  updatedBy?: string;
  updatedAt?: string;
}

/**
 * PUT da aba profissional.
 *
 * `inssPassword` volta a existir aqui (some só da RESPOSTA) e é opcional:
 * ausente significa "mantém a que está gravada". Sem isso, salvar a aba depois
 * que a senha saiu do GET apagaria o acesso do cliente ao INSS — em silêncio.
 */
export type ClientProfessionalDataRequest = Omit<
  ClientProfessionalDataResponse,
  // `clientId` vai na URL, não no corpo.
  "clientId" | "id" | "updatedBy" | "updatedAt"
> & {
  inssPassword?: string;
};

// ─────────────── Arquivos ───────────────

export interface ClientFileDocumentResponse {
  id: string;
  /** A API devolve o label (@JsonValue). */
  documentType?: DocumentTypeLabel;
  originalFilename: string;
  mimeType?: string;
  fileSizeBytes?: number;
  notes?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  downloadUrl?: string;
}

export interface ClientFileDocumentUpdateRequest {
  documentType?: DocumentTypeInput;
  notes?: string;
}

export interface ClientFileSimulationResponse {
  id: string;
  originalFilename: string;
  mimeType?: string;
  fileSizeBytes?: number;
  /** "yyyy-MM-dd". */
  simulationDate?: string;
  version?: string;
  vinculos?: number;
  isPrincipal?: boolean;
  notes?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  downloadUrl?: string;
}

export interface ClientFileSimulationUpdateRequest {
  simulationDate?: string;
  version?: string;
  vinculos?: number;
  isPrincipal?: boolean;
  notes?: string;
}

/** Limites de upload do backend (spring.servlet.multipart). */
export const UPLOAD_LIMITS = {
  MAX_FILE_BYTES: 10 * 1024 * 1024, // 10MB por arquivo
  MAX_REQUEST_BYTES: 60 * 1024 * 1024, // 60MB por requisição (lote)
} as const;
