import { toSelectOptions } from "@/components/ui/form/options";
import {
  defineSection,
  initialValues,
  rulesOf,
  type SectionValues,
} from "@/components/ui/form/schema";
import { AddressTypeOptions } from "@/enums/addressType/AddressType";
import { BenefitOptions } from "@/enums/benefit/Benefits";
import { ClientTypeOptions } from "@/enums/clientType/ClientType";
import { GenderOptions } from "@/enums/gender/Gender";
import { MaritalStatusOptions } from "@/enums/maritalStatus/MaritalStatus";
import { SituationOptions } from "@/enums/situation/Situation";
import {
  validateBirthDate,
  validateContributionPart,
  validatePastDate,
} from "@/lib/validators";

/**
 * Os campos do cliente, descritos uma vez.
 *
 * Cada seção espelha um DTO do backend e é consumida em três lugares: o
 * cadastro (`/clientes/novo`), a ficha (`ClientDetailsModal`) e a revisão
 * (`review.ts`). Rótulo, máscara, validador e obrigatoriedade saem daqui — é o
 * que faz a ficha barrar o mesmo CPF inválido que o cadastro barra.
 *
 * Cada `required`/`rule` corresponde a uma anotação do DTO: `@NotBlank` →
 * obrigatório, `@ValidCPF` → tipo `cpf`, `@Email` → tipo `email`, `@Past` →
 * `validateBirthDate`. O front nunca é mais rígido que o backend.
 *
 * Funções e dados puros (sem React): o Vitest roda em Node.
 */

/** "Atendimento" — campos do próprio `POST /clients` (`benefit`, `situation` são `@NotNull`). */
export const serviceSchema = defineSection({
  benefit: {
    kind: "select",
    label: "Benefício pretendido",
    required: "o benefício pretendido",
    placeholder: "Selecione o benefício",
    options: toSelectOptions(BenefitOptions),
    span: 2,
  },
  situation: {
    kind: "select",
    label: "Situação",
    required: "a situação",
    placeholder: "Selecione a situação",
    options: toSelectOptions(SituationOptions),
  },
  clientType: {
    kind: "select",
    label: "Tipo de cliente",
    placeholder: "Verificado ou potencial",
    options: toSelectOptions(ClientTypeOptions),
  },
  notBillable: { kind: "switch", label: "Cliente isento do serviço?" },
});

/** "Dados pessoais" — `ClientPersonalDataRequestDTO` (`gender` é `@NotNull`). */
export const personalSchema = defineSection({
  fullName: { kind: "text", label: "Nome completo", required: true, placeholder: "Maria da Silva Santos", span: 2 },
  birthDate: { kind: "date", label: "Data de nascimento", required: true, rule: validateBirthDate },
  cpf: { kind: "cpf", label: "CPF", required: true, placeholder: "000.000.000-00" },
  rg: { kind: "rg", label: "RG", placeholder: "12.345.678-9" },
  rgIssuer: { kind: "text", label: "Órgão emissor", placeholder: "SSP/MG" },
  rgIssueDate: {
    kind: "date",
    label: "Emissão do RG",
    rule: (value) => validatePastDate(value, "Emissão do RG"),
  },
  motherName: { kind: "text", label: "Nome da mãe", required: true, placeholder: "Ana da Silva", span: 2 },
  gender: {
    kind: "select",
    label: "Gênero",
    required: "o gênero",
    placeholder: "Selecione o gênero",
    options: toSelectOptions(GenderOptions),
  },
  maritalStatus: {
    kind: "select",
    label: "Estado civil",
    placeholder: "Selecione o estado civil",
    options: toSelectOptions(MaritalStatusOptions),
  },
  nationality: { kind: "text", label: "Nacionalidade", placeholder: "Brasileira" },
  mobilePhone: { kind: "mobile", label: "Celular", required: true, placeholder: "(31) 99999-0000" },
  isWhatsapp: { kind: "switch", label: "É WhatsApp?" },
  referencePhone: { kind: "phone", label: "Telefone recado", placeholder: "(31) 3333-0000" },
  referenceResponsible: { kind: "text", label: "Responsável recado", placeholder: "João Santos (filho)", span: 2 },
  email: { kind: "email", label: "E-mail", placeholder: "maria@email.com", span: 2 },
  hasDisability: { kind: "switch", label: "Pessoa com deficiência?" },
});

/**
 * "Dados profissionais" — `ClientProfessionalDataRequestDTO`.
 *
 * `inssPassword` é obrigatória só no CADASTRO (`@NotBlank` no `POST /clients`);
 * na ficha ela sai do schema — vazia significa "mantém a gravada".
 * O tempo de contribuição são três números, com as faixas do backend
 * (`TempoDeContribuicao`: mês de 30 dias, ano de 12 meses).
 */
export const professionalSchema = defineSection({
  profession: { kind: "text", label: "Profissão", placeholder: "Auxiliar administrativo", span: 2 },
  nitPis: { kind: "nit", label: "NIT/PIS", placeholder: "123.45678.90-1" },
  beneficiaryNumber: { kind: "text", label: "Nº do benefício", placeholder: "1234567890" },
  ctps: { kind: "ctps", label: "CTPS", placeholder: "1234567" },
  ctpsSeries: { kind: "text", label: "Série da CTPS", placeholder: "0012" },
  contributionYears: {
    kind: "digits",
    label: "Tempo de contribuição (anos)",
    placeholder: "33",
    maxLength: 3,
    rule: (value) => validateContributionPart(value, 130, "Anos"),
  },
  contributionMonths: {
    kind: "digits",
    label: "Meses",
    placeholder: "11",
    maxLength: 2,
    rule: (value) => validateContributionPart(value, 11, "Meses"),
  },
  contributionDays: {
    kind: "digits",
    label: "Dias",
    placeholder: "5",
    maxLength: 2,
    rule: (value) => validateContributionPart(value, 29, "Dias"),
  },
  inssPassword: {
    kind: "password",
    label: "Senha do INSS (meu INSS)",
    required: "Senha do INSS",
    placeholder: "Senha de acesso ao Meu INSS",
  },
});


