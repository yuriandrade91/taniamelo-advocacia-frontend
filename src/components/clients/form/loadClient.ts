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
export const newestFirst = <T,>(items: T[] = [], at: (item: T) => string | undefined) =>
  [...items].sort((a, b) => (at(b) ?? "").localeCompare(at(a) ?? ""));

const primaryFirst = (items: ClientAddressResponse[] = []) =>
  [...items].sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)));

export async function loadClient(clientId: string): Promise<LoadedClient> {
  const [client, historyResult, addresses, interviews, documents, simulations] =
    await Promise.allSettled([
      clientById(clientId),
      clientSituationHistory(clientId, { pageNumber: 1, pageSize: 50 }),
      listAddresses(clientId),
      listInterviews(clientId),
      listDocuments(clientId),
      listSimulations(clientId),
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
    listDocuments(clientId),
    listSimulations(clientId),
  ]);
  return {
    documents: settled(documents)?.data,
    simulations: settled(simulations)?.data,
  };
}
