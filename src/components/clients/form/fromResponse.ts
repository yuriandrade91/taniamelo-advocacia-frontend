/**
 * Resposta da API → valores dos formulários das seções.
 *
 * O caminho de volta de `payloads.ts`. Existe porque a tela de detalhes precisa
 * preencher exatamente os mesmos formulários que o cadastro monta vazios, e a
 * conversão não é cópia de campo:
 *
 * ## Rótulo vem, chave vai
 *
 * A API devolve o **label** (`@JsonValue`): `"Aposentadoria por idade"`,
 * `"Feminino"`. Os selects trabalham com a **chave** do enum
 * (`APOSENTADORIA_POR_IDADE`), porque `toSelectOptions` usa `value` como `id` —
 * decisão do item 2 da revisão de arquitetura, que tirou o índice posicional
 * dali.
 *
 * Jogar o label direto no formulário não dá erro: o `select` simplesmente não
 * encontra a opção e mostra o placeholder, como se o campo estivesse vazio. Aí
 * a primeira gravação apaga o que estava salvo. É o defeito clássico de tela
 * de edição, e é silencioso nos dois sentidos.
 *
 * ## `null` e `undefined` viram `""`
 *
 * `useSectionForm` guarda string ou boolean, nunca `undefined` — um `value={undefined}`
 * transforma o input em não-controlado e o React reclama na primeira digitação.
 */

import {
  getAddressTypeKeyByLabel,
} from "@/enums/addressType/AddressType";
import { getBenefitKeyByLabel } from "@/enums/benefit/Benefits";
import { getClientTypeKeyByLabel } from "@/enums/clientType/ClientType";
import { getGenderKeyByLabel } from "@/enums/gender/Gender";
import { getMaritalStatusKeyByLabel } from "@/enums/maritalStatus/MaritalStatus";
import { getSituationKeyByLabel } from "@/enums/situation/Situation";

import type { ClientDetails } from "@/interfaces/client/Client.interface";
import type {
  ClientAddressResponse,
  ClientInterviewResponse,
  ClientPersonalDataResponse,
  ClientProfessionalDataResponse,
} from "@/interfaces/client/ClientSubResources.interface";

import type { AddressValues } from "./sections/AddressSection";
import type { InterviewValues } from "./sections/InterviewSection";
import type { PersonalValues } from "./sections/PersonalDataSection";
import type { ProfessionalValues } from "./sections/ProfessionalDataSection";
import type { ServiceValues } from "./sections/ServiceSection";

/** `undefined`/`null` → `""`. */
const text = (value?: string | null): string => value ?? "";

/** Número → texto do input. `0` é valor, `undefined` é campo em branco. */
const numero = (value?: number | null): string =>
  value === null || value === undefined ? "" : String(value);

/** Número → texto do campo. `0` é valor legítimo e precisa sobreviver. */
const numberText = (value?: number | null): string =>
  value === undefined || value === null ? "" : String(value);

/** `undefined` → `false`. Switch não tem terceiro estado. */
const flag = (value?: boolean | null): boolean => value === true;

/**
 * Converte um label em chave, aceitando que já venha chave.
 *
 * O "já venha chave" não é paranoia: o contrato do backend aceita os dois na
 * escrita (`@JsonCreator`), e um registro gravado por outro caminho pode voltar
 * assim. Devolver `""` nesse caso apagaria a seleção.
 */
const keyOf = <T extends string>(
  value: string | undefined | null,
  resolve: (label?: string) => T | undefined,
  isKey: (candidate: string) => boolean,
): string => {
  if (!value) return "";
  const key = resolve(value);
  if (key) return key;
  return isKey(value) ? value : "";
};

/** Uma chave de enum é MAIÚSCULA com underscore; um label tem minúsculas. */
const looksLikeKey = (candidate: string): boolean =>
  /^[A-Z0-9_]+$/.test(candidate);

// ─────────────────────────── Atendimento ───────────────────────────

export function toServiceValues(client: ClientDetails): ServiceValues {
  return {
    benefit: keyOf(client.benefit, getBenefitKeyByLabel, looksLikeKey),
    situation: keyOf(client.situation, getSituationKeyByLabel, looksLikeKey),
    clientType: keyOf(client.clientType, getClientTypeKeyByLabel, looksLikeKey),
    notBillable: flag(client.notBillable),
  };
}

