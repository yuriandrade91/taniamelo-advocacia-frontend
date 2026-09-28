import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  UserListRequest,
  UserSummary,
} from "@/interfaces/user/User.interface";

/**
 * Usuários do escritório — UserController. Base: /api/v1/users
 *
 * Um propósito só: traduzir em nome os ids de autoria que os outros recursos
 * devolvem. Não é cadastro de usuário (não existe rota de escrita) nem
 * diretório de contatos (o backend não devolve e-mail).
 *
 * Restrita a ADMIN/LAWYER. Para atendente o backend responde 403 — daí o
 * `skipErrorToast`: a resolução de nome é enfeite de uma tela que funciona sem
 * ela, e um toast vermelho ao abrir a ficha faria parecer que a ficha falhou.
 * Quem chama trata a lista vazia mostrando o que já mostrava antes.
 */

/** GET /api/v1/users — lista completa, ordenada por nome, sem paginação. */
export const listUsers = async (
  params?: UserListRequest,
): Promise<ApiEnvelope<UserSummary[]>> => {
  const { data } = await axiosInstance.get<ApiEnvelope<UserSummary[]>>(
    endpoints.USERS.LIST,
    { params, skipErrorToast: true },
  );
  return data;
};

/**
 * Índice `id -> nome`, que é como toda tela consome esta lista.
 *
 * Aceita a lista já carregada em vez de buscar sozinho: a ficha do cliente
 * resolve autoria em vários lugares (histórico, responsável, quem editou) e
 * uma busca por lugar seria a mesma requisição três vezes na mesma tela.
 */
export const indexarPorId = (
  users: readonly UserSummary[] | undefined,
): Record<string, string> => {
  const indice: Record<string, string> = {};
  for (const user of users ?? []) {
    if (user?.id && user.fullName) indice[user.id] = user.fullName;
  }
  return indice;
};

/**
 * Nome de quem agiu, a partir do índice.
 *
 * Sem correspondência devolve `undefined`, e não o UUID: mostrar
 * `9f3c1e7a-…` na linha "alterado por" não informa ninguém e ainda vaza id
 * interno na tela. Quem chama decide o que colocar no lugar — normalmente
 * nada, como era antes de existir a rota.
 *
 * O caso sem correspondência é real: usuário desativado só aparece com
 * `includeInactive`, e um id de outro escritório nunca aparece.
 */
export const nomeDoAutor = (
  indice: Record<string, string>,
  userId?: string | null,
): string | undefined => {
  if (!userId) return undefined;
  return indice[userId];
};
