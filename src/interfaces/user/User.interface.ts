/**
 * Usuário do escritório — espelha `UserSummaryDTO`.
 *
 * Existe para resolver autoria: vários recursos gravam só o UUID de quem agiu
 * (`createdBy`, `updatedBy`, `responsibleUserId`, `changedByUserId` do
 * histórico de situação). Sem esta lista, a informação está no banco e não é
 * exibível em lugar nenhum.
 *
 * Não traz e-mail nem credencial — de propósito. O backend também não expõe.
 */
import type { RoleKey } from "@/enums/role/Role";

export interface UserSummary {
  id: string;
  fullName: string;
  username: string;
  /** Nome da constante (`"ADMIN"`), não rótulo PT-BR — ver `enums/role/Role`. */
  role: RoleKey | string;
  active: boolean;
}

/**
 * Os dados da própria pessoa — espelha `MyProfileDTO`.
 *
 * Tem e-mail, que o `UserSummary` não tem: a lista de usuários é diretório de
 * autoria e não precisa expor contato de ninguém; aqui é a própria pessoa
 * olhando o próprio cadastro.
 */
export interface MyProfile {
  id: string;
  fullName: string;
  email: string;
  /** Não se edita: é o login. Mudá-lo trocaria a identidade da sessão. */
  username: string;
  /** Rótulo PT-BR (@JsonValue), não a constante. */
  role: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Corpo de PUT /api/v1/users/me. Só o que a pessoa pode mudar de si mesma. */
export interface MyProfileUpdateRequest {
  fullName: string;
  email: string;
}

/**
 * Corpo de PATCH /api/v1/users/me/password.
 *
 * A senha atual é exigida mesmo com a sessão válida: é o que impede que um
 * navegador deixado aberto vire troca de senha por quem passou pela mesa.
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Query de GET /api/v1/users. */
export interface UserListRequest {
  /**
   * Inclui desativados. Necessário para resolver o nome de quem já saiu do
   * escritório mas assina registro antigo — sem isso a trilha de um cliente
   * de 2024 mostra UUID no lugar do nome.
   */
  includeInactive?: boolean;
}