// ───────────────────────── Dados pessoais ─────────────────────────

/**
 * Aceita tanto o `ClientDetails` quanto o sub-recurso de dados pessoais.
 *
 * Os dois trazem os mesmos campos, e qual está disponível depende de a tela ter
 * chamado `/clients/{id}` ou `/clients/{id}/personal-data`. Um mapeador por
 * origem seria duas listas de trinta campos para manter em sincronia.
 */
export function toPersonalValues(
  source: Partial<ClientDetails & ClientPersonalDataResponse>,
): PersonalValues {
  return {
    fullName: text(source.fullName),
    birthDate: text(source.birthDate),
    cpf: text(source.cpf),
    rg: text(source.rg),
    rgIssuer: text(source.rgIssuer),
    rgIssueDate: text(source.rgIssueDate),
    motherName: text(source.motherName),
    gender: keyOf(source.gender, getGenderKeyByLabel, looksLikeKey),
    maritalStatus: keyOf(
      source.maritalStatus,
      getMaritalStatusKeyByLabel,
      looksLikeKey,
    ),
    nationality: text(source.nationality),
    mobilePhone: text(source.mobilePhone),
    isWhatsapp: flag(source.isWhatsapp),
    referencePhone: text(source.referencePhone),
    referenceResponsible: text(source.referenceResponsible),
    email: text(source.email),
    hasDisability: flag(source.hasDisability),
  };
}

// ──────────────────────── Dados profissionais ────────────────────────

export function toProfessionalValues(
  source: Partial<ClientDetails & ClientProfessionalDataResponse>,
): ProfessionalValues {
  return {
    profession: text(source.profession),
    nitPis: text(source.nitPis),
    ctps: text(source.ctps),
    ctpsSeries: text(source.ctpsSeries),
    // `contributionTime` ("33 anos, 11 meses e 5 dias") também vem na resposta,
    // mas é derivada: o que o formulário edita são os três números.
    contributionYears: numero(source.contributionYears),
    contributionMonths: numero(source.contributionMonths),
    contributionDays: numero(source.contributionDays),
    beneficiaryNumber: text(source.beneficiaryNumber),
    // A senha do INSS não vem em resposta nenhuma desde que saiu do GET da
    // ficha. O campo nasce vazio, e vazio significa "mantém a que está
    // gravada" — quem precisa LER usa a rota auditada
    // (`clientService.revealInssPassword`), não este mapeamento.
    inssPassword: "",
  };
}

// ─────────────────────────── Endereço ───────────────────────────

export function toAddressValues(address: ClientAddressResponse): AddressValues {
  return {
    addressType: keyOf(
      address.addressType,
      getAddressTypeKeyByLabel,
      looksLikeKey,
    ),
    zipCode: text(address.zipCode),
    street: text(address.street),
    addressNumber: text(address.addressNumber),
    complement: text(address.complement),
    neighborhood: text(address.neighborhood),
    city: text(address.city),
    state: text(address.state),
    isPrimary: flag(address.isPrimary),
  };
}

/**
 * Rótulo da aba de um endereço.
 *
 * Usa o tipo quando existe, e cai para "Endereço N". O principal ganha marca
 * própria porque é a informação que decide qual endereço a correspondência usa
 * — e é a única que não dá para inferir olhando os campos.
 */
export function addressLabel(
  address: ClientAddressResponse,
  index: number,
): string {
  const base = address.addressType ?? `Endereço ${index + 1}`;
  return address.isPrimary ? `${base} (principal)` : base;
}

// ─────────────────────────── Entrevista ───────────────────────────

/**
 * `Instant` ISO → `YYYY-MM-DDTHH:mm` **local**, que é o que o campo espera.
 *
 * Aqui `new Date` é correto, diferente do resto do projeto: `occurredAt` é
 * `Instant` — tem fuso — e o certo é justamente converter para o horário local
 * de quem olha. O corte de string que usamos em `LocalDate` daria o horário
 * UTC, e uma entrevista das 15h em Brasília apareceria às 18h.
 */
export function instantToLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function toInterviewValues(
  interview: ClientInterviewResponse,
): InterviewValues {
  return {
    occurredAt: instantToLocalInput(interview.occurredAt),
    durationMinutes: numberText(interview.durationMinutes),
    content: text(interview.content),
  };
}
