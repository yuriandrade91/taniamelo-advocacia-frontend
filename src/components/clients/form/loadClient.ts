import type { ClientDetails, ClientSituationHistory } from "@/interfaces/client/Client.interface";
import type {
  ClientAddressResponse,
  ClientFileDocumentResponse,
  ClientFileSimulationResponse,
  ClientInterviewResponse,
} from "@/interfaces/client/ClientSubResources.interface";
import { clientById, clientSituationHistory } from "@/services/clientService";
import { listAddresses } from "@/services/clientAddressService";
import { listInterviews } from "@/services/clientInterviewService";
import { listDocuments, listSimulations } from "@/services/clientFileService";
import fallbackMessages from "@/constants/messages/fallbackMessages";
import { messageOf } from "@/lib/errorMessage";
import { fetchAllPages } from "@/lib/pagination";
import { sheetRead } from "@/lib/clientsCache";

/**
 * Tudo o que a ficha lê de um cliente, num caminho só. A deficiência fica de
 * fora: o painel dela lê os próprios períodos.
 *
 * As leituras saem juntas, com `allSettled`: um 404 de arquivos não esconde o
 * cliente. Cada parte que falhou volta vazia, e o que falhou no cliente em si
 * vira `error`.
 */

export type LoadedClient = {
  client: ClientDetails | null;
  /** Mensagem da falha ao ler o cliente; `""` quando veio. */
  error: string;
  /** O principal primeiro: é o que a ficha mostra e a primeira aba do cadastro. */
  addresses: ClientAddressResponse[];
  /** A mais recente primeiro: é onde o cliente está hoje. */
  interviews: ClientInterviewResponse[];
  history: ClientSituationHistory[];
  historyFailed: boolean;
  documents: ClientFileDocumentResponse[];
  simulations: ClientFileSimulationResponse[];
};

const settled = <T,>(result: PromiseSettledResult<T>): T | undefined =>
  result.status === "fulfilled" ? result.value : undefined;

/** Mais recente primeiro. */
export const newestFirst = <T,>(items: T[] | undefined, at: (item: T) => string | undefined) =>
  [...(items ?? [])].sort((a, b) => (at(b) ?? "").localeCompare(at(a) ?? ""));

/** Os arquivos inteiros: a ficha mostra todos e pagina na própria tela. */
const allDocuments = (clientId: string) => fetchAllPages((params) => listDocuments(clientId, params));
const allSimulations = (clientId: string) => fetchAllPages((params) => listSimulations(clientId, params));

const primaryFirst = (items: ClientAddressResponse[] = []) =>
  [...items].sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)));

/** Reabrir a ficha do mesmo cliente lê da memória (`sheetRead`) até a próxima gravação. */
export async function loadClient(clientId: string): Promise<LoadedClient> {
  const [client, historyResult, addresses, interviews, documents, simulations] =
    await Promise.allSettled([
      sheetRead(`${clientId}:client`, () => clientById(clientId)),
      sheetRead(`${clientId}:situation-history`, () => clientSituationHistory(clientId, { pageNumber: 1, pageSize: 50 })),
      sheetRead(`${clientId}:addresses`, () => listAddresses(clientId)),
      sheetRead(`${clientId}:interviews`, () => listInterviews(clientId)),
      sheetRead(`${clientId}:documents`, () => allDocuments(clientId)),
      sheetRead(`${clientId}:simulations`, () => allSimulations(clientId)),
    ]);

  return {
    client: settled(client) ?? null,
    error:
      client.status === "rejected"
        ? messageOf(client.reason, fallbackMessages.CLIENTS.LOAD_FAILED)
        : "",
    addresses: primaryFirst(settled(addresses)?.data),
    interviews: newestFirst(settled(interviews)?.data, (item) => item.occurredAt),
    history: newestFirst(settled(historyResult)?.data, (item) => item.changedAt),
    historyFailed: historyResult.status === "rejected",
    documents: settled(documents)?.data ?? [],
    simulations: settled(simulations)?.data ?? [],
  };
}

/** Só as duas listas de arquivos — depois de enviar ou excluir. */
export async function loadClientFiles(clientId: string) {
  const [documents, simulations] = await Promise.allSettled([
    allDocuments(clientId),
    allSimulations(clientId),
  ]);
  return {
    documents: settled(documents)?.data,
    simulations: settled(simulations)?.data,
  };
}
