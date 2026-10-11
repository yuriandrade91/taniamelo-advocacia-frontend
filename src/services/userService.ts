import endpoints from "@/constants/endpoints/paths";
import axiosInstance from "@/services/axiosService";
import {
  pendingWrite,
  pendingRead,
  pendingIntegration,
} from "@/services/pendingIntegration";
import type { ApiEnvelope } from "@/interfaces/Envelope.interface";
import type {
  ChangePasswordRequest,
  MyProfile,
  MyProfileUpdateRequest,
  UserListRequest,
  UserSummary,
} from "@/interfaces/user/User.interface";
import { feedback, type RequestFeedback } from "@/services/requestFeedback";

/**
 * Usuários do escritório — UserController. Base: /api/v1/users
 *
 * Dois propósitos, e só dois: traduzir em nome os ids de autoria que os outros
 * recursos devolvem, e deixar a pessoa mexer no próprio cadastro (`/me`).
 * Não é cadastro de usuário — criar, desativar ou mudar papel de outra pessoa
 * não tem rota, e a lista nem devolve e-mail.
 *
 * Restrita a ADMIN/LAWYER. Para atendente o backend responde 403 — daí o
 * `skipErrorToast`: a resolução de nome é enfeite de uma tela que funciona sem
 * ela, e um toast vermelho ao abrir a ficha faria parecer que a ficha falhou.
 * Quem chama trata a lista vazia mostrando o que já mostrava antes.
 *
 * ## O `if` antes do código de verdade
 *
 * Cada função começa perguntando se este grupo de rotas está pausado **neste
 * ambiente** (`NEXT_PUBLIC_PENDING_INTEGRATIONS`). Onde o backend serve as
 * rotas — o local, por exemplo — a pergunta é falsa e a integração funciona
 * normalmente. Onde não serve, a chamada não chega a sair para a rede.
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
export const indexById = (
  users: readonly UserSummary[] | undefined,
): Record<string, string> => {
  const index: Record<string, string> = {};
  for (const user of users ?? []) {
    if (user?.id && user.fullName) index[user.id] = user.fullName;
  }
  return index;
};

/**
 * GET /api/v1/users/me — os dados de quem está logado.
 *
 * Não leva id: o servidor lê o usuário do token. É o que torna a rota aberta a
 * qualquer papel sem virar leitura do cadastro alheio — não existe forma de
 * pedir "me" de outra pessoa.
 *
 * **Não** silencia erro, ao contrário da lista: aqui a tela inteira depende da
 * resposta, e formulário em branco sem aviso convida a pessoa a preencher tudo
 * de novo e salvar por cima do que não carregou.
 */
export const myProfile = async (): Promise<ApiEnvelope<MyProfile>> => {
  if (pendingIntegration("users-me")) return pendingRead("GET /api/v1/users/me");
  const { data } = await axiosInstance.get<ApiEnvelope<MyProfile>>(
    endpoints.USERS.ME,
  );
  return data;
};

/** PUT /api/v1/users/me — nome e e-mail. Username e papel não se editam daqui. */
export const updateMyProfile = async (
  body: MyProfileUpdateRequest,
  options?: RequestFeedback,
): Promise<ApiEnvelope<MyProfile>> => {
  if (pendingIntegration("users-me")) return pendingWrite("PUT /api/v1/users/me");
  const { data } = await axiosInstance.put<ApiEnvelope<MyProfile>>(
    endpoints.USERS.ME,
    body,
    feedback("Dados atualizados.", options),
  );
  return data;
};

/**
 * PATCH /api/v1/users/me/password.
 *
 * `skipErrorToast`: os erros aqui são de campo — senha atual errada, nova
 * senha igual à atual — e pertencem ao campo, não a um toast vermelho no canto
 * que não diz qual dos dois errou. A tela trata.
 */
export const changeMyPassword = async (
  body: ChangePasswordRequest,
): Promise<void> => {
  if (pendingIntegration("users-me")) return pendingWrite("PATCH /api/v1/users/me/password", {
    silent: true,
  });
  await axiosInstance.patch(endpoints.USERS.ME_PASSWORD, body, {
    skipErrorToast: true,
    ...feedback("Senha alterada."),
  });
};
