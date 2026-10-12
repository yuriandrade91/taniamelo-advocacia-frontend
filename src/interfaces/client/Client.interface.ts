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
import type { RequestStageLabel, RequestStageInput } from "@/enums/requestStage/RequestStage";
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
  /**
   * Etapa do requerimento no INSS — esteira paralela a `situation`. Nulo é
   * "ainda não foi ao INSS".
   */
  requestStage?: RequestStageLabel | null;
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
  /**
   * Etapa do requerimento no INSS — esteira paralela a `situation`. Nulo é
   * "ainda não foi ao INSS".
   */
  requestStage?: RequestStageLabel | null;
  clientType?: ClientTypeLabel;
  /** Isento do serviço (sem arrecadação) — o mesmo campo do filtro `?notBillable=`. */
  notBillable?: boolean;
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
  /** Anulável. No PUT, ausente **apaga** a etapa: a ficha devolve a gravada. */
  requestStage?: RequestStageInput | null;
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
  /** Muda só a etapa no INSS. Não há como voltar a nulo pelo PATCH (nulo = "não mexer"). */
  requestStage?: RequestStageInput;
  /**
   * Por que a etapa mudou (até 1000 caracteres). **Obrigatória** quando
   * `requestStage` leva a exigência, indeferimento ou recurso — sem ela, 400
   * `REQUIRED_FIELD`. Sozinha, sem `requestStage`, é 400 também. Vai para o
   * histórico da etapa.
   */
  requestStageJustification?: string;
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

/**
 * Uma mudança da etapa no INSS (`GET /clients/{id}/request-stage-history`).
 * Sem `retrocesso`: a esteira do INSS não é funil, e voltar de recurso para
 * exigência é caminho real.
 */
export interface ClientRequestStageHistory {
  id: string;
  /** Rótulo da etapa, como a API devolve. */
  currentStage: string;
  /** Nulo na primeira linha: o requerimento acabou de ser protocolado. */
  previousStage?: string | null;
  /** `Instant` da mudança. */
  changedAt: string;
  changedByUserId?: string;
  /** Dias que o requerimento passou na etapa anterior; nulo na primeira linha. */
  diasNaEtapaAnterior?: number | null;
  /**
   * O motivo da mudança — o que o INSS exigiu, por que indeferiu, contra o quê
   * se recorre. Sempre presente nessas três; nas outras, só se foi escrito.
   */
  justification?: string | null;
}

/** Query params de GET /api/v1/clients (paginação 1-based). */
export interface ClientListRequest {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  benefitType?: string[];
  situation?: string[];
  /** Etapas no INSS (chave ou label); cliente sem requerimento não entra em nenhuma. */
  requestStage?: string[];
  /** `VERIFICADO` / `POTENCIAL` — nome da constante ou label, como os demais. */
  clientType?: string[];
  /** Isento do serviço: `true` só os isentos, `false` só os não isentos; ausente, todos. */
  notBillable?: boolean;
  createdFrom?: string;
  createdTo?: string;
}

/**
 * Uma linha de `GET /api/v1/clients/upcoming-birthdays` — espelha
 * `UpcomingBirthdayDTO`. Datas em `yyyy-MM-dd`; "hoje" é o dia no fuso do
 * escritório.
 */
export interface UpcomingBirthdayResponse {
  clientId: string;
  fullName: string;
  birthDate: string;
  /** A próxima ocorrência do aniversário (hoje, se for hoje). */
  nextBirthday: string;
  /** Dias até `nextBirthday` no dia em que o servidor respondeu — `0` é hoje. */
  daysUntil: number;
  /** A idade que completa em `nextBirthday`. */
  turningAge: number;
  /** Celular do cliente, para o parabéns pelo WhatsApp. */
  mobilePhone?: string;
  /** O celular é WhatsApp (o padrão do cadastro é sim). */
  isWhatsapp?: boolean;
}

/** Parâmetros de `GET /api/v1/clients/upcoming-birthdays`. */
export interface UpcomingBirthdaysRequest {
  /** Janela em dias a partir de hoje: 0 a 365 (padrão 30). */
  days?: number;
  /** Máximo de itens: 1 a 50 (padrão 10). */
  limit?: number;
}