/** "Endereço" — `ClientAddressRequestDTO` (`street`, `city`, `state` obrigatórios). */
export const addressSchema = defineSection({
  addressType: {
    kind: "select",
    label: "Tipo de endereço",
    placeholder: "Residencial, comercial…",
    options: toSelectOptions(AddressTypeOptions),
  },
  zipCode: { kind: "cep", label: "CEP", placeholder: "30140-000" },
  street: { kind: "text", label: "Logradouro", required: true, placeholder: "Rua das Flores", span: 2 },
  addressNumber: { kind: "text", label: "Número", placeholder: "123" },
  complement: { kind: "text", label: "Complemento", placeholder: "Apto 101" },
  neighborhood: { kind: "text", label: "Bairro", placeholder: "Centro" },
  city: { kind: "text", label: "Cidade", required: true, placeholder: "Belo Horizonte" },
  state: { kind: "uf", label: "UF", required: true, placeholder: "MG" },
  isPrimary: { kind: "switch", label: "Endereço principal?", initial: true },
  /**
   * O que o CEP devolveu da última consulta, serializado (`encodeCepLookup`).
   * Não é campo de tela nem vai à API: mora nos valores porque as abas
   * desmontam o painel escondido, e guardado na seção perderia a trava dos
   * campos que vieram do CEP.
   */
  cepLookup: { kind: "text", label: "" },
});

/**
 * "Entrevista" — `ClientInterviewRequestDTO` (`content` `@NotBlank`,
 * `durationMinutes` `@Positive`). O conteúdo só é obrigatório quando a seção
 * foi preenchida — regra de quem orquestra (`interviewContentRule`).
 */
export const interviewSchema = defineSection({
  occurredAt: { kind: "datetime", label: "Data e hora" },
  durationMinutes: {
    kind: "digits",
    label: "Duração (minutos)",
    placeholder: "45",
    rule: (value) =>
      !value || Number(value) > 0 ? null : "Duração deve ser um número de minutos maior que zero.",
  },
  content: {
    kind: "text",
    label: "Conteúdo",
    rule: (_value: string, values: Record<string, string | boolean>): string | null =>
      interviewContentRule(values as InterviewValues),
  },
});

export type ServiceValues = SectionValues<typeof serviceSchema>;
export type PersonalValues = SectionValues<typeof personalSchema>;
export type ProfessionalValues = SectionValues<typeof professionalSchema>;
export type AddressValues = SectionValues<typeof addressSchema>;
export type InterviewValues = SectionValues<typeof interviewSchema>;

export const serviceInitial = initialValues(serviceSchema);
export const personalInitial = initialValues(personalSchema);
export const professionalInitial = initialValues(professionalSchema);
export const addressInitial = initialValues(addressSchema);
export const interviewInitial = initialValues(interviewSchema);

const professionalRules = rulesOf(professionalSchema);
/** Na ficha a senha é opcional (vazia = mantém a gravada) e tem campo próprio, auditado. */
export const professionalEditRules = { ...professionalRules, inssPassword: undefined };

/** Agrupamentos da tela — os mesmos no formulário e na revisão. `age` é derivado. */
export const PERSONAL_GROUPS = [
  {
    title: "Identificação",
    names: ["fullName", "birthDate", "age", "motherName", "cpf", "gender", "maritalStatus", "nationality", "hasDisability"],
  },
  { title: "Documento de identidade", names: ["rg", "rgIssuer", "rgIssueDate"] },
  { title: "Contato", names: ["mobilePhone", "isWhatsapp", "email"] },
  { title: "Recado", names: ["referenceResponsible", "referencePhone"] },
] as const;

export const PROFESSIONAL_GROUPS = [
  { title: "Trabalho", names: ["profession", "nitPis", "beneficiaryNumber", "ctps", "ctpsSeries"] },
  { title: "Tempo de contribuição", names: ["contributionYears", "contributionMonths", "contributionDays"] },
  { title: "Meu INSS", names: ["inssPassword"] },
] as const;

/** `true` quando o usuário mexeu no endereço. `isPrimary` nasce `true` e não conta. */
export const hasAddressInput = (values: AddressValues) =>
  Boolean(
    values.street.trim() ||
      values.city.trim() ||
      values.state.trim() ||
      values.zipCode.trim() ||
      values.neighborhood.trim() ||
      values.addressNumber.trim() ||
      values.complement.trim() ||
      values.addressType,
  );

/** O texto do relato: o editor rico manda HTML, e vazio ele vale `<p></p>`. */
const plainText = (html: string) => html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

/** `true` quando o usuário mexeu na entrevista e ela deve ser enviada. */
export const hasInterviewInput = (values: InterviewValues) =>
  Boolean(plainText(values.content) || values.occurredAt || values.durationMinutes);

/** Conteúdo obrigatório — só quando a entrevista foi de fato preenchida. */
const interviewContentRule = (values: InterviewValues): string | null =>
  hasInterviewInput(values) && !plainText(values.content)
    ? "O campo Conteúdo da entrevista é obrigatório."
    : null;
