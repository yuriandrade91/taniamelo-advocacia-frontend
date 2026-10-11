import type {
  ClientDetails,
  ClientUpdateRequest,
} from "@/interfaces/client/Client.interface";
import { computeProgress } from "../form/progress";
import { toCreateRequest } from "../form/payloads";
import type {
  PersonalValues,
  ProfessionalValues,
  ServiceValues,
} from "../form/schemas";

/**
 * A ficha do cliente em funções puras: o corpo do PUT, o preenchimento do
 * cadastro e o quanto de cada seção já está escrito.
 */

export type SheetSections = {
  service: ServiceValues;
  personal: PersonalValues;
  professional: ProfessionalValues;
};

/**
 * Campos que a ficha não desenha, mas que o PUT tem de devolver. A etapa no
 * INSS muda pela lista (PATCH); se o PUT não a devolvesse, salvar a ficha
 * apagaria a etapa — o backend grava ausente como nulo.
 */
export type KeptFields = Pick<ClientDetails, "notes" | "responsibleUserId" | "requestStage">;

/**
 * `PUT /clients/{id}` é **substituição total**: o backend só preserva, quando
 * ausentes, nacionalidade, WhatsApp, deficiência, isenção, tipo e senha. Todo
 * o resto que não vier é gravado como vazio — por isso o corpo sai das mesmas
 * seções do cadastro (com órgão emissor e emissão do RG) e devolve as notas e
 * o responsável como vieram. A senha só vai quando digitada: vazia = mantém.
 */
export function toUpdateRequest(
  { service, personal, professional }: SheetSections,
  kept: KeptFields,
): ClientUpdateRequest {
  const { inssPassword, ...body } = toCreateRequest(service, personal, professional);
  return {
    ...body,
    notes: kept.notes ?? undefined,
    responsibleUserId: kept.responsibleUserId ?? undefined,
    requestStage: kept.requestStage ?? null,
    ...(inssPassword.trim() ? { inssPassword } : {}),
  };
}

/** Campos de texto que contam no anel "preenchimento do cadastro". */
const PROGRESS_KEYS = [
  "benefit",
  "situation",
  "clientType",
  "fullName",
  "birthDate",
  "cpf",
  "rg",
  "rgIssuer",
  "rgIssueDate",
  "motherName",
  "gender",
  "maritalStatus",
  "mobilePhone",
  "email",
  "referencePhone",
  "referenceResponsible",
  "profession",
  "nitPis",
  "beneficiaryNumber",
  "ctps",
  "ctpsSeries",
  "contributionYears",
] as const;

/** Quanto do cadastro está preenchido, 0–100. */
export const sheetProgress = ({ service, personal, professional }: SheetSections) =>
  computeProgress({ ...service, ...personal, ...professional }, PROGRESS_KEYS);

/**
 * Quanto da seção está escrito — o "6/7" ao lado do nome dela na ficha.
 *
 * Conta os campos de **texto** do schema: a chave (isento, faturável) tem
 * "não" como resposta legítima, e contá-la deixaria a seção eternamente a um
 * campo do fim. `skip` é para o que o schema declara mas a ficha não recebe —
 * a senha do INSS, que nunca volta do servidor, e o rastro do CEP.
 */
export function sectionFill(
  schema: Readonly<Record<string, unknown>>,
  values: Readonly<Record<string, unknown>>,
  skip: readonly string[] = [],
): { filled: number; total: number } {
  const names = Object.keys(schema).filter(
    (name) => !skip.includes(name) && typeof values[name] === "string",
  );
  return {
    filled: names.filter((name) => String(values[name]).trim() !== "").length,
    total: names.length,
  };
}
