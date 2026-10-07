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

/**
 * A listagem **inteira** (todas as páginas), para o que pergunta pelo
 * escritório e não por uma página — hoje, os aniversariantes da Home.
 *
 * Cache próprio, e não uma entrada do de cima, porque o valor é de outro tipo
 * (a lista crua, já concatenada) e a chave não é uma consulta paginada. Vive a
 * sessão: data de nascimento não muda entre duas visitas à Home.
 */
const everyone = createSessionCache<Clients[]>(4);

export const getCachedClients = cache.peek;
export const loadClients = cache.load;
export const loadEveryClient = everyone.load;

/**
 * Criar, editar ou excluir cliente invalida as duas: a lista inteira também
 * ficou velha (um cliente novo pode fazer aniversário amanhã).
 */
export const clearClientsCache = () => {
  cache.invalidate();
  everyone.invalidate();
};
