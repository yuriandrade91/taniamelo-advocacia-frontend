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
  /**
   * A API manda `clientId` (rename `e142a83`); `clientService` preenche `id`
   * a partir dele para o resto da aplicação, que lê `id`.
   */
  clientId?: string;
  id: string;
  fullName: string;
  birthDate: string;
  age?: number;
  cpf: string;
  motherName: string;
  mobilePhone: string;
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
  contributionYears?: number;
  contributionMonths?: number;
  contributionDays?: number;
  /** Derivado no backend: "33 anos, 11 meses e 5 dias". Só leitura. */
  contributionTime?: string;
  /** Derivado no backend a partir dos três acima. Só leitura. */
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

/**
 * GET /api/v1/clients — linha da listagem.
 *
 * A API manda `clientId`; `id` é preenchido pelo `clientService` para o resto
 * da aplicação, que lê `id`. Os dois ficam declarados porque os dois chegam à
 * tela — tipar só `id` esconderia que o campo que vem da rede tem outro nome,
 * e é assim que um consumidor novo volta a receber `undefined`.
 */
export interface ClientListItem {
  clientId?: string;
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
  /**
   * Preenchido só na lixeira (`GET /clients/deleted`). Na listagem normal o
   * backend nunca traz cliente excluído, então aqui vem sempre nulo — e um
   * valor preenchido na listagem normal é defeito, não estado.
   */
  deletedAt?: string | null;
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
  contributionYears?: number;
  contributionMonths?: number;
  contributionDays?: number;
  nationality?: string;
  isWhatsapp?: boolean;
  hasDisability?: boolean;
  notes?: string;
  responsibleUserId?: string;
  clientType?: ClientTypeInput;
  notBillable?: boolean;
}

/** PUT /api/v1/clients/{id} — mesmo shape do create. */
/**
 * PUT /api/v1/clients/{id}.
 *
 * Igual ao create, com uma diferença que importa: `inssPassword` é OPCIONAL.
 * A senha não volta mais no GET, então o formulário não a tem em mãos para
 * devolver — ausente significa "mantém a que está gravada". Enviar string
 * vazia tem o mesmo efeito (o backend ignora em branco), mas só mande o campo
 * quando o usuário realmente digitou uma senha nova.
 */
export type ClientUpdateRequest = Omit<ClientCreateRequest, "inssPassword"> & {
  inssPassword?: string;
};

/** GET /api/v1/clients/{id}/inss-password — leitura auditada, só ADMIN/LAWYER. */
export interface ClientInssPassword {
  inssPassword: string;
}

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

/**
 * GET /api/v1/clients/{id}/situation-history — uma linha por mudança.
 *
 * `previousSituation` e `retrocesso` passaram a existir quando o funil ganhou
 * ordem: com os dois, a linha do tempo diz "de X para Y" e marca quem voltou
 * uma etapa, que é o caso que o escritório quer enxergar. Sem eles, restava
 * "passou para X" — verdadeiro e quase inútil.
 *
 * `retrocesso` é calculado no backend pela posição das duas situações no
 * funil; não o recalcule na tela, ou a regra passa a existir em dois lugares
 * e um deles vai ficar para trás.
 */
export interface ClientSituationHistory {
  id: string;
  currentSituation: string;
  /** Ausente na primeira linha: o cadastro não tem situação anterior. */
  previousSituation?: string | null;
  /** `true` quando a mudança voltou uma etapa no funil. */
  retrocesso?: boolean;
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
  /** `VERIFICADO` / `POTENCIAL` — nome da constante ou label, como os demais. */
  clientType?: string[];
  createdFrom?: string;
  createdTo?: string;
}
