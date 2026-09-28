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

/** Query de GET /api/v1/users. */
export interface UserListRequest {
  /**
   * Inclui desativados. Necessário para resolver o nome de quem já saiu do
   * escritório mas assina registro antigo — sem isso a trilha de um cliente
   * de 2024 mostra UUID no lugar do nome.
   */
  includeInactive?: boolean;
}
