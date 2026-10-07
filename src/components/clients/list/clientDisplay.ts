import type { Clients } from "@/interfaces/Clients.interface";
import { getClientTypeKeyByLabel } from "@/enums/clientType/ClientType";
import { maskCPF } from "@/lib/masks/masks";

/**
 * Como um cliente da listagem aparece na tela — funções puras.
 *
 * Moravam espalhadas: três funções declaradas dentro do componente da página
 * (recriadas a cada render) e cópias quase iguais no kit dos modelos, uma
 * mostrando "-" e a outra "—" para o mesmo campo vazio. Agora são uma só.
 */

/** Marca de campo vazio. Um traço só, igual em toda a listagem. */
export const EMPTY_VALUE = "—";

/** Texto do campo, ou o traço quando vazio (`null`, `undefined` ou só espaços). */
export const display = (value?: string | null): string =>
  value && value.trim() ? value : EMPTY_VALUE;

/** Instante da API → "dd/mm/aaaa" no fuso de quem vê; inválido vira o traço. */
export function formatDate(iso?: string | null): string {
  if (!iso) return EMPTY_VALUE;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? EMPTY_VALUE : date.toLocaleDateString("pt-BR");
}

/**
 * "Última atualização": só quando mudou depois do registro. O backend grava
 * `updatedAt` igual a `createdAt` na criação — mostrar a mesma data duas
 * vezes sugeriria uma edição que não houve.
 */
export const updatedOf = (client: Pick<Clients, "createdAt" | "updatedAt">): string =>
  client.updatedAt && client.updatedAt !== client.createdAt
    ? formatDate(client.updatedAt)
    : EMPTY_VALUE;

/** CPF com máscara, ou "" (o `CopyableValue` mostra o traço sozinho). */
export const cpfOf = (client: Pick<Clients, "cpf">): string =>
  client.cpf ? maskCPF(client.cpf) : "";

/**
 * "Potencial" = lead: preencheu o formulário, ainda não é cliente. A API manda
 * o rótulo (@JsonValue); aceita também a chave, por tolerância.
 */
export function isLead(client: Pick<Clients, "clientType">): boolean {
  if (!client.clientType) return false;
  const key = getClientTypeKeyByLabel(client.clientType) ?? client.clientType;
  return key === "POTENCIAL";
}

/**
 * Isento do serviço: o `notBillable` que a API manda — o mesmo campo do
 * cadastro ("Cliente isento do serviço?") e do filtro de isenção da lista.
 */
export const isExempt = (client: Pick<Clients, "notBillable">): boolean =>
  client.notBillable === true;
