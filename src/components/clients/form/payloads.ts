import type {
  ClientCreateRequest,
  ClientPatchRequest,
} from "@/interfaces/client/Client.interface";
import type {
  ClientAddressRequest,
  ClientInterviewRequest,
  ClientPersonalDataRequest,
  ClientProfessionalDataRequest,
} from "@/interfaces/client/ClientSubResources.interface";
import type { AddressTypeInput } from "@/enums/addressType/AddressType";
import type { BenefitInput } from "@/enums/benefit/Benefits";
import type { ClientTypeInput } from "@/enums/clientType/ClientType";
import type { GenderInput } from "@/enums/gender/Gender";
import type { MaritalStatusInput } from "@/enums/maritalStatus/MaritalStatus";
import type { SituationInput } from "@/enums/situation/Situation";
import type { ServiceValues } from "./sections/ServiceSection";
import type { PersonalValues } from "./sections/PersonalDataSection";
import type { ProfessionalValues } from "./sections/ProfessionalDataSection";
import type { AddressValues } from "./sections/AddressSection";
import type { InterviewValues } from "./sections/InterviewSection";

/**
 * Tradução dos valores do formulário para os payloads da API.
 *
 * Funções puras, fora do componente: a página orquestra as chamadas, mas não
 * precisa carregar o mapeamento campo a campo — que é a parte que mais muda
 * quando o backend ganha um campo, e a única que dá para testar sem montar
 * React.
 *
 * Duas convenções valem para todas elas:
 *
 * - **Enums viajam como a CHAVE da constante** ("MASCULINO"), não o label. O
 *   `EnumLabelSupport` do backend aceita os dois, mas a chave é estável — o
 *   label muda quando alguém corrige um acento.
 * - **String vazia vira `undefined`**, nunca `""`. Campo opcional não
 *   preenchido deve sumir do JSON; `JSON.stringify` descarta `undefined` e a
 *   API não vê a chave. Mandar `""` gravaria vazio por cima de um valor que
 *   talvez já existisse.
 */

/** `""` → `undefined`; caso contrário, o texto sem espaços nas pontas. */
const orUndefined = (value: string): string | undefined =>
  value.trim() ? value.trim() : undefined;

/**
 * `""` → `undefined`; caso contrário, o número.
 *
 * Campo em branco tem de SUMIR do JSON, e não virar `0`: os três campos nulos
 * significam "não informado" no backend, enquanto zero significa "não
 * contribuiu". Era exatamente essa distinção que o texto livre apagava.
 */
const orNumber = (value: string): number | undefined =>
  value.trim() ? Number(value.trim()) : undefined;

export function toCreateRequest(
  service: ServiceValues,
  personal: PersonalValues,
  professional: ProfessionalValues,
): ClientCreateRequest {
  return {
    benefit: service.benefit as BenefitInput,
    situation: service.situation as SituationInput,
    clientType: (orUndefined(service.clientType) ?? undefined) as
      | ClientTypeInput
      | undefined,
    notBillable: service.notBillable,

    fullName: personal.fullName.trim(),
    birthDate: personal.birthDate,
    cpf: personal.cpf,
    motherName: personal.motherName.trim(),
    mobilePhone: personal.mobilePhone,
    gender: personal.gender as GenderInput,
    rg: orUndefined(personal.rg),
    rgIssuer: orUndefined(personal.rgIssuer),
    rgIssueDate: orUndefined(personal.rgIssueDate),
    maritalStatus: (orUndefined(personal.maritalStatus) ?? undefined) as
      | MaritalStatusInput
      | undefined,
    nationality: orUndefined(personal.nationality),
    isWhatsapp: personal.isWhatsapp,
    referencePhone: orUndefined(personal.referencePhone),
    referenceResponsible: orUndefined(personal.referenceResponsible),
    email: orUndefined(personal.email),
    hasDisability: personal.hasDisability,

    inssPassword: professional.inssPassword,
    profession: orUndefined(professional.profession),
    nitPis: orUndefined(professional.nitPis),
    ctps: orUndefined(professional.ctps),
    ctpsSeries: orUndefined(professional.ctpsSeries),
    contributionYears: orNumber(professional.contributionYears),
    contributionMonths: orNumber(professional.contributionMonths),
    contributionDays: orNumber(professional.contributionDays),
    beneficiaryNumber: orUndefined(professional.beneficiaryNumber),
  };
}

