import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type { Clients } from "@/interfaces/Clients.interface";
import { createSessionCache } from "./requestCache";

/**
 * Cache da listagem de clientes, por combinação de filtros e página.
 *
 * Voltar a uma página ou repetir uma busca já vista não pede de novo (nem
 * pisca o carregando). Limpo quando os dados mudam (criar, editar, excluir) e
 * no logout — sem depender de axios/authService, para não criar import
 * circular. A regra de cache é a de `createSessionCache`.
 */
const cache = createSessionCache<ApiEnvelope<Clients[]>>();

export const getCachedClients = cache.peek;
export const loadClients = cache.load;

/** Criar, editar ou excluir cliente deixa a listagem velha. */
export const clearClientsCache = () => {
  cache.invalidate();
};
