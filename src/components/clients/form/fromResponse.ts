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

import { maskCEP, maskCPF, maskNIT, maskRG, maskPhone } from "@/lib/masks/masks";
import type { ClientDetails } from "@/interfaces/client/Client.interface";
import type {
  ClientAddressResponse,
  ClientInterviewResponse,
  ClientPersonalDataResponse,
  ClientProfessionalDataResponse,
} from "@/interfaces/client/ClientSubResources.interface";
import type { AddressValues, InterviewValues, PersonalValues, ProfessionalValues, ServiceValues } from "./schemas";
import { enumKeyOf, flagOf, numberTextOf, textOf } from "@/lib/formValues";


/**
 * A resposta com os enums como texto qualquer: a lista e a ficha usam o shape
 * legado (`Clients`, rótulos como `string`), os sub-recursos usam os tipos
 * estritos. Os mapeadores aceitam os dois.
 */
type Loose<T> = { [K in keyof T]?: T[K] extends string | undefined ? string | null : T[K] | null };

/** `undefined`/`null` → `""`. */

/**
 * O que a API devolve cru, com a máscara que o campo usaria.
 *
 * O formulário guarda **texto mascarado** — é o que a digitação produz, e é o
 * que `toCreateRequest` envia. Só a carga escapava disso, e a ficha abria com
 * `48670715791` no CPF enquanto o mesmo campo, digitado, vira
 * `486.707.157-91`. As máscaras são idempotentes (elas limpam antes de
 * formatar), então aplicar na carga não estraga o que já vem formatado.
 */
const masked = (mask: (value: string) => string, value?: string | null): string => {
  const raw = textOf(value);
  return raw ? mask(raw) : "";
};

/**
 * Telefone — com uma ressalva: gravado com DDI (`+5531999990000`), a máscara
 * brasileira o reescreveria como DDD 55. O backend aceita o DDI e a ficha não
 * pode corromper o que ela só foi abrir, então nesse caso o valor fica como
 * está.
 */
const phone = (value?: string | null): string => {
  const raw = textOf(value);
  const digits = raw.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11 ? maskPhone(raw) : raw;
};






// ─────────────────────────── Atendimento ───────────────────────────

export function toServiceValues(client: Loose<ClientDetails>): ServiceValues {
  return {
    benefit: enumKeyOf(client.benefit, getBenefitKeyByLabel),
    situation: enumKeyOf(client.situation, getSituationKeyByLabel),
    clientType: enumKeyOf(client.clientType, getClientTypeKeyByLabel),
    notBillable: flagOf(client.notBillable),
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
  source: Loose<ClientDetails & ClientPersonalDataResponse>,
): PersonalValues {
  return {
    fullName: textOf(source.fullName),
    birthDate: textOf(source.birthDate),
    cpf: masked(maskCPF, source.cpf),
    rg: masked(maskRG, source.rg),
    rgIssuer: textOf(source.rgIssuer),
    rgIssueDate: textOf(source.rgIssueDate),
    motherName: textOf(source.motherName),
    gender: enumKeyOf(source.gender, getGenderKeyByLabel),
    maritalStatus: enumKeyOf(source.maritalStatus, getMaritalStatusKeyByLabel),
    nationality: textOf(source.nationality),
    mobilePhone: phone(source.mobilePhone),
    isWhatsapp: flagOf(source.isWhatsapp),
    referencePhone: phone(source.referencePhone),
    referenceResponsible: textOf(source.referenceResponsible),
    email: textOf(source.email),
    hasDisability: flagOf(source.hasDisability),
  };
}

// ──────────────────────── Dados profissionais ────────────────────────

export function toProfessionalValues(
  source: Loose<ClientDetails & ClientProfessionalDataResponse>,
): ProfessionalValues {
  return {
    profession: textOf(source.profession),
    nitPis: masked(maskNIT, source.nitPis),
    // CTPS fica como está: a máscara corta em 8 dígitos (é só o número), e um
    // registro antigo com série e UF no mesmo campo seria truncado na carga —
    // a ficha gravaria de volta um documento mutilado que ninguém editou.
    ctps: textOf(source.ctps),
    ctpsSeries: textOf(source.ctpsSeries),
    // `contributionTime` ("33 anos, 11 meses e 5 dias") também vem na resposta,
    // mas é derivada: o que o formulário edita são os três números.
    contributionYears: numberTextOf(source.contributionYears),
    contributionMonths: numberTextOf(source.contributionMonths),
    contributionDays: numberTextOf(source.contributionDays),
    beneficiaryNumber: textOf(source.beneficiaryNumber),
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
    addressType: enumKeyOf(address.addressType, getAddressTypeKeyByLabel),
    zipCode: masked(maskCEP, address.zipCode),
    street: textOf(address.street),
    addressNumber: textOf(address.addressNumber),
    complement: textOf(address.complement),
    neighborhood: textOf(address.neighborhood),
    city: textOf(address.city),
    state: textOf(address.state),
    isPrimary: flagOf(address.isPrimary),
    cepLookup: "",
  };
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
    durationMinutes: numberTextOf(interview.durationMinutes),
    content: textOf(interview.content),
  };
}