/**
 * `PATCH /clients/{id}` — os únicos campos que o backend aceita atualizar
 * parcialmente. Benefício e situação são os que mudam com frequência no dia a
 * dia do escritório; por isso têm rota própria, separada do `PUT` completo.
 */
export function toPatchRequest(service: ServiceValues): ClientPatchRequest {
  return {
    benefit: service.benefit as BenefitInput,
    situation: service.situation as SituationInput,
    clientType: (orUndefined(service.clientType) ?? undefined) as
      | ClientTypeInput
      | undefined,
    notBillable: service.notBillable,
  };
}

export function toPersonalDataRequest(
  personal: PersonalValues,
): ClientPersonalDataRequest {
  return {
    fullName: personal.fullName.trim(),
    birthDate: personal.birthDate,
    cpf: personal.cpf,
    rg: orUndefined(personal.rg),
    rgIssuer: orUndefined(personal.rgIssuer),
    rgIssueDate: orUndefined(personal.rgIssueDate),
    motherName: orUndefined(personal.motherName),
    gender: personal.gender as GenderInput,
    maritalStatus: (orUndefined(personal.maritalStatus) ?? undefined) as
      | MaritalStatusInput
      | undefined,
    nationality: orUndefined(personal.nationality),
    mobilePhone: personal.mobilePhone,
    isWhatsapp: personal.isWhatsapp,
    referencePhone: orUndefined(personal.referencePhone),
    referenceResponsible: orUndefined(personal.referenceResponsible),
    email: orUndefined(personal.email),
    hasDisability: personal.hasDisability,
  };
}

/**
 * `contributionInMonths` e `contributionTime` existem no tipo (o `Omit` da
 * interface só tira id e auditoria) mas **não são enviados**: os dois são
 * derivados no servidor a partir de anos/meses/dias. Mandá-los seria escrever
 * por cima de um cálculo do servidor com um valor que a tela não tem como
 * saber.
 */
export function toProfessionalDataRequest(
  professional: ProfessionalValues,
): ClientProfessionalDataRequest {
  return {
    profession: orUndefined(professional.profession),
    nitPis: orUndefined(professional.nitPis),
    ctps: orUndefined(professional.ctps),
    ctpsSeries: orUndefined(professional.ctpsSeries),
    contributionYears: orNumber(professional.contributionYears),
    contributionMonths: orNumber(professional.contributionMonths),
    contributionDays: orNumber(professional.contributionDays),
    beneficiaryNumber: orUndefined(professional.beneficiaryNumber),
    // Só vai se o usuário digitou. No PUT da aba, campo ausente significa
    // "mantém a senha gravada" — e como ela não volta em resposta nenhuma, o
    // formulário nunca a tem em mãos para devolver. Mandar o valor vazio que o
    // campo carrega apagaria o acesso do cliente ao INSS em toda edição.
    inssPassword: orUndefined(professional.inssPassword),
  };
}

export function toAddressRequest(address: AddressValues): ClientAddressRequest {
  return {
    addressType: (orUndefined(address.addressType) ?? undefined) as
      | AddressTypeInput
      | undefined,
    street: address.street.trim(),
    addressNumber: orUndefined(address.addressNumber),
    complement: orUndefined(address.complement),
    neighborhood: orUndefined(address.neighborhood),
    city: address.city.trim(),
    state: address.state.trim().toUpperCase(),
    zipCode: orUndefined(address.zipCode),
    isPrimary: address.isPrimary,
  };
}

/**
 * `datetime-local` devolve texto sem fuso ("2026-09-02T14:30"). O backend
 * espera `Instant` em ISO 8601 com zona, então convertemos — `new Date` de um
 * `datetime-local` é interpretado no fuso local, que é o que o usuário quis
 * dizer ao digitar.
 */
export function toInterviewRequest(
  interview: InterviewValues,
): ClientInterviewRequest {
  return {
    occurredAt: interview.occurredAt
      ? new Date(interview.occurredAt).toISOString()
      : undefined,
    durationMinutes: interview.durationMinutes
      ? Number(interview.durationMinutes)
      : undefined,
    content: interview.content,
  };
}
