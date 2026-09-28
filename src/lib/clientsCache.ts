import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type { Clients } from "@/interfaces/Clients.interface";

/**
 * Cache em memória da listagem de clientes, por combinação de filtros/página.
 *
 * Evita refetch (e o flash de loading) ao paginar ou repetir uma busca já
 * vista nesta sessão. Só é limpo em logout (real ou forçado por refresh
 * falho) ou quando os dados mudam (criar/editar/excluir cliente) — sem
 * dependência de axios/authService para não criar import circular.
 */
const cache = new Map<string, ApiEnvelope<Clients[]>>();

export function getCachedClients(
  key: string,
): ApiEnvelope<Clients[]> | undefined {
  return cache.get(key);
}

export function setCachedClients(
  key: string,
  envelope: ApiEnvelope<Clients[]>,
): void {
  cache.set(key, envelope);
}

export function clearClientsCache(): void {
  cache.clear();
}
